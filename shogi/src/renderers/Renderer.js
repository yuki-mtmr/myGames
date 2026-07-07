/**
 * Renderer抽象クラス - 2D/3D描画の共通インターフェース
 */
export class Renderer {
    constructor() {
        if (new.target === Renderer) {
            throw new Error('Rendererは抽象クラスです。直接インスタンス化できません。');
        }

        // イベントコールバック
        this.onCellClickCallback = null;
        this.onCapturedPieceClickCallback = null;
        this.onPromotionChoiceCallback = null;
    }

    /**
     * 盤面を描画
     * @param {Array<Array>} board - 9x9の盤面配列
     * @param {Object|null} lastMove - 最後の手 { from: {row, col}, to: {row, col} }
     */
    renderBoard(board, lastMove) {
        throw new Error('renderBoard()を実装してください');
    }

    /**
     * 有効な移動先をハイライト
     * @param {number} row - 選択した駒の行
     * @param {number} col - 選択した駒の列
     * @param {Array<{row: number, col: number}>} validMoves - 有効な移動先
     */
    highlightValidMoves(row, col, validMoves) {
        throw new Error('highlightValidMoves()を実装してください');
    }

    /**
     * ハイライトをクリア
     */
    clearHighlights() {
        throw new Error('clearHighlights()を実装してください');
    }

    /**
     * 持ち駒を描画
     * @param {Array<string>} playerCaptured - プレイヤーの持ち駒
     * @param {Array<string>} cpuCaptured - CPUの持ち駒
     * @param {string|null} selectedCapturedPiece - 選択中の持ち駒
     */
    renderCapturedPieces(playerCaptured, cpuCaptured, selectedCapturedPiece) {
        throw new Error('renderCapturedPieces()を実装してください');
    }

    /**
     * 成り選択モーダルを表示
     * @param {Function} callback - 選択結果を受け取るコールバック (boolean)
     */
    showPromotionModal(callback) {
        throw new Error('showPromotionModal()を実装してください');
    }

    /**
     * 手番表示を更新
     * @param {string} currentPlayer - 'player' | 'cpu'
     */
    updateTurnIndicator(currentPlayer) {
        throw new Error('updateTurnIndicator()を実装してください');
    }

    /**
     * 指し手履歴を更新
     * @param {Array<{player: string, text: string, number: number}>} moveHistory
     */
    updateMoveHistory(moveHistory) {
        throw new Error('updateMoveHistory()を実装してください');
    }

    /**
     * ゲーム結果を表示
     * @param {string} resultText - 結果テキスト
     */
    showGameResult(resultText) {
        throw new Error('showGameResult()を実装してください');
    }

    /**
     * 形勢表示を更新
     * @param {number} score - 評価値
     * @param {number} playerPercent - 先手の勝率パーセント
     */
    updateEvaluation(score, playerPercent) {
        throw new Error('updateEvaluation()を実装してください');
    }

    // ========== イベントハンドラ設定 ==========

    /**
     * セルクリック時のコールバックを設定
     * @param {Function} callback - (row, col) => void
     */
    onCellClick(callback) {
        this.onCellClickCallback = callback;
    }

    /**
     * 持ち駒クリック時のコールバックを設定
     * @param {Function} callback - (pieceType) => void
     */
    onCapturedPieceClick(callback) {
        this.onCapturedPieceClickCallback = callback;
    }

    // ========== ライフサイクル ==========

    /**
     * リソースを解放
     */
    dispose() {
        this.onCellClickCallback = null;
        this.onCapturedPieceClickCallback = null;
        this.onPromotionChoiceCallback = null;
    }
}
