/**
 * YaneuraOuEngine - やねうら王WASMエンジンのアダプタ
 * Web Worker経由でやねうら王と通信
 */

import { AIEngine } from './AIEngine.js';

export class YaneuraOuEngine extends AIEngine {
  constructor() {
    super();
    this.worker = null;
    this._messageId = 0;
    this._pendingRequests = new Map();
    this._currentSearchId = null;
    this._initPromise = null;
  }

  /**
   * エンジン名を返す
   * @returns {string}
   */
  getName() {
    return 'やねうら王';
  }

  /**
   * エンジンの種類を返す
   * @returns {string}
   */
  getType() {
    return 'yaneuraou';
  }

  /**
   * エンジンを初期化
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._setInitializing(true);

    this._initPromise = new Promise((resolve, reject) => {
      try {
        // Web Workerの作成
        this.worker = new Worker(
          new URL('./workers/yaneuraou.worker.js', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event) => {
          this._handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('YaneuraOu Worker error:', error);
          this._setError(new Error(`Worker error: ${error.message}`));

          // 保留中のリクエストをすべて拒否
          for (const [id, { reject }] of this._pendingRequests) {
            reject(new Error('Worker error'));
          }
          this._pendingRequests.clear();
        };

        // 初期化コマンドを送信
        const initId = this._sendCommand('init');

        this._pendingRequests.set(initId, {
          resolve: () => {
            this._setReady(true);
            this._setInitializing(false);
            resolve();
          },
          reject: (error) => {
            this._setError(error);
            this._setInitializing(false);
            reject(error);
          }
        });

        // タイムアウト設定
        setTimeout(() => {
          if (this._pendingRequests.has(initId)) {
            this._pendingRequests.get(initId).reject(
              new Error('Engine initialization timeout')
            );
            this._pendingRequests.delete(initId);
          }
        }, 30000);

      } catch (error) {
        this._setError(error);
        this._setInitializing(false);
        reject(error);
      }
    });

    return this._initPromise;
  }

  /**
   * 最善手を取得
   * @param {string} sfen - SFEN形式の局面
   * @param {Object} options - 探索オプション
   * @returns {Promise<Object>} { move: string, score: number, pv: string[] }
   */
  async getBestMove(sfen, options = {}) {
    if (!this.isReady()) {
      throw new Error('Engine is not ready');
    }

    const searchId = this._sendCommand('search', {
      sfen: sfen,
      time: options.time || 1000,
      depth: options.depth
    });

    this._currentSearchId = searchId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this._pendingRequests.has(searchId)) {
          // タイムアウト時はstopを送信して現在のベスト手を取得
          this.stop().then(() => {
            // stopによって結果が返ってくるはず
          }).catch(() => {
            this._pendingRequests.delete(searchId);
            reject(new Error('Search timeout'));
          });
        }
      }, (options.time || 1000) + 5000); // 探索時間 + 5秒の余裕

      this._pendingRequests.set(searchId, {
        resolve: (result) => {
          clearTimeout(timeout);
          this._currentSearchId = null;
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this._currentSearchId = null;
          reject(error);
        }
      });
    });
  }

  /**
   * 探索を中断
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.worker) return;

    return new Promise((resolve) => {
      const stopId = this._sendCommand('stop');

      // stopは即座に完了とみなす
      setTimeout(() => {
        this._pendingRequests.delete(stopId);
        resolve();
      }, 100);
    });
  }

  /**
   * リソースを解放
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.worker) {
      // 探索を停止
      await this.stop();

      // quitコマンドを送信
      this._sendCommand('quit');

      // 少し待ってからworkerを終了
      await new Promise(resolve => setTimeout(resolve, 100));

      this.worker.terminate();
      this.worker = null;
    }

    this._setReady(false);
    this._pendingRequests.clear();
    this._initPromise = null;
  }

  /**
   * 強さ設定をオプションに変換
   * @param {string} strength
   * @returns {Object}
   */
  strengthToOptions(strength) {
    const presets = {
      beginner: { time: 100, depth: 3 },
      intermediate: { time: 1000, depth: 8 },
      advanced: { time: 3000, depth: 12 },
      expert: { time: 10000, depth: 20 }
    };
    return presets[strength] || presets.intermediate;
  }

  /**
   * Workerにコマンドを送信
   * @private
   */
  _sendCommand(type, payload = {}) {
    const id = ++this._messageId;
    this.worker.postMessage({ id, type, ...payload });
    return id;
  }

  /**
   * Workerからのメッセージを処理
   * @private
   */
  _handleMessage(data) {
    const { id, type, error, ...rest } = data;

    // エラー処理
    if (error) {
      const pending = this._pendingRequests.get(id);
      if (pending) {
        pending.reject(new Error(error));
        this._pendingRequests.delete(id);
      }
      return;
    }

    // 探索情報の更新（UIへの通知用）
    if (type === 'info') {
      // 探索中の情報（depth, score, pv等）
      this._onSearchInfo?.(rest);
      return;
    }

    // 初期化完了
    if (type === 'ready') {
      const pending = this._pendingRequests.get(id);
      if (pending) {
        pending.resolve();
        this._pendingRequests.delete(id);
      }
      return;
    }

    // 探索結果
    if (type === 'bestmove') {
      const pending = this._pendingRequests.get(id);
      if (pending) {
        pending.resolve({
          move: rest.move,
          score: rest.score || 0,
          pv: rest.pv || []
        });
        this._pendingRequests.delete(id);
      }
      return;
    }
  }

  /**
   * 探索情報のコールバックを設定
   * @param {Function} callback
   */
  onSearchInfo(callback) {
    this._onSearchInfo = callback;
  }
}
