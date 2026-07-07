import { Renderer } from './Renderer.js';

/**
 * DOMRenderer - 既存の2D DOM/CSSベースのレンダラー
 */
export class DOMRenderer extends Renderer {
    constructor() {
        super();

        // DOM要素のキャッシュ
        this.boardElement = document.getElementById('shogi-board');
        this.playerCapturedEl = document.getElementById('player-captured');
        this.cpuCapturedEl = document.getElementById('cpu-captured');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.moveList = document.getElementById('move-list');
        this.evalBarFill = document.getElementById('eval-bar-fill');
        this.evalPercentage = document.getElementById('eval-percentage');
        this.evalScore = document.getElementById('eval-score');

        // 座標表示を初期化
        this.renderBoardCoordinates();

        // 成りモーダルをセットアップ
        this.setupPromotionModalDOM();
    }

    /**
     * 盤面の座標を描画
     */
    renderBoardCoordinates() {
        const rowCoords = document.getElementById('board-coords-row');
        const colCoords = document.getElementById('board-coords-col');

        if (rowCoords && rowCoords.children.length === 0) {
            // 横座標: 9-1 (右から左)
            for (let i = 9; i >= 1; i--) {
                const span = document.createElement('span');
                span.textContent = i;
                rowCoords.appendChild(span);
            }
        }

        if (colCoords && colCoords.children.length === 0) {
            // 縦座標: 一〜九 (上から下)
            const kanjiNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
            for (let i = 0; i < 9; i++) {
                const span = document.createElement('span');
                span.textContent = kanjiNumbers[i];
                colCoords.appendChild(span);
            }
        }
    }

    /**
     * 駒の表示文字を取得（シングルキャラクター）
     */
    getPieceDisplay(piece) {
        if (!piece) return '';

        // 成駒の場合
        if (piece.promoted) {
            const promotedMapping = {
                '!と': 'と',
                '!杏': '杏',
                '!圭': '圭',
                '!全': '全',
                '!馬': '馬',
                '!竜': '龍'
            };
            return promotedMapping[piece.type] || piece.type.substring(1);
        }

        // 通常駒はそのまま
        return piece.type;
    }

    /**
     * 盤面を描画
     */
    renderBoard(board, lastMove) {
        this.boardElement.innerHTML = '';

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                // 最後の手をハイライト
                if (lastMove) {
                    if (lastMove.from && lastMove.from.row === row && lastMove.from.col === col) {
                        cell.classList.add('last-move-from');
                    }
                    if (lastMove.to && lastMove.to.row === row && lastMove.to.col === col) {
                        cell.classList.add('last-move-to');
                    }
                }

                const piece = board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.owner}`;
                    if (piece.promoted) {
                        pieceElement.classList.add('promoted');
                    }
                    pieceElement.textContent = this.getPieceDisplay(piece);
                    cell.appendChild(pieceElement);
                }

                cell.addEventListener('click', () => {
                    if (this.onCellClickCallback) {
                        this.onCellClickCallback(row, col);
                    }
                });
                this.boardElement.appendChild(cell);
            }
        }
    }

    /**
     * 有効な移動先をハイライト
     */
    highlightValidMoves(row, col, validMoves) {
        this.clearHighlights();

        const selectedCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (selectedCell) {
            selectedCell.classList.add('selected');
        }

        validMoves.forEach(move => {
            const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (cell) cell.classList.add('valid-move');
        });
    }

    /**
     * ハイライトをクリア
     */
    clearHighlights() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected', 'valid-move');
        });
    }

    /**
     * 持ち駒をグループ化
     */
    groupCapturedPieces(capturedList) {
        const pieceOrder = ['飛', '角', '金', '銀', '桂', '香', '歩'];
        const grouped = {};

        for (const piece of capturedList) {
            grouped[piece] = (grouped[piece] || 0) + 1;
        }

        // 駒の重要度順にソート
        const sortedEntries = Object.entries(grouped).sort((a, b) => {
            const indexA = pieceOrder.indexOf(a[0]);
            const indexB = pieceOrder.indexOf(b[0]);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return sortedEntries;
    }

    /**
     * グループ化された持ち駒をHTML描画
     */
    renderGroupedCapturedPiecesHTML(groupedPieces, isPlayer, selectedCapturedPiece) {
        return groupedPieces.map(([piece, count]) => {
            const isSelected = isPlayer && selectedCapturedPiece === piece;
            return `<div class="komadai-piece ${isSelected ? 'selected' : ''}" data-piece="${piece}">
                <span class="piece-char">${piece}</span>
                ${count > 1 ? `<span class="piece-count">×${count}</span>` : ''}
            </div>`;
        }).join('');
    }

    /**
     * 持ち駒を描画
     */
    renderCapturedPieces(playerCaptured, cpuCaptured, selectedCapturedPiece) {
        // プレイヤーの持ち駒
        const playerGrouped = this.groupCapturedPieces(playerCaptured);
        this.playerCapturedEl.innerHTML = this.renderGroupedCapturedPiecesHTML(playerGrouped, true, selectedCapturedPiece);

        // 持ち駒にクリックイベントを追加
        this.playerCapturedEl.querySelectorAll('.komadai-piece').forEach(el => {
            el.addEventListener('click', () => {
                if (this.onCapturedPieceClickCallback) {
                    this.onCapturedPieceClickCallback(el.dataset.piece);
                }
            });
        });

        // CPUの持ち駒
        const cpuGrouped = this.groupCapturedPieces(cpuCaptured);
        this.cpuCapturedEl.innerHTML = this.renderGroupedCapturedPiecesHTML(cpuGrouped, false, null);
    }

    /**
     * 成りモーダルDOM要素をセットアップ
     */
    setupPromotionModalDOM() {
        // 既存のモーダルがあれば使用
        let modal = document.getElementById('promotion-modal');
        if (modal) return;

        // モーダルを作成
        modal = document.createElement('div');
        modal.id = 'promotion-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>成りますか？</h2>
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                    <button id="promote-yes" class="difficulty-btn">成る</button>
                    <button id="promote-no" class="difficulty-btn" style="background: linear-gradient(135deg, #999 0%, #666 100%);">成らない</button>
                </div>
            </div>
        `;
        document.getElementById('app').appendChild(modal);
    }

    /**
     * 成り選択モーダルを表示
     */
    showPromotionModal(callback) {
        const modal = document.getElementById('promotion-modal');
        modal.classList.remove('hidden');

        const yesBtn = document.getElementById('promote-yes');
        const noBtn = document.getElementById('promote-no');

        const handleYes = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            callback(true);
        };

        const handleNo = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            callback(false);
        };

        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    }

    /**
     * 手番表示を更新
     */
    updateTurnIndicator(currentPlayer) {
        if (this.turnIndicator) {
            this.turnIndicator.textContent =
                currentPlayer === 'player' ? 'あなたの手番です' : 'CPUが考えています...';
        }
    }

    /**
     * 指し手履歴を更新
     */
    updateMoveHistory(moveHistory) {
        if (!this.moveList) return;

        this.moveList.innerHTML = moveHistory.map(move =>
            `<div class="move-item ${move.player === 'cpu' ? 'cpu-move' : ''}">
            ${move.number}. ${move.text}
            </div>`
        ).join('');

        // 最新の手までスクロール
        this.moveList.scrollTop = this.moveList.scrollHeight;
    }

    /**
     * ゲーム結果を表示
     */
    showGameResult(resultText) {
        const gameResult = document.getElementById('game-result');
        const gameOver = document.getElementById('game-over');

        if (gameResult) gameResult.textContent = resultText;
        if (gameOver) gameOver.classList.remove('hidden');
    }

    /**
     * 形勢表示を更新
     */
    updateEvaluation(score, playerPercent) {
        if (!this.evalBarFill || !this.evalPercentage || !this.evalScore) return;

        // バーの幅を更新（先手有利で左に伸びる）
        this.evalBarFill.style.width = `${playerPercent}%`;

        // パーセンテージ表示
        this.evalPercentage.textContent = `${Math.round(playerPercent)}% - ${Math.round(100 - playerPercent)}%`;

        // 評価値表示
        this.evalScore.textContent = score > 0 ? `+${score}` : score.toString();

        // クラスを更新
        this.evalScore.classList.remove('player-advantage', 'cpu-advantage', 'even-advantage');
        if (score > 100) {
            this.evalScore.classList.add('player-advantage');
        } else if (score < -100) {
            this.evalScore.classList.add('cpu-advantage');
        } else {
            this.evalScore.classList.add('even-advantage');
        }
    }

    /**
     * リソースを解放
     */
    dispose() {
        super.dispose();
        // DOMRenderer特有のクリーンアップがあればここに
    }
}
