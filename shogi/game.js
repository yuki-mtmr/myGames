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
    constructor(difficulty, gameMode = 'cpu') {
        this.difficulty = difficulty;
        this.gameMode = gameMode; // 'cpu' or 'pvp'
        this.board = this.initializeBoard();
        this.currentPlayer = 'player'; // 'player' or 'cpu' (pvpでは 'player' = 先手, 'cpu' = 後手として扱う)
        this.selectedPiece = null;
        this.selectedCell = null;
        this.selectedCapturedPiece = null; // 選択した持ち駒
        this.playerCaptured = []; // 先手の持ち駒
        this.cpuCaptured = []; // 後手の持ち駒
        this.moveHistory = []; // 指し手履歴
        this.boardHistory = []; // 盤面履歴（待った用）
        this.gameOver = false;
        this.pendingMove = null; // 成り選択待ちの移動
        this.transpositionTable = new Map(); // トランスポジションテーブル
        this.nodeCount = 0; // 探索ノード数（デバッグ用）

        // 初期盤面を保存
        this.saveBoardState();

        this.setupAudioContext();
        this.renderBoard();
        this.updateUI();
        this.setupPromotionModal();
    }

    // 盤面状態を保存
    saveBoardState() {
        const state = {
            board: this.board.map(row => row.map(cell =>
                cell ? { ...cell } : null
            )),
            playerCaptured: [...this.playerCaptured],
            cpuCaptured: [...this.cpuCaptured],
            currentPlayer: this.currentPlayer,
            moveHistoryLength: this.moveHistory.length
        };
        this.boardHistory.push(state);
    }

    // 1手戻す（待った）
    undo() {
        // CPUモードでは2手戻す（自分とCPUの手）、PvPモードでは1手戻す
        const stepsBack = this.gameMode === 'cpu' ? 2 : 1;

        // 履歴が足りない場合は戻せない
        if (this.boardHistory.length <= stepsBack) {
            return false;
        }

        // ゲーム終了状態をリセット
        this.gameOver = false;
        document.getElementById('game-over').classList.add('hidden');

        // 指定した手数分だけ履歴を戻す
        for (let i = 0; i < stepsBack; i++) {
            this.boardHistory.pop();
        }

        // 最後の状態を復元
        const state = this.boardHistory[this.boardHistory.length - 1];

        this.board = state.board.map(row => row.map(cell =>
            cell ? { ...cell } : null
        ));
        this.playerCaptured = [...state.playerCaptured];
        this.cpuCaptured = [...state.cpuCaptured];
        this.currentPlayer = state.currentPlayer;

        // 指し手履歴も戻す
        while (this.moveHistory.length > state.moveHistoryLength) {
            this.moveHistory.pop();
        }

        // 選択状態をリセット
        this.selectedPiece = null;
        this.selectedCell = null;
        this.selectedCapturedPiece = null;
        this.pendingMove = null;

        this.renderBoard();
        this.updateUI();
        this.updateMoveHistory();

        return true;
    }

    setupAudioContext() {
        // Web Audio APIのコンテキストを初期化
        this.audioContext = null;

        // ユーザーインタラクション後に初期化（ブラウザのポリシー対応）
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            document.removeEventListener('click', initAudio);
        };
        document.addEventListener('click', initAudio);
    }

    playMoveSound() {
        // AudioContextが初期化されていない場合は何もしない
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // ホワイトノイズを使った硬い「カタっ」という音
        const bufferSize = this.audioContext.sampleRate * 0.03; // 30ms
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // ホワイトノイズを生成
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        // 高域フィルターで木の音らしくする
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000, now); // 高域のみ通す

        const gainNode = this.audioContext.createGain();

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 非常に短く鋭いアタックとリリース
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.001); // 1msで最大音量
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.025); // 25msで減衰

        noise.start(now);
        noise.stop(now + 0.03);
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

        // 王手状態をチェック
        const playerInCheck = this.isKingInCheck('player');
        const cpuInCheck = this.isKingInCheck('cpu');
        const playerKingPos = playerInCheck ? this.getKingPosition('player') : null;
        const cpuKingPos = cpuInCheck ? this.getKingPosition('cpu') : null;

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                // 王手ハイライト
                if ((playerKingPos && playerKingPos.row === row && playerKingPos.col === col) ||
                    (cpuKingPos && cpuKingPos.row === row && cpuKingPos.col === col)) {
                    cell.classList.add('in-check');
                }

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
        if (this.gameOver) return;
        // CPUモードでCPUのターンの場合は操作不可
        if (this.gameMode === 'cpu' && this.currentPlayer !== 'player') return;

        const piece = this.board[row][col];

        // 持ち駒を選択している場合
        if (this.selectedCapturedPiece) {
            // バリデーションチェック
            if (this.canPlaceCapturedPiece(this.selectedCapturedPiece, row, col, this.currentPlayer)) {
                this.placeCapturedPiece(row, col);
                this.selectedCapturedPiece = null;
                this.clearHighlights();

                // CPUモードでプレイヤーのターン後のみCPUを呼び出す
                if (!this.gameOver && this.gameMode === 'cpu' && this.currentPlayer === 'cpu') {
                    setTimeout(() => this.cpuTurn(), 500);
                }
            }
            // 無効な場所をクリックした場合は何もしない（エラーメッセージなし）
            return;
        }

        // 駒を選択
        if (piece && piece.owner === this.currentPlayer && !this.selectedPiece) {
            // 王手時は、その駒で王手を解消できるかチェック
            const validMoves = this.getValidMoves(row, col);
            if (validMoves.length === 0) {
                // 動かせる場所がない駒は選択できない
                return;
            }
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
                this.initiateMove(this.selectedCell.row, this.selectedCell.col, row, col);
                this.selectedPiece = null;
                this.selectedCell = null;
                this.clearHighlights();
            } else {
                this.selectedPiece = null;
                this.selectedCell = null;
                this.clearHighlights();
                this.renderBoard();
            }
        }
    }

    getValidMoves(row, col, ignoreCheck = false) {
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

                    // 移動方向の単位ベクトル
                    const stepDx = dx === 0 ? 0 : dx / Math.abs(dx);
                    const stepDy = dy === 0 ? 0 : dy / Math.abs(dy);

                    for (let step = 1; step < steps; step++) {
                        const checkCol = col + (piece.owner === 'player' ? stepDx * step : -stepDx * step);
                        const checkRow = row + (piece.owner === 'player' ? stepDy * step : -stepDy * step);
                        // 範囲チェックを追加
                        if (checkRow < 0 || checkRow >= 9 || checkCol < 0 || checkCol >= 9) {
                            blocked = true;
                            break;
                        }
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

        // 王手放置・自殺手のチェック
        // ignoreCheckがfalseの場合、王手を解消する手のみを返す
        if (!ignoreCheck) {
            const validMoves = [];
            for (const move of moves) {
                // 仮想的に移動
                const originalTarget = this.board[move.row][move.col];
                this.board[move.row][move.col] = this.board[row][col];
                this.board[row][col] = null;

                // 王手がかかっていないかチェック
                if (!this.isKingInCheck(piece.owner)) {
                    validMoves.push(move);
                }

                // 元に戻す
                this.board[row][col] = this.board[move.row][move.col];
                this.board[move.row][move.col] = originalTarget;
            }
            return validMoves;
        }

        return moves;
    }

    // 指定したプレイヤーの玉に王手がかかっているか
    isKingInCheck(player) {
        // 玉の位置を探す
        let kingRow, kingCol;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === player && (piece.type === '王' || piece.type === '玉')) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
        }

        if (kingRow === undefined) return false; // 玉が取られた状態

        // 相手の全ての駒の効きをチェック
        const opponent = player === 'player' ? 'cpu' : 'player';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === opponent) {
                    // 王手チェック時は再帰を防ぐため ignoreCheck=true
                    const moves = this.getValidMoves(r, c, true);
                    if (moves.some(m => m.row === kingRow && m.col === kingCol)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // 詰み判定（王手がかかっていて、合法手がない状態）
    isCheckmate(player) {
        // まず王手がかかっているかチェック
        if (!this.isKingInCheck(player)) {
            return false;
        }

        // 合法手があるかチェック
        const legalMoves = this.getAllLegalMoves(player);
        return legalMoves.length === 0;
    }

    // 玉の位置を取得
    getKingPosition(player) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === player && (piece.type === '王' || piece.type === '玉')) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
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

    canPlaceCapturedPiece(pieceType, row, col, player) {
        // 既に駒がある場所には置けない
        if (this.board[row][col]) {
            return false;
        }

        // 二歩チェック（同じ筋に歩が既にあるか）
        if (pieceType === '歩') {
            for (let r = 0; r < 9; r++) {
                const piece = this.board[r][col];
                if (piece && piece.owner === player && piece.type === '歩' && !piece.promoted) {
                    return false;
                }
            }
        }

        // 行き所のない駒チェック
        // 先手（player）の場合
        if (player === 'player') {
            if (pieceType === '歩' && row === 0) return false;
            if (pieceType === '香' && row === 0) return false;
            if (pieceType === '桂' && (row === 0 || row === 1)) return false;
        }
        // 後手（cpu）の場合
        else {
            if (pieceType === '歩' && row === 8) return false;
            if (pieceType === '香' && row === 8) return false;
            if (pieceType === '桂' && (row === 8 || row === 7)) return false;
        }

        // 打ち歩詰めチェック（簡易版）
        const opponent = player === 'player' ? 'cpu' : 'player';
        if (pieceType === '歩') {
            // 先手は上方向、後手は下方向
            const frontRow = player === 'player' ? row - 1 : row + 1;
            if (frontRow >= 0 && frontRow < 9) {
                const frontPiece = this.board[frontRow][col];
                if (frontPiece && frontPiece.owner === opponent && (frontPiece.type === '玉' || frontPiece.type === '王')) {
                    return false;
                }
            }
        }

        // 王手放置チェック（仮想的に配置してチェック）
        this.board[row][col] = { type: pieceType, owner: player, promoted: false };
        const isCheck = this.isKingInCheck(player);
        this.board[row][col] = null; // 元に戻す

        if (isCheck) return false;

        return true;
    }

    placeCapturedPiece(row, col) {
        const pieceType = this.selectedCapturedPiece;
        const currentPlayer = this.currentPlayer;

        // バリデーションチェック（無効な場合は何もしない）
        if (!this.canPlaceCapturedPiece(pieceType, row, col, currentPlayer)) {
            return;
        }

        // 持ち駒から削除
        const capturedList = currentPlayer === 'player' ? this.playerCaptured : this.cpuCaptured;
        const index = capturedList.indexOf(pieceType);
        if (index > -1) {
            capturedList.splice(index, 1);
        }

        // 盤面に配置
        this.board[row][col] = {
            type: pieceType,
            owner: currentPlayer,
            promoted: false
        };

        // 効果音を再生
        this.playMoveSound();

        // 指し手を記録
        this.recordMove(`${pieceType}打`, row, col, currentPlayer);

        // ターン切り替え
        this.currentPlayer = currentPlayer === 'player' ? 'cpu' : 'player';

        // 盤面状態を保存
        this.saveBoardState();

        this.renderBoard();
        this.updateUI();

        // 詰み判定
        const opponent = currentPlayer === 'player' ? 'cpu' : 'player';
        if (this.isCheckmate(opponent)) {
            this.endGame(currentPlayer, 'checkmate');
        }
    }

    recordMove(moveText, toRow, toCol, player) {
        const colNames = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
        const rowNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        const position = `${colNames[toCol]}${rowNames[toRow]} `;

        this.moveHistory.push({
            player: player,
            text: `${position}${moveText} `,
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

    setupPromotionModal() {
        // 成り選択モーダルを作成
        const modal = document.createElement('div');
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

        document.getElementById('promote-yes').addEventListener('click', () => {
            this.completeMove(true);
        });

        document.getElementById('promote-no').addEventListener('click', () => {
            this.completeMove(false);
        });
    }

    initiateMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];

        // 成れる条件をチェック
        const canPromote = !piece.promoted && PIECES[piece.type].canPromote &&
            ((piece.owner === 'player' && (fromRow <= 2 || toRow <= 2)) ||
                (piece.owner === 'cpu' && (fromRow >= 6 || toRow >= 6)));

        // 成りが強制される条件（行き所のない駒）
        const mustPromote = !piece.promoted && PIECES[piece.type].canPromote &&
            ((piece.owner === 'player' && piece.type === '歩' && toRow === 0) ||
                (piece.owner === 'player' && piece.type === '香' && toRow === 0) ||
                (piece.owner === 'player' && piece.type === '桂' && (toRow === 0 || toRow === 1)) ||
                (piece.owner === 'cpu' && piece.type === '歩' && toRow === 8) ||
                (piece.owner === 'cpu' && piece.type === '香' && toRow === 8) ||
                (piece.owner === 'cpu' && piece.type === '桂' && (toRow === 7 || toRow === 8)));

        this.pendingMove = { fromRow, fromCol, toRow, toCol };

        if (mustPromote) {
            // 強制成り
            this.completeMove(true);
        } else if (canPromote && piece.owner === 'player') {
            // プレイヤーに選択させる
            document.getElementById('promotion-modal').classList.remove('hidden');
        } else {
            // 成らない
            this.completeMove(false);
        }
    }

    completeMove(promote) {
        document.getElementById('promotion-modal').classList.add('hidden');

        if (!this.pendingMove) return;

        const { fromRow, fromCol, toRow, toCol } = this.pendingMove;
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
                this.endGame(piece.owner, 'capture');
                return;
            }
        }

        // 駒を移動
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // 成りの処理
        if (promote && !piece.promoted && PIECES[piece.type].canPromote) {
            piece.promoted = true;
            piece.type = PIECES[piece.type].promoted;
        }

        // 効果音を再生
        this.playMoveSound();

        // 指し手を記録
        const moveText = movePieceName + (promote ? '成' : '');
        this.recordMove(moveText, toRow, toCol, piece.owner);

        this.pendingMove = null;
        this.currentPlayer = this.currentPlayer === 'player' ? 'cpu' : 'player';

        // 盤面状態を保存
        this.saveBoardState();

        this.renderBoard();
        this.updateUI();

        // 詰み判定
        const opponent = piece.owner === 'player' ? 'cpu' : 'player';
        if (this.isCheckmate(opponent)) {
            this.endGame(piece.owner, 'checkmate');
            return;
        }

        // CPUモードでCPUのターンの場合のみCPUを呼び出す
        if (!this.gameOver && this.gameMode === 'cpu' && this.currentPlayer === 'cpu') {
            setTimeout(() => this.cpuTurn(), 500);
        }
    }

    makeMove(fromRow, fromCol, toRow, toCol, promote = false) {
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
                this.endGame(piece.owner, 'capture');
                return;
            }
        }

        // 駒を移動
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // 成りの判定（CPU用：自動成り）
        let promoted = false;
        if (promote || (piece.owner === 'cpu' && toRow >= 6 && !piece.promoted && PIECES[piece.type].canPromote)) {
            piece.promoted = true;
            piece.type = PIECES[piece.type].promoted;
            promoted = true;
        }

        // 効果音を再生
        this.playMoveSound();

        // 指し手を記録
        const moveText = movePieceName + (promoted ? '成' : '');
        this.recordMove(moveText, toRow, toCol, piece.owner);

        this.currentPlayer = this.currentPlayer === 'player' ? 'cpu' : 'player';

        // 盤面状態を保存
        this.saveBoardState();

        this.renderBoard();
        this.updateUI();

        // 詰み判定
        const opponent = piece.owner === 'player' ? 'cpu' : 'player';
        if (this.isCheckmate(opponent)) {
            this.endGame(piece.owner, 'checkmate');
        }
    }

    cpuTurn() {
        if (this.gameOver) return;

        // 全ての合法手（盤上の移動 + 持ち駒）を取得
        const legalMoves = this.getAllLegalMoves('cpu');

        if (legalMoves.length === 0) {
            this.endGame('player');
            return;
        }

        let selectedMove;

        if (this.difficulty === 'easy') {
            // 完全ランダム
            selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        } else if (this.difficulty === 'medium') {
            // 駒の価値を考慮した駒取り優先ロジック
            const pieceValues = {
                '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000,
                '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1100, '!竜': 1300
            };

            // 駒を取れる手を価値順にソート
            const captureMoves = legalMoves
                .filter(m => m.type === 'move' && this.board[m.toRow][m.toCol])
                .map(m => ({
                    move: m,
                    value: pieceValues[this.board[m.toRow][m.toCol].type] || 0
                }))
                .sort((a, b) => b.value - a.value);

            if (captureMoves.length > 0 && Math.random() < 0.8) {
                // 高価値駒を優先（飛・角は90%で狙う、それ以外は70%）
                const bestCapture = captureMoves[0];
                if (bestCapture.value >= 800) {
                    // 飛車・角行は高確率で取る
                    selectedMove = bestCapture.move;
                } else if (bestCapture.value >= 500 && Math.random() < 0.85) {
                    // 金銀も高確率で取る
                    selectedMove = bestCapture.move;
                } else {
                    // その他の駒は上位からランダムに選択
                    const topMoves = captureMoves.slice(0, Math.min(3, captureMoves.length));
                    selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
                }
            } else {
                // 簡易評価で良さそうな手を選ぶ（完全ランダムではなく）
                const scoredMoves = legalMoves.map(m => {
                    const undo = this.applyVirtualMove(m, 'cpu');
                    const score = this.evaluateBoardQuick('cpu');
                    this.undoVirtualMove(undo);
                    return { move: m, score };
                });
                scoredMoves.sort((a, b) => b.score - a.score);

                // 上位5手からランダムに選択（多少のランダム性を残す）
                const topN = Math.min(5, scoredMoves.length);
                selectedMove = scoredMoves[Math.floor(Math.random() * topN)].move;
            }
        } else {
            // Hard: Minimax法 + トランスポジションテーブル + 手の順序付け
            this.transpositionTable.clear();
            this.nodeCount = 0;

            // 手の順序付け（駒取りを先に評価、高価値駒を優先）
            const pieceValues = {
                '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000,
                '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1100, '!竜': 1300
            };

            const orderedMoves = [...legalMoves].sort((a, b) => {
                // 駒取りを優先
                const aCapture = a.type === 'move' && this.board[a.toRow][a.toCol]
                    ? pieceValues[this.board[a.toRow][a.toCol].type] || 0 : 0;
                const bCapture = b.type === 'move' && this.board[b.toRow][b.toCol]
                    ? pieceValues[this.board[b.toRow][b.toCol].type] || 0 : 0;
                return bCapture - aCapture;
            });

            // 反復深化法（深さ2から開始し、深さ4まで）
            const maxDepth = 4;
            let bestMoves = [orderedMoves[0]];
            let bestScore = -Infinity;

            for (let depth = 2; depth <= maxDepth; depth++) {
                let currentBestScore = -Infinity;
                let currentBestMoves = [];
                let alpha = -Infinity;
                const beta = Infinity;

                for (const move of orderedMoves) {
                    const undo = this.applyVirtualMove(move, 'cpu');
                    const score = this.minimax(depth - 1, alpha, beta, false);
                    this.undoVirtualMove(undo);

                    if (score > currentBestScore) {
                        currentBestScore = score;
                        currentBestMoves = [move];
                        alpha = Math.max(alpha, score);
                    } else if (score === currentBestScore) {
                        currentBestMoves.push(move);
                    }
                }

                bestScore = currentBestScore;
                bestMoves = currentBestMoves;
            }

            selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        // 選んだ手を実行
        if (selectedMove.type === 'move') {
            this.makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
        } else {
            // 持ち駒を打つ処理（CPU用）
            this.executeCpuDrop(selectedMove);
        }
    }

    // CPUが持ち駒を打つ処理
    executeCpuDrop(move) {
        const pieceType = move.piece;
        const index = this.cpuCaptured.indexOf(pieceType);
        if (index > -1) {
            this.cpuCaptured.splice(index, 1);
        }

        this.board[move.toRow][move.toCol] = {
            type: pieceType,
            owner: 'cpu',
            promoted: false
        };

        // 効果音を再生
        this.playMoveSound();

        this.recordMove(`${pieceType}打`, move.toRow, move.toCol, 'cpu');
        this.currentPlayer = 'player';

        // 盤面状態を保存
        this.saveBoardState();

        this.renderBoard();
        this.updateUI();

        // 詰み判定
        if (this.isCheckmate('player')) {
            this.endGame('cpu', 'checkmate');
        }
    }

    // 合法手（移動・打ち込み）を全て取得
    getAllLegalMoves(player) {
        const moves = [];

        // 1. 盤上の駒の移動
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === player) {
                    const validMoves = this.getValidMoves(row, col);
                    validMoves.forEach(move => {
                        moves.push({
                            type: 'move',
                            fromRow: row,
                            fromCol: col,
                            toRow: move.row,
                            toCol: move.col,
                            piece: piece // 仮想移動のために駒情報も持たせる
                        });
                    });
                }
            }
        }

        // 2. 持ち駒の打ち込み
        const captured = player === 'player' ? this.playerCaptured : this.cpuCaptured;
        const uniquePieces = [...new Set(captured)];

        for (const pieceType of uniquePieces) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.canPlaceCapturedPiece(pieceType, r, c, player)) {
                        moves.push({
                            type: 'drop',
                            piece: pieceType,
                            toRow: r,
                            toCol: c,
                            owner: player // 仮想移動のためにowner情報も持たせる
                        });
                    }
                }
            }
        }

        return moves;
    }

    // 盤面のハッシュキーを生成
    getBoardHash() {
        let hash = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    hash += `${r}${c}${piece.type}${piece.owner[0]}`;
                }
            }
        }
        hash += '|' + this.cpuCaptured.sort().join('');
        hash += '|' + this.playerCaptured.sort().join('');
        return hash;
    }

    // Minimax法（Alpha-Beta法 + トランスポジションテーブル）
    minimax(depth, alpha, beta, isMaximizing) {
        this.nodeCount++;

        // トランスポジションテーブルの参照
        const hash = this.getBoardHash() + `|${depth}|${isMaximizing}`;
        const cached = this.transpositionTable.get(hash);
        if (cached !== undefined) {
            return cached;
        }

        if (depth === 0) {
            const score = this.evaluateBoard('cpu');
            this.transpositionTable.set(hash, score);
            return score;
        }

        const player = isMaximizing ? 'cpu' : 'player';
        const legalMoves = this.getAllLegalMoves(player);

        if (legalMoves.length === 0) {
            // 詰み
            const score = isMaximizing ? -1000000 + (4 - depth) : 1000000 - (4 - depth);
            this.transpositionTable.set(hash, score);
            return score;
        }

        // 手の順序付け（駒取りを優先）
        const pieceValues = {
            '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000,
            '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1100, '!竜': 1300
        };

        const orderedMoves = [...legalMoves].sort((a, b) => {
            const aVal = a.type === 'move' && this.board[a.toRow][a.toCol]
                ? pieceValues[this.board[a.toRow][a.toCol].type] || 0 : 0;
            const bVal = b.type === 'move' && this.board[b.toRow][b.toCol]
                ? pieceValues[this.board[b.toRow][b.toCol].type] || 0 : 0;
            return bVal - aVal;
        });

        let result;
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of orderedMoves) {
                const undo = this.applyVirtualMove(move, player);
                const evalScore = this.minimax(depth - 1, alpha, beta, false);
                this.undoVirtualMove(undo);

                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            result = maxEval;
        } else {
            let minEval = Infinity;
            for (const move of orderedMoves) {
                const undo = this.applyVirtualMove(move, player);
                const evalScore = this.minimax(depth - 1, alpha, beta, true);
                this.undoVirtualMove(undo);

                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            result = minEval;
        }

        this.transpositionTable.set(hash, result);
        return result;
    }

    // 盤面評価関数（CPU視点）
    evaluateBoard(player) {
        const pieceValues = {
            '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000, '王': 100000, '玉': 100000,
            '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1100, '!竜': 1300
        };

        // 位置評価テーブル（前進ボーナス）
        const positionBonus = {
            '歩': [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [50, 50, 50, 50, 50, 50, 50, 50, 50],
                [30, 30, 30, 40, 40, 40, 30, 30, 30],
                [20, 20, 25, 30, 30, 30, 25, 20, 20],
                [10, 10, 15, 20, 25, 20, 15, 10, 10],
                [5, 5, 10, 15, 20, 15, 10, 5, 5],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]
            ],
            '金': [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [20, 25, 30, 35, 35, 35, 30, 25, 20],
                [15, 20, 25, 30, 30, 30, 25, 20, 15],
                [10, 15, 20, 25, 25, 25, 20, 15, 10],
                [5, 10, 15, 20, 20, 20, 15, 10, 5],
                [0, 5, 10, 15, 15, 15, 10, 5, 0],
                [0, 0, 5, 10, 10, 10, 5, 0, 0],
                [-5, 0, 5, 5, 10, 5, 5, 0, -5],
                [-10, -5, 0, 5, 5, 5, 0, -5, -10]
            ],
            '銀': [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [25, 30, 35, 35, 35, 35, 35, 30, 25],
                [20, 25, 30, 30, 30, 30, 30, 25, 20],
                [15, 20, 25, 25, 25, 25, 25, 20, 15],
                [10, 15, 20, 20, 20, 20, 20, 15, 10],
                [5, 10, 15, 15, 15, 15, 15, 10, 5],
                [0, 5, 10, 10, 10, 10, 10, 5, 0],
                [0, 0, 5, 5, 5, 5, 5, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]
            ],
            '角': [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 5, 10, 10, 10, 10, 10, 5, 0],
                [0, 10, 15, 15, 15, 15, 15, 10, 0],
                [0, 10, 15, 20, 20, 20, 15, 10, 0],
                [0, 10, 15, 20, 25, 20, 15, 10, 0],
                [0, 10, 15, 20, 20, 20, 15, 10, 0],
                [0, 10, 15, 15, 15, 15, 15, 10, 0],
                [0, 5, 10, 10, 10, 10, 10, 5, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]
            ],
            '飛': [
                [5, 5, 5, 5, 10, 5, 5, 5, 5],
                [10, 15, 15, 15, 20, 15, 15, 15, 10],
                [5, 10, 10, 10, 15, 10, 10, 10, 5],
                [5, 10, 10, 10, 15, 10, 10, 10, 5],
                [5, 10, 10, 10, 15, 10, 10, 10, 5],
                [5, 10, 10, 10, 15, 10, 10, 10, 5],
                [5, 10, 10, 10, 15, 10, 10, 10, 5],
                [10, 15, 15, 15, 20, 15, 15, 15, 10],
                [5, 5, 5, 5, 10, 5, 5, 5, 5]
            ]
        };

        let score = 0;
        let cpuKingPos = null;
        let playerKingPos = null;

        // 盤上の駒の評価
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    let value = pieceValues[piece.type] || 0;

                    // 玉の位置を記録
                    if (piece.type === '玉' || piece.type === '王') {
                        if (piece.owner === 'cpu') {
                            cpuKingPos = { row: r, col: c };
                        } else {
                            playerKingPos = { row: r, col: c };
                        }
                    }

                    // 位置評価ボーナス（5倍の重み）
                    const baseType = piece.type.startsWith('!') ? piece.type.substring(1) : piece.type;
                    const bonusTable = positionBonus[baseType] || positionBonus['金'];
                    if (bonusTable) {
                        const evalRow = piece.owner === 'cpu' ? r : (8 - r);
                        value += bonusTable[evalRow][c] * 5;
                    }

                    // 成駒の位置ボーナス（敵陣に近いほど価値上昇）
                    if (piece.type.startsWith('!')) {
                        const promotedBonus = piece.owner === 'cpu' ? r * 8 : (8 - r) * 8;
                        value += promotedBonus;
                    }

                    if (piece.owner === 'cpu') {
                        score += value;
                    } else {
                        score -= value;
                    }
                }
            }
        }

        // 駒の利き数を評価（機動性）
        score += this.evaluateMobility('cpu') * 3;
        score -= this.evaluateMobility('player') * 3;

        // 玉の安全度を評価
        if (cpuKingPos) {
            score += this.evaluateKingSafety(cpuKingPos, 'cpu') * 10;
        }
        if (playerKingPos) {
            score -= this.evaluateKingSafety(playerKingPos, 'player') * 10;
        }

        // 持ち駒の評価（持ち駒は打てる柔軟性があるため価値が高い）
        for (const p of this.cpuCaptured) {
            score += (pieceValues[p] || 0) * 1.15;
        }
        for (const p of this.playerCaptured) {
            score -= (pieceValues[p] || 0) * 1.15;
        }

        // 王手がかかっているかどうかの評価
        if (this.isKingInCheck('player')) {
            score += 800;
        }
        if (this.isKingInCheck('cpu')) {
            score -= 800;
        }

        return score;
    }

    // 駒の利き数を評価（機動性）
    evaluateMobility(player) {
        let mobility = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === player) {
                    const moves = this.getValidMoves(r, c, true);
                    mobility += moves.length;
                }
            }
        }
        return mobility;
    }

    // 玉の安全度を評価
    evaluateKingSafety(kingPos, player) {
        let safety = 0;
        const { row, col } = kingPos;

        // 周囲8マスの守り駒をカウント
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                    const piece = this.board[nr][nc];
                    if (piece && piece.owner === player) {
                        // 金・銀は守りとして優秀
                        if (piece.type === '金' || piece.type === '銀' || piece.type === '!全') {
                            safety += 15;
                        } else if (piece.type.startsWith('!')) {
                            safety += 10;
                        } else {
                            safety += 5;
                        }
                    }
                }
            }
        }

        // 玉の位置による評価（端は危険、中段は柔軟性がある）
        if (player === 'cpu') {
            // CPUの玉は1-3段目が安全
            if (row <= 2) safety += 20;
            else if (row >= 6) safety -= 30; // 敵陣に近いと危険
        } else {
            // プレイヤーの玉は7-9段目が安全
            if (row >= 6) safety += 20;
            else if (row <= 2) safety -= 30;
        }

        // 中央列は危険（飛車に狙われやすい）
        if (col === 4) safety -= 10;

        return safety;
    }

    // 簡易評価関数（Medium難易度用、高速版）
    evaluateBoardQuick(player) {
        const pieceValues = {
            '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000, '王': 100000, '玉': 100000,
            '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1100, '!竜': 1300
        };

        let score = 0;

        // 盤上の駒の評価（位置評価なし）
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    const value = pieceValues[piece.type] || 0;
                    // 前進ボーナス（簡易版）
                    const advanceBonus = piece.owner === 'cpu' ? r * 3 : (8 - r) * 3;

                    if (piece.owner === 'cpu') {
                        score += value + advanceBonus;
                    } else {
                        score -= value + advanceBonus;
                    }
                }
            }
        }

        // 持ち駒の評価
        for (const p of this.cpuCaptured) {
            score += (pieceValues[p] || 0) * 1.1;
        }
        for (const p of this.playerCaptured) {
            score -= (pieceValues[p] || 0) * 1.1;
        }

        return score;
    }

    // 仮想的な移動の適用
    applyVirtualMove(move, currentPlayer) {
        const undoInfo = {
            move: move,
            originalPiece: null, // 移動元の駒
            capturedPiece: null, // 取った駒
            promoted: false,
            capturedPieceType: null, // 持ち駒に追加された駒のタイプ
            capturedPieceIndex: -1 // 持ち駒から削除された駒のインデックス
        };

        if (move.type === 'move') {
            const piece = this.board[move.fromRow][move.fromCol];
            undoInfo.originalPiece = { ...piece }; // 駒の状態をコピー
            undoInfo.capturedPiece = this.board[move.toRow][move.toCol]; // 取った駒（あれば）

            // 成りの判定と適用
            let currentPieceType = piece.type;
            let currentPromoted = piece.promoted;

            if (piece.owner === 'player' && move.toRow <= 2 && !piece.promoted && PIECES[piece.type].canPromote) {
                currentPromoted = true;
                currentPieceType = PIECES[piece.type].promoted;
                undoInfo.promoted = true;
            } else if (piece.owner === 'cpu' && move.toRow >= 6 && !piece.promoted && PIECES[piece.type].canPromote) {
                currentPromoted = true;
                currentPieceType = PIECES[piece.type].promoted;
                undoInfo.promoted = true;
            }

            // 盤面を更新
            this.board[move.toRow][move.toCol] = {
                type: currentPieceType,
                owner: piece.owner,
                promoted: currentPromoted
            };
            this.board[move.fromRow][move.fromCol] = null;

            // 取った駒を持ち駒に追加
            if (undoInfo.capturedPiece) {
                const basePiece = undoInfo.capturedPiece.type.startsWith('!') ? undoInfo.capturedPiece.type.substring(1) : undoInfo.capturedPiece.type;
                const capturedPieceType = basePiece === 'と' ? '歩' :
                    basePiece === '杏' ? '香' :
                        basePiece === '圭' ? '桂' :
                            basePiece === '全' ? '銀' :
                                basePiece === '馬' ? '角' :
                                    basePiece === '竜' ? '飛' : basePiece;

                const capturedList = piece.owner === 'player' ? this.playerCaptured : this.cpuCaptured;
                capturedList.push(capturedPieceType);
                undoInfo.capturedPieceType = capturedPieceType;
            }

        } else { // 打ち込み (type === 'drop')
            const pieceType = move.piece;
            const owner = move.owner; // getAllLegalMovesでownerを追加済み

            const capturedList = owner === 'player' ? this.playerCaptured : this.cpuCaptured;
            const index = capturedList.indexOf(pieceType);
            if (index > -1) {
                capturedList.splice(index, 1);
                undoInfo.capturedPieceIndex = index;
            }

            this.board[move.toRow][move.toCol] = {
                type: pieceType,
                owner: owner,
                promoted: false
            };
        }

        return undoInfo;
    }

    // 仮想的な移動を元に戻す
    undoVirtualMove(undoInfo) {
        const move = undoInfo.move;

        if (move.type === 'move') {
            // 移動元の駒を戻す
            this.board[move.fromRow][move.fromCol] = undoInfo.originalPiece;
            // 移動先の駒を元に戻す（取られた駒があればそれに戻す）
            this.board[move.toRow][move.toCol] = undoInfo.capturedPiece;

            // 成りを元に戻す
            if (undoInfo.promoted) {
                this.board[move.fromRow][move.fromCol].promoted = false;
                this.board[move.fromRow][move.fromCol].type = undoInfo.originalPiece.type;
            }

            // 持ち駒から取った駒を削除
            if (undoInfo.capturedPieceType) {
                const capturedList = undoInfo.originalPiece.owner === 'player' ? this.playerCaptured : this.cpuCaptured;
                const index = capturedList.lastIndexOf(undoInfo.capturedPieceType);
                if (index > -1) {
                    capturedList.splice(index, 1);
                }
            }
        } else { // 打ち込み (type === 'drop')
            // 盤面から駒を削除
            this.board[move.toRow][move.toCol] = null;

            // 持ち駒を戻す
            if (undoInfo.capturedPieceIndex !== -1) {
                const capturedList = move.owner === 'player' ? this.playerCaptured : this.cpuCaptured;
                capturedList.splice(undoInfo.capturedPieceIndex, 0, move.piece);
            }
        }
    }

    updateUI() {
        // ターンインジケーターの更新
        let turnText;
        if (this.gameMode === 'pvp') {
            turnText = this.currentPlayer === 'player' ? '☗ 先手の手番です' : '☖ 後手の手番です';
        } else {
            turnText = this.currentPlayer === 'player' ? 'あなたの手番です' : 'CPUが考えています...';
        }
        document.getElementById('turn-indicator').textContent = turnText;

        // 先手（プレイヤー）の持ち駒
        const playerCapturedEl = document.getElementById('player-captured');
        const canSelectPlayer = !this.gameOver && this.currentPlayer === 'player';
        playerCapturedEl.innerHTML = this.playerCaptured.map((p, index) =>
            `<div class="captured-piece ${this.selectedCapturedPiece === p && this.currentPlayer === 'player' ? 'selected' : ''} ${canSelectPlayer ? 'clickable' : ''}"
                  data-piece="${p}" data-index="${index}" data-owner="player">${p}</div>`
        ).join('');

        // 後手（CPU/対戦相手）の持ち駒
        const cpuCapturedEl = document.getElementById('cpu-captured');
        const canSelectCpu = !this.gameOver && this.currentPlayer === 'cpu' && this.gameMode === 'pvp';
        cpuCapturedEl.innerHTML = this.cpuCaptured.map((p, index) =>
            `<div class="captured-piece ${this.selectedCapturedPiece === p && this.currentPlayer === 'cpu' ? 'selected' : ''} ${canSelectCpu ? 'clickable' : ''}"
                  data-piece="${p}" data-index="${index}" data-owner="cpu">${p}</div>`
        ).join('');

        // 持ち駒にクリックイベントを追加（両方の駒台）
        const setupCapturedPieceClick = (el) => {
            el.addEventListener('click', () => {
                if (this.gameOver) return;
                const owner = el.dataset.owner;
                // 自分のターンで自分の持ち駒のみ選択可能
                if (this.currentPlayer !== owner) return;
                // CPUモードでCPUの持ち駒は選択不可
                if (this.gameMode === 'cpu' && owner === 'cpu') return;

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
            });
        };

        playerCapturedEl.querySelectorAll('.captured-piece').forEach(setupCapturedPieceClick);
        cpuCapturedEl.querySelectorAll('.captured-piece').forEach(setupCapturedPieceClick);
    }

    endGame(winner, reason = 'resign') {
        this.gameOver = true;
        let resultText;

        const winnerName = this.gameMode === 'pvp'
            ? (winner === 'player' ? '☗ 先手' : '☖ 後手')
            : (winner === 'player' ? 'あなた' : 'CPU');

        const loserName = this.gameMode === 'pvp'
            ? (winner === 'player' ? '☖ 後手' : '☗ 先手')
            : (winner === 'player' ? 'CPU' : 'あなた');

        if (reason === 'checkmate') {
            resultText = `詰みです！${winnerName}の勝ちです！`;
        } else if (reason === 'capture') {
            resultText = `玉を取りました！${winnerName}の勝ちです！`;
        } else {
            resultText = `${loserName}が投了しました。${winnerName}の勝ちです！`;
        }

        // 対局履歴を保存
        this.saveToHistory(winner, reason);

        document.getElementById('game-result').textContent = resultText;
        document.getElementById('game-over').classList.remove('hidden');
    }

    resign() {
        // 現在のプレイヤーが投了する（相手の勝ち）
        const winner = this.currentPlayer === 'player' ? 'cpu' : 'player';
        this.endGame(winner, 'resign');
    }

    // KIF形式で棋譜をエクスポート
    exportKIF() {
        const lines = [];

        // ヘッダー
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        lines.push(`# ---- 棋譜ファイル ----`);
        lines.push(`開始日時：${dateStr}`);

        if (this.gameMode === 'pvp') {
            lines.push(`先手：先手`);
            lines.push(`後手：後手`);
        } else {
            lines.push(`先手：あなた`);
            lines.push(`後手：CPU（${this.difficulty}）`);
        }

        lines.push(`手合割：平手`);
        lines.push(`手数----指手---------消費時間--`);

        // 指し手
        this.moveHistory.forEach((move, index) => {
            const num = String(index + 1).padStart(4, ' ');
            const playerMark = move.player === 'player' ? '▲' : '△';
            lines.push(`${num} ${playerMark}${move.text.trim()}`);
        });

        // 結果
        if (this.gameOver) {
            const lastMoveNum = this.moveHistory.length + 1;
            lines.push(`${String(lastMoveNum).padStart(4, ' ')} 投了`);
        }

        return lines.join('\n');
    }

    // 棋譜をダウンロード
    downloadKIF() {
        const kif = this.exportKIF();
        const blob = new Blob([kif], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const filename = `shogi_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.kif`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 対局履歴をlocalStorageに保存
    saveToHistory(winner, reason) {
        try {
            const history = JSON.parse(localStorage.getItem('shogiHistory') || '[]');

            const gameRecord = {
                id: Date.now(),
                date: new Date().toISOString(),
                gameMode: this.gameMode,
                difficulty: this.difficulty,
                winner: winner,
                reason: reason,
                moves: this.moveHistory.length,
                kif: this.exportKIF()
            };

            history.unshift(gameRecord);

            // 最大50件まで保存
            if (history.length > 50) {
                history.length = 50;
            }

            localStorage.setItem('shogiHistory', JSON.stringify(history));
        } catch (error) {
            // localStorageが使えない場合は無視
        }
    }

    // 対局履歴を取得
    static getHistory() {
        try {
            return JSON.parse(localStorage.getItem('shogiHistory') || '[]');
        } catch (error) {
            return [];
        }
    }

    // 対局履歴をクリア
    static clearHistory() {
        try {
            localStorage.removeItem('shogiHistory');
        } catch (error) {
            // localStorageが使えない場合は無視
        }
    }
}
