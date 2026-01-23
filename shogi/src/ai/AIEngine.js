/**
 * AIEngine - 抽象基底クラス
 * すべてのAIエンジンが実装すべきインターフェースを定義
 */

export class AIEngine {
  constructor() {
    if (new.target === AIEngine) {
      throw new Error('AIEngine is an abstract class and cannot be instantiated directly');
    }

    this._ready = false;
    this._initializing = false;
    this._error = null;
  }

  /**
   * エンジンを初期化
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * 最善手を取得
   * @param {string} sfen - SFEN形式の局面
   * @param {Object} options - 探索オプション
   * @param {number} options.time - 探索時間（ミリ秒）
   * @param {number} options.depth - 探索深度
   * @returns {Promise<Object>} { move: string, score: number, pv: string[] }
   */
  async getBestMove(sfen, options = {}) {
    throw new Error('getBestMove() must be implemented by subclass');
  }

  /**
   * 探索を中断
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop() must be implemented by subclass');
  }

  /**
   * リソースを解放
   * @returns {Promise<void>}
   */
  async dispose() {
    throw new Error('dispose() must be implemented by subclass');
  }

  /**
   * 準備完了状態を返す
   * @returns {boolean}
   */
  isReady() {
    return this._ready;
  }

  /**
   * 初期化中かどうか
   * @returns {boolean}
   */
  isInitializing() {
    return this._initializing;
  }

  /**
   * エラー状態を返す
   * @returns {Error|null}
   */
  getError() {
    return this._error;
  }

  /**
   * エンジン名を返す
   * @returns {string}
   */
  getName() {
    return 'AIEngine';
  }

  /**
   * エンジンの種類を返す
   * @returns {string} 'builtin' | 'yaneuraou' | 'stockfish'
   */
  getType() {
    return 'unknown';
  }

  /**
   * 強さ設定をエンジン固有のオプションに変換
   * @param {string} strength - 'beginner' | 'intermediate' | 'advanced' | 'expert'
   * @returns {Object} エンジン固有のオプション
   */
  strengthToOptions(strength) {
    // デフォルト実装（サブクラスでオーバーライド）
    const presets = {
      beginner: { time: 100, depth: 1 },
      intermediate: { time: 1000, depth: 4 },
      advanced: { time: 3000, depth: 6 },
      expert: { time: 10000, depth: 10 }
    };
    return presets[strength] || presets.intermediate;
  }

  /**
   * 準備完了状態を設定（サブクラス用）
   * @protected
   */
  _setReady(ready) {
    this._ready = ready;
  }

  /**
   * 初期化中状態を設定（サブクラス用）
   * @protected
   */
  _setInitializing(initializing) {
    this._initializing = initializing;
  }

  /**
   * エラー状態を設定（サブクラス用）
   * @protected
   */
  _setError(error) {
    this._error = error;
    if (error) {
      this._ready = false;
    }
  }
}
