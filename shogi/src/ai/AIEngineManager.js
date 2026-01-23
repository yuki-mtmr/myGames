/**
 * AIEngineManager - AIエンジンのファクトリ＆ライフサイクル管理
 * エンジンの選択、初期化、フォールバック処理を担当
 */

import { browserCapabilities } from './BrowserCapabilities.js';
import { BuiltinEngine } from './BuiltinEngine.js';
import { YaneuraOuEngine } from './YaneuraOuEngine.js';

// エンジンタイプ定数
export const ENGINE_TYPES = {
  AUTO: 'auto',
  YANEURAOU: 'yaneuraou',
  BUILTIN: 'builtin'
};

// 強さ定数
export const STRENGTH_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
};

export class AIEngineManager {
  constructor() {
    this.currentEngine = null;
    this.builtinEngine = null;
    this.yaneuraouEngine = null;
    this.preferredEngine = ENGINE_TYPES.AUTO;
    this.strength = STRENGTH_LEVELS.INTERMEDIATE;
    this._game = null;
    this._initPromise = null;
    this._listeners = new Map();
  }

  /**
   * ゲームインスタンスを設定
   * @param {Object} game - ShogiGameインスタンス
   */
  setGame(game) {
    this._game = game;

    // 内蔵エンジンのゲーム参照を更新
    if (this.builtinEngine) {
      this.builtinEngine.updateGame(game);
    }
  }

  /**
   * 優先エンジンを設定
   * @param {string} type - ENGINE_TYPESのいずれか
   */
  setPreferredEngine(type) {
    this.preferredEngine = type;
  }

  /**
   * 強さを設定
   * @param {string} level - STRENGTH_LEVELSのいずれか
   */
  setStrength(level) {
    this.strength = level;
  }

  /**
   * エンジンマネージャーを初期化
   * @returns {Promise<Object>} 初期化結果
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._doInitialize();
    return this._initPromise;
  }

  /**
   * 初期化の実装
   * @private
   */
  async _doInitialize() {
    const result = {
      success: false,
      engine: null,
      fallback: false,
      fallbackReason: null,
      capabilities: null
    };

    try {
      // ブラウザ機能チェック
      const caps = browserCapabilities.check();
      result.capabilities = caps;

      // 内蔵エンジンは常に初期化
      if (!this.builtinEngine && this._game) {
        this.builtinEngine = new BuiltinEngine(this._game);
        await this.builtinEngine.initialize();
      }

      // エンジン選択
      let targetEngine = this.preferredEngine;

      if (targetEngine === ENGINE_TYPES.AUTO) {
        // 自動選択: やねうら王が使えるならやねうら王
        targetEngine = caps.canUseYaneuraOu ?
          ENGINE_TYPES.YANEURAOU : ENGINE_TYPES.BUILTIN;
      }

      // やねうら王の初期化
      if (targetEngine === ENGINE_TYPES.YANEURAOU) {
        if (!caps.canUseYaneuraOu) {
          result.fallback = true;
          result.fallbackReason = caps.fallbackReason;
          this.currentEngine = this.builtinEngine;
        } else {
          try {
            if (!this.yaneuraouEngine) {
              this.yaneuraouEngine = new YaneuraOuEngine();
            }
            await this.yaneuraouEngine.initialize();
            this.currentEngine = this.yaneuraouEngine;
          } catch (error) {
            console.warn('YaneuraOu initialization failed, falling back to builtin:', error);
            result.fallback = true;
            result.fallbackReason = `やねうら王の初期化に失敗しました: ${error.message}`;
            this.currentEngine = this.builtinEngine;
          }
        }
      } else {
        // 内蔵エンジンを使用
        this.currentEngine = this.builtinEngine;
      }

      result.success = this.currentEngine?.isReady() || false;
      result.engine = this.currentEngine?.getType() || null;

      this._emit('initialized', result);

      return result;

    } catch (error) {
      result.success = false;
      result.fallbackReason = error.message;

      // 最終フォールバック: 内蔵エンジン
      if (this.builtinEngine?.isReady()) {
        this.currentEngine = this.builtinEngine;
        result.success = true;
        result.engine = 'builtin';
        result.fallback = true;
      }

      this._emit('error', error);

      return result;
    }
  }

  /**
   * 最善手を取得
   * @param {string} sfen - SFEN形式の局面
   * @param {Object} overrideOptions - オプションのオーバーライド
   * @returns {Promise<Object>}
   */
  async getBestMove(sfen, overrideOptions = {}) {
    const engine = this.currentEngine;

    if (!engine || !engine.isReady()) {
      throw new Error('No engine is ready');
    }

    // 強さ設定からオプションを取得
    const baseOptions = engine.strengthToOptions(this.strength);
    const options = { ...baseOptions, ...overrideOptions };

    try {
      const result = await engine.getBestMove(sfen, options);
      this._emit('bestmove', { engine: engine.getType(), result });
      return result;
    } catch (error) {
      // フォールバック処理
      if (engine.getType() !== 'builtin' && this.builtinEngine?.isReady()) {
        console.warn('External engine failed, falling back to builtin:', error);
        this.currentEngine = this.builtinEngine;
        this._emit('fallback', { reason: error.message });
        return this.getBestMove(sfen, overrideOptions);
      }
      throw error;
    }
  }

  /**
   * 探索を中断
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.currentEngine) {
      await this.currentEngine.stop();
    }
  }

  /**
   * エンジンを切り替え
   * @param {string} type - ENGINE_TYPESのいずれか
   * @returns {Promise<Object>} 切り替え結果
   */
  async switchEngine(type) {
    // 現在のエンジンを停止
    if (this.currentEngine) {
      await this.currentEngine.stop();
    }

    this.preferredEngine = type;
    this._initPromise = null;

    return this.initialize();
  }

  /**
   * 全リソースを解放
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.yaneuraouEngine) {
      await this.yaneuraouEngine.dispose();
      this.yaneuraouEngine = null;
    }

    if (this.builtinEngine) {
      await this.builtinEngine.dispose();
      this.builtinEngine = null;
    }

    this.currentEngine = null;
    this._initPromise = null;
    this._listeners.clear();
  }

  /**
   * 現在のエンジン情報を取得
   * @returns {Object}
   */
  getEngineInfo() {
    const engine = this.currentEngine;
    const caps = browserCapabilities.check();

    return {
      current: engine ? {
        type: engine.getType(),
        name: engine.getName(),
        ready: engine.isReady()
      } : null,
      available: {
        yaneuraou: caps.canUseYaneuraOu,
        builtin: true
      },
      strength: this.strength,
      preferred: this.preferredEngine,
      fallbackReason: caps.fallbackReason
    };
  }

  /**
   * 利用可能なエンジンリストを取得
   * @returns {Array}
   */
  getAvailableEngines() {
    const caps = browserCapabilities.check();
    const engines = [
      {
        type: ENGINE_TYPES.AUTO,
        name: '自動選択',
        description: '環境に応じて最適なエンジンを選択',
        available: true
      },
      {
        type: ENGINE_TYPES.BUILTIN,
        name: '内蔵AI',
        description: 'Minimax + Alpha-Beta（全ブラウザ対応）',
        available: true
      }
    ];

    engines.push({
      type: ENGINE_TYPES.YANEURAOU,
      name: 'やねうら王',
      description: caps.canUseYaneuraOu ?
        '世界最強クラスのAI（WASM/NNUE）' :
        `使用不可: ${caps.fallbackReason}`,
      available: caps.canUseYaneuraOu
    });

    return engines;
  }

  /**
   * イベントリスナーを登録
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * イベントリスナーを解除
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * イベントを発行
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event listener error for '${event}':`, error);
        }
      }
    }
  }
}

// シングルトンインスタンス
export const aiEngineManager = new AIEngineManager();
