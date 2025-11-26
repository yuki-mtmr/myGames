// 駒の種類と移動パターン
const PIECES = {
    '歩': { moves: [[0, -1]], promoted: '!と', canPromote: true },
    '香': { moves: [[0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8]], promoted: '!杏', canPromote: true },
    '桂': { moves: [[-1, -2], [1, -2]], promoted: '!圭', canPromote: true },
    '銀': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1]], promoted: '!全', canPromote: true },
    '金': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]], promoted: null, canPromote: false },
    '角': {
        moves: [[-1, -1], [-2, -2], [-3, -3], [-4, -4], [-5, -5], [-6, -6], [-7, -7], [-8, -8],
        [1, -1], [2, -2], [3, -3], [4, -4], [5, -5], [6, -6], [7, -7], [8, -8],
        [-1, 1], [-2, 2], [-3, 3], [-4, 4], [-5, 5], [-6, 6], [-7, 7], [-8, 8],
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8]], promoted: '!馬', canPromote: true
    },
    '飛': {
        moves: [[0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8],
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
        [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-6, 0], [-7, 0], [-8, 0],
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]], promoted: '!竜', canPromote: true
    },
    '王': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], promoted: null, canPromote: false },
    '玉': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], promoted: null, canPromote: false },
    // 成駒
    '!と': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]], promoted: null, canPromote: false },
    '!杏': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]], promoted: null, canPromote: false },
    '!圭': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]], promoted: null, canPromote: false },
    '!全': { moves: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]], promoted: null, canPromote: false },
    '!馬': {
        moves: [[-1, -1], [-2, -2], [-3, -3], [-4, -4], [-5, -5], [-6, -6], [-7, -7], [-8, -8],
        [1, -1], [2, -2], [3, -3], [4, -4], [5, -5], [6, -6], [7, -7], [8, -8],
        [-1, 1], [-2, 2], [-3, 3], [-4, 4], [-5, 5], [-6, 6], [-7, 7], [-8, 8],
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8],
        [0, -1], [0, 1], [-1, 0], [1, 0]], promoted: null, canPromote: false
    },
    '!竜': {
        moves: [[0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8],
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
        [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-6, 0], [-7, 0], [-8, 0],
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0],
        [-1, -1], [1, -1], [-1, 1], [1, 1]], promoted: null, canPromote: false
    }
};

export class ShogiGame {
    constructor(difficulty) {
        this.difficulty = difficulty;
        this.board = this.initializeBoard();
        this.currentPlayer = 'player'; // 'player' or 'cpu'
        this.selectedPiece = null;
        this.selectedCell = null;
        this.selectedCapturedPiece = null; // 選択した持ち駒
        this.playerCaptured = [];
        this.cpuCaptured = [];
        this.moveHistory = []; // 指し手履歴
        this.gameOver = false;

        this.renderBoard();
        this.updateUI();
    }

    initializeBoard() {
        // 9x9の盤面を初期化
        const board = Array(9).fill(null).map(() => Array(9).fill(null));

        // 後手（CPU）の駒配置
        board[0][0] = { type: '香', owner: 'cpu' };
        board[0][1] = { type: '桂', owner: 'cpu' };
        board[0][2] = { type: '銀', owner: 'cpu' };
        board[0][3] = { type: '金', owner: 'cpu' };
        board[0][4] = { type: '玉', owner: 'cpu' };
        board[0][5] = { type: '金', owner: 'cpu' };
        board[0][6] = { type: '銀', owner: 'cpu' };
        board[0][7] = { type: '桂', owner: 'cpu' };
        board[0][8] = { type: '香', owner: 'cpu' };
        board[1][1] = { type: '飛', owner: 'cpu' };
        board[1][7] = { type: '角', owner: 'cpu' };
        for (let i = 0; i < 9; i++) {
            board[2][i] = { type: '歩', owner: 'cpu' };
        }

        // 先手（プレイヤー）の駒配置
        for (let i = 0; i < 9; i++) {
            board[6][i] = { type: '歩', owner: 'player' };
        }
        board[7][7] = { type: '飛', owner: 'player' };
        board[7][1] = { type: '角', owner: 'player' };
        board[8][0] = { type: '香', owner: 'player' };
        board[8][1] = { type: '桂', owner: 'player' };
        board[8][2] = { type: '銀', owner: 'player' };
        board[8][3] = { type: '金', owner: 'player' };
        board[8][4] = { type: '王', owner: 'player' };
        board[8][5] = { type: '金', owner: 'player' };
        board[8][6] = { type: '銀', owner: 'player' };
        board[8][7] = { type: '桂', owner: 'player' };
        board[8][8] = { type: '香', owner: 'player' };

        return board;
    }

    renderBoard() {
        const boardElement = document.getElementById('shogi-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.owner}`;
                    if (piece.promoted) {
                        pieceElement.classList.add('promoted');
                    }
                    pieceElement.textContent = piece.promoted ? piece.type.substring(1) : piece.type;
                    cell.appendChild(pieceElement);
                }

                cell.addEventListener('click', () => this.handleCellClick(row, col));
                boardElement.appendChild(cell);
            }
        }
    }

    handleCellClick(row, col) {
        if (this.gameOver || this.currentPlayer !== 'player') return;

        const piece = this.board[row][col];

        // 持ち駒を選択している場合
        if (this.selectedCapturedPiece) {
            // 空いているマスにのみ配置可能
            if (!piece) {
                this.placeCapturedPiece(row, col);
                this.selectedCapturedPiece = null;
                this.clearHighlights();

                if (!this.gameOver) {
                    setTimeout(() => this.cpuTurn(), 500);
                }
            }
            return;
        }

        // 駒を選択
        if (piece && piece.owner === 'player' && !this.selectedPiece) {
            this.selectedPiece = piece;
            this.selectedCell = { row, col };
            this.highlightValidMoves(row, col);
            return;
        }

        // 移動先を選択
        if (this.selectedPiece) {
            const validMoves = this.getValidMoves(this.selectedCell.row, this.selectedCell.col);
            const isValidMove = validMoves.some(move => move.row === row && move.col === col);

            if (isValidMove) {
                this.makeMove(this.selectedCell.row, this.selectedCell.col, row, col);
                this.selectedPiece = null;
                this.selectedCell = null;
                this.clearHighlights();

                if (!this.gameOver) {
                    setTimeout(() => this.cpuTurn(), 500);
                }
            } else {
                this.selectedPiece = null;
                this.selectedCell = null;
                this.clearHighlights();
                this.renderBoard();
            }
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const pieceType = piece.promoted ? piece.type : piece.type;
        const pattern = PIECES[pieceType];

        if (!pattern) return [];

        for (const [dx, dy] of pattern.moves) {
            const newCol = col + (piece.owner === 'player' ? dx : -dx);
            const newRow = row + (piece.owner === 'player' ? dy : -dy);

            if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 9) {
                const targetPiece = this.board[newRow][newCol];

                // 飛車、角、香車の場合は途中に駒があったら止まる
                if (['飛', '角', '香', '!馬', '!竜'].includes(pieceType)) {
                    const steps = Math.max(Math.abs(dx), Math.abs(dy));
                    let blocked = false;

                    for (let step = 1; step < steps; step++) {
                        const checkCol = col + (piece.owner === 'player' ? dx : -dx) * step / steps;
                        const checkRow = row + (piece.owner === 'player' ? dy : -dy) * step / steps;
                        if (this.board[checkRow][checkCol]) {
                            blocked = true;
                            break;
                        }
                    }

                    if (blocked) continue;
                }

                if (!targetPiece || targetPiece.owner !== piece.owner) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    highlightValidMoves(row, col) {
        this.clearHighlights();
        const validMoves = this.getValidMoves(row, col);

        document.querySelector(`[data-row="${row}"][data-col="${col}"]`).classList.add('selected');

        validMoves.forEach(move => {
            const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (cell) cell.classList.add('valid-move');
        });
    }

    clearHighlights() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected', 'valid-move');
        });
    }

    placeCapturedPiece(row, col) {
        const pieceType = this.selectedCapturedPiece;

        // 二歩チェック（同じ筋に歩が既にあるか）
        if (pieceType === '歩') {
            for (let r = 0; r < 9; r++) {
                const piece = this.board[r][col];
                if (piece && piece.owner === 'player' && piece.type === '歩' && !piece.promoted) {
                    alert('二歩は禁止です！');
                    return;
                }
            }
        }

        // 行き所のない駒チェック
        if (pieceType === '歩' && row === 0) {
            alert('歩は1段目に打てません！');
            return;
        }
        if (pieceType === '香' && row === 0) {
            alert('香は1段目に打てません！');
            return;
        }
        if (pieceType === '桂' && (row === 0 || row === 1)) {
            alert('桂は1・2段目に打てません！');
            return;
        }

        // 打ち歩詰めチェック（簡易版：歩を打って相手の王/玉の前に置く場合）
        if (pieceType === '歩') {
            // 歩を打った位置の1つ前に相手の王/玉がいるかチェック
            if (row > 0) {
                const frontPiece = this.board[row - 1][col];
                if (frontPiece && frontPiece.owner === 'cpu' && (frontPiece.type === '玉' || frontPiece.type === '王')) {
                    // 簡易的なチェック：相手の王が逃げられるかどうか
                    alert('打ち歩詰めは禁止です！');
                    return;
                }
            }
        }
        // 持ち駒から削除
        const index = this.playerCaptured.indexOf(pieceType);
        if (index > -1) {
            this.playerCaptured.splice(index, 1);
        }

        // 盤面に配置
        this.board[row][col] = {
            type: pieceType,
            owner: 'player',
            promoted: false
        };

        // 指し手を記録
        this.recordMove(`${pieceType}打`, row, col, 'player');

        this.currentPlayer = 'cpu';
        this.renderBoard();
        this.updateUI();
    }

    recordMove(moveText, toRow, toCol, player) {
        const colNames = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
        const rowNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        const position = `${colNames[toCol]}${rowNames[toRow]}`;

        this.moveHistory.push({
            player: player,
            text: `${position}${moveText}`,
            number: this.moveHistory.length + 1
        });

        this.updateMoveHistory();
    }

    updateMoveHistory() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = this.moveHistory.map(move =>
            `<div class="move-item ${move.player === 'cpu' ? 'cpu-move' : ''}">
                ${move.number}. ${move.text}
            </div>`
        ).join('');

        // 最新の手までスクロール
        moveList.scrollTop = moveList.scrollHeight;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // 移動する駒の名前
        let movePieceName = piece.promoted ? piece.type.substring(1) : piece.type;

        // 駒を取る
        if (capturedPiece) {
            const basePiece = capturedPiece.type.startsWith('!') ?
                capturedPiece.type.substring(1) : capturedPiece.type;

            if (piece.owner === 'player') {
                this.playerCaptured.push(basePiece === 'と' ? '歩' :
                    basePiece === '杏' ? '香' :
                        basePiece === '圭' ? '桂' :
                            basePiece === '全' ? '銀' :
                                basePiece === '馬' ? '角' :
                                    basePiece === '竜' ? '飛' : basePiece);
            } else {
                this.cpuCaptured.push(basePiece === 'と' ? '歩' :
                    basePiece === '杏' ? '香' :
                        basePiece === '圭' ? '桂' :
                            basePiece === '全' ? '銀' :
                                basePiece === '馬' ? '角' :
                                    basePiece === '竜' ? '飛' : basePiece);
            }

            // 玉を取ったらゲーム終了
            if (capturedPiece.type === '王' || capturedPiece.type === '玉') {
                this.endGame(piece.owner);
            }
        }

        // 駒を移動
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // 成りの判定（簡略化：敵陣に入ったら自動的に成る）
        let promoted = false;
        if (piece.owner === 'player' && toRow <= 2 && !piece.promoted && PIECES[piece.type].canPromote) {
            piece.promoted = true;
            piece.type = PIECES[piece.type].promoted;
            promoted = true;
        } else if (piece.owner === 'cpu' && toRow >= 6 && !piece.promoted && PIECES[piece.type].canPromote) {
            piece.promoted = true;
            piece.type = PIECES[piece.type].promoted;
            promoted = true;
        }

        // 指し手を記録
        const moveText = movePieceName + (promoted ? '成' : '');
        this.recordMove(moveText, toRow, toCol, piece.owner);

        this.currentPlayer = this.currentPlayer === 'player' ? 'cpu' : 'player';
        this.renderBoard();
        this.updateUI();
    }

    cpuTurn() {
        if (this.gameOver) return;

        const cpuMoves = this.getAllValidMoves('cpu');
        if (cpuMoves.length === 0) {
            this.endGame('player');
            return;
        }

        // 難易度に応じた思考
        let selectedMove;
        if (this.difficulty === 'easy') {
            selectedMove = cpuMoves[Math.floor(Math.random() * cpuMoves.length)];
        } else if (this.difficulty === 'medium') {
            // 駒を取れる手を優先
            const captureMoves = cpuMoves.filter(move => this.board[move.toRow][move.toCol]);
            selectedMove = captureMoves.length > 0 ?
                captureMoves[Math.floor(Math.random() * captureMoves.length)] :
                cpuMoves[Math.floor(Math.random() * cpuMoves.length)];
        } else {
            // 上級：駒の価値を考慮
            const scoredMoves = cpuMoves.map(move => ({
                ...move,
                score: this.evaluateMove(move)
            }));
            scoredMoves.sort((a, b) => b.score - a.score);
            const topMoves = scoredMoves.filter(m => m.score === scoredMoves[0].score);
            selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        }

        this.makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
    }

    getAllValidMoves(player) {
        const moves = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === player) {
                    const validMoves = this.getValidMoves(row, col);
                    validMoves.forEach(move => {
                        moves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: move.row,
                            toCol: move.col
                        });
                    });
                }
            }
        }
        return moves;
    }

    evaluateMove(move) {
        const pieceValues = {
            '歩': 1, '香': 3, '桂': 4, '銀': 5, '金': 6, '角': 8, '飛': 10, '王': 1000, '玉': 1000,
            '!と': 6, '!杏': 6, '!圭': 6, '!全': 6, '!馬': 12, '!竜': 15
        };

        let score = 0;
        const targetPiece = this.board[move.toRow][move.toCol];

        if (targetPiece) {
            score += pieceValues[targetPiece.type] || 0;
        }

        return score;
    }

    updateUI() {
        document.getElementById('turn-indicator').textContent =
            this.currentPlayer === 'player' ? 'あなたの手番です' : 'CPUが考えています...';

        // プレイヤーの持ち駒（クリック可能）
        const playerCapturedEl = document.getElementById('player-captured');
        playerCapturedEl.innerHTML = this.playerCaptured.map((p, index) =>
            `<div class="captured-piece ${this.selectedCapturedPiece === p && this.playerCaptured.indexOf(p) === index ? 'selected' : ''}"
                  data-piece="${p}" data-index="${index}">${p}</div>`
        ).join('');

        // 持ち駒にクリックイベントを追加
        playerCapturedEl.querySelectorAll('.captured-piece').forEach(el => {
            el.addEventListener('click', () => {
                if (this.currentPlayer === 'player' && !this.gameOver) {
                    const pieceType = el.dataset.piece;

                    // 既に選択されている場合は解除
                    if (this.selectedCapturedPiece === pieceType) {
                        this.selectedCapturedPiece = null;
                    } else {
                        this.selectedCapturedPiece = pieceType;
                        this.selectedPiece = null;
                        this.selectedCell = null;
                        this.clearHighlights();
                    }

                    this.updateUI();
                }
            });
        });

        // CPUの持ち駒（表示のみ）
        document.getElementById('cpu-captured').innerHTML =
            this.cpuCaptured.map(p => `<div class="captured-piece">${p}</div>`).join('');
    }

    endGame(winner) {
        this.gameOver = true;
        const resultText = winner === 'player' ? 'あなたの勝ちです！' : 'CPUの勝ちです';
        document.getElementById('game-result').textContent = resultText;
        document.getElementById('game-over').classList.remove('hidden');
    }

    resign() {
        this.endGame('cpu');
    }
}
