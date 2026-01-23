/**
 * BuiltinEngine - 内蔵AIエンジンのラッパー
 * 既存のminimax + alpha-beta実装をAIEngineインターフェースでラップ
 */

import { AIEngine } from './AIEngine.js';
import { MoveConverter } from './MoveConverter.js';

export class BuiltinEngine extends AIEngine {
  constructor(game) {
    super();
    this.game = game;
    this._searchAborted = false;
  }

  /**
   * エンジン名を返す
   * @returns {string}
   */
  getName() {
    return '内蔵AI';
  }

  /**
   * エンジンの種類を返す
   * @returns {string}
   */
  getType() {
    return 'builtin';
  }

  /**
   * 初期化（内蔵AIは即時ready）
   * @returns {Promise<void>}
   */
  async initialize() {
    this._setInitializing(true);
    try {
      // 内蔵AIは特別な初期化不要
      this._setReady(true);
    } catch (error) {
      this._setError(error);
      throw error;
    } finally {
      this._setInitializing(false);
    }
  }

  /**
   * 最善手を取得
   * @param {string} sfen - SFEN形式の局面（内蔵AIでは使用しない）
   * @param {Object} options - 探索オプション
   * @returns {Promise<Object>} { move: string, score: number }
   */
  async getBestMove(sfen, options = {}) {
    if (!this.isReady()) {
      throw new Error('Engine is not ready');
    }

    this._searchAborted = false;

    // 強さに応じて難易度を変換
    const difficulty = options.difficulty || this._optionsToDifficulty(options);

    try {
      const result = await this._searchBestMove(difficulty);
      return result;
    } catch (error) {
      if (this._searchAborted) {
        return { move: null, score: 0, aborted: true };
      }
      throw error;
    }
  }

  /**
   * 探索を中断
   * @returns {Promise<void>}
   */
  async stop() {
    this._searchAborted = true;
  }

  /**
   * リソースを解放
   * @returns {Promise<void>}
   */
  async dispose() {
    this._searchAborted = true;
    this._setReady(false);
  }

  /**
   * 強さ設定をオプションに変換（内蔵AI用）
   * @param {string} strength
   * @returns {Object}
   */
  strengthToOptions(strength) {
    const presets = {
      beginner: { difficulty: 'easy', depth: 1 },
      intermediate: { difficulty: 'medium', depth: 2 },
      advanced: { difficulty: 'hard', depth: 4 },
      expert: { difficulty: 'hard', depth: 5 }
    };
    return presets[strength] || presets.intermediate;
  }

  /**
   * オプションから難易度文字列に変換
   * @private
   */
  _optionsToDifficulty(options) {
    if (options.difficulty) return options.difficulty;

    const depth = options.depth || 4;
    if (depth <= 1) return 'easy';
    if (depth <= 3) return 'medium';
    return 'hard';
  }

  /**
   * 最善手を探索（game.jsの既存ロジックを利用）
   * @private
   */
  async _searchBestMove(difficulty) {
    const legalMoves = this.game.getAllLegalMoves('cpu');

    if (legalMoves.length === 0) {
      return { move: null, score: -Infinity };
    }

    let selectedMove;
    let score = 0;

    switch (difficulty) {
      case 'easy':
        // ランダム選択
        selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        break;

      case 'medium':
        // 70%で駒取り優先、30%でランダム
        const captureMoves = legalMoves.filter(m =>
          m.type === 'move' && this.game.board[m.toRow][m.toCol] !== null
        );
        if (captureMoves.length > 0 && Math.random() < 0.7) {
          selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else {
          selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
        break;

      case 'hard':
      default:
        // Minimax with Alpha-Beta
        const result = this._minimaxSearch(legalMoves);
        selectedMove = result.move;
        score = result.score;
        break;
    }

    if (!selectedMove) {
      selectedMove = legalMoves[0];
    }

    // 内部形式からUSI形式に変換
    const usiMove = MoveConverter.toUsi(selectedMove);

    return {
      move: usiMove,
      score: score,
      internalMove: selectedMove // ゲームで直接使用可能な形式
    };
  }

  /**
   * Minimax探索（game.jsの既存実装を呼び出す）
   * @private
   */
  _minimaxSearch(legalMoves) {
    let bestMove = null;
    let bestScore = -Infinity;

    // 移動のソート（MVV-LVA）
    const orderedMoves = this.game.orderMoves(legalMoves, 'cpu');

    for (const move of orderedMoves) {
      if (this._searchAborted) {
        break;
      }

      // 仮想的に手を適用
      const undoInfo = this.game.applyVirtualMove(move, 'cpu');

      // Minimax評価
      const score = this.game.minimax(3, -Infinity, Infinity, false);

      // 手を戻す
      this.game.undoVirtualMove(undoInfo);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { move: bestMove, score: bestScore };
  }

  /**
   * ゲームインスタンスを更新
   * @param {Object} game - 新しいゲームインスタンス
   */
  updateGame(game) {
    this.game = game;
  }
}
