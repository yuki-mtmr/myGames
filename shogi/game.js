// AI Engine imports
import { SfenConverter, MoveConverter, aiEngineManager, ENGINE_TYPES, STRENGTH_LEVELS } from './src/ai/index.js';

// 駒の位置価値テーブル（PST: Piece-Square Tables）
// CPUは上側（row=0）から下側（row=8）へ攻める
const PIECE_SQUARE_TABLES = {
    '歩': [
        [  0,   0,   0,   0,   0,   0,   0,   0,   0],
        [ 90,  95, 100, 105, 110, 105, 100,  95,  90],
        [ 70,  80,  90,  95, 100,  95,  90,  80,  70],
        [ 50,  60,  70,  75,  80,  75,  70,  60,  50],
        [ 30,  40,  50,  55,  60,  55,  50,  40,  30],
        [ 15,  20,  25,  30,  35,  30,  25,  20,  15],
        [  5,  10,  10,  15,  20,  15,  10,  10,   5],
        [  0,   0,   0,   0,   0,   0,   0,   0,   0],
        [  0,   0,   0,   0,   0,   0,   0,   0,   0]
    ],
    '香': [
        [  0,   0,   0,   0,   0,   0,   0,   0,   0],
        [ 50,  50,  50,  50,  50,  50,  50,  50,  50],
        [ 40,  40,  40,  45,  50,  45,  40,  40,  40],
        [ 30,  30,  35,  40,  45,  40,  35,  30,  30],
        [ 20,  25,  30,  35,  40,  35,  30,  25,  20],
        [ 10,  15,  20,  25,  30,  25,  20,  15,  10],
        [  5,  10,  10,  15,  20,  15,  10,  10,   5],
        [  0,   5,   5,  10,  10,  10,   5,   5,   0],
        [  0,   0,   0,   0,   0,   0,   0,   0,   0]
    ],
    '桂': [
        [  0,   0,   0,   0,   0,   0,   0,   0,   0],
        [  0,   0,   0,   0,   0,   0,   0,   0,   0],
        [ 30,  40,  50,  55,  60,  55,  50,  40,  30],
        [ 25,  35,  45,  50,  55,  50,  45,  35,  25],
        [ 20,  30,  40,  45,  50,  45,  40,  30,  20],
        [ 15,  25,  35,  40,  45,  40,  35,  25,  15],
        [ 10,  15,  20,  25,  30,  25,  20,  15,  10],
        [  5,  10,  10,  15,  20,  15,  10,  10,   5],
        [  0,   0,   0,   0,   0,   0,   0,   0,   0]
    ],
    '銀': [
        [  0,   5,  10,  15,  20,  15,  10,   5,   0],
        [ 20,  30,  40,  45,  50,  45,  40,  30,  20],
        [ 30,  40,  50,  55,  60,  55,  50,  40,  30],
        [ 35,  45,  55,  60,  65,  60,  55,  45,  35],
        [ 30,  40,  50,  55,  60,  55,  50,  40,  30],
        [ 25,  35,  45,  50,  55,  50,  45,  35,  25],
        [ 15,  25,  35,  40,  45,  40,  35,  25,  15],
        [ 10,  15,  20,  25,  30,  25,  20,  15,  10],
        [  0,   5,  10,  15,  20,  15,  10,   5,   0]
    ],
    '金': [
        [  5,  10,  15,  20,  25,  20,  15,  10,   5],
        [ 25,  35,  45,  50,  55,  50,  45,  35,  25],
        [ 35,  45,  55,  60,  65,  60,  55,  45,  35],
        [ 40,  50,  60,  65,  70,  65,  60,  50,  40],
        [ 35,  45,  55,  60,  65,  60,  55,  45,  35],
        [ 25,  35,  45,  50,  55,  50,  45,  35,  25],
        [ 15,  25,  35,  40,  45,  40,  35,  25,  15],
        [ 10,  15,  20,  30,  35,  30,  20,  15,  10],
        [  5,  10,  15,  25,  30,  25,  15,  10,   5]
    ],
    '角': [
        [ 10,  15,  20,  25,  30,  25,  20,  15,  10],
        [ 30,  40,  50,  55,  60,  55,  50,  40,  30],
        [ 40,  55,  65,  70,  75,  70,  65,  55,  40],
        [ 45,  60,  70,  80,  85,  80,  70,  60,  45],
        [ 40,  55,  65,  75,  80,  75,  65,  55,  40],
        [ 35,  50,  60,  65,  70,  65,  60,  50,  35],
        [ 25,  40,  50,  55,  60,  55,  50,  40,  25],
        [ 15,  25,  35,  40,  45,  40,  35,  25,  15],
        [ 10,  15,  20,  25,  30,  25,  20,  15,  10]
    ],
    '飛': [
        [ 20,  25,  30,  35,  40,  35,  30,  25,  20],
        [ 35,  45,  55,  60,  65,  60,  55,  45,  35],
        [ 40,  55,  65,  70,  75,  70,  65,  55,  40],
        [ 45,  60,  70,  80,  85,  80,  70,  60,  45],
        [ 45,  60,  70,  80,  85,  80,  70,  60,  45],
        [ 40,  55,  65,  70,  75,  70,  65,  55,  40],
        [ 30,  45,  55,  60,  65,  60,  55,  45,  30],
        [ 20,  30,  40,  45,  50,  45,  40,  30,  20],
        [ 15,  20,  25,  30,  35,  30,  25,  20,  15]
    ],
    '王': [
        [  0,   0,   0,   0,   0,   0,   0,   0,   0],
        [  0,   5,  10,  10,  10,  10,  10,   5,   0],
        [  5,  10,  15,  15,  15,  15,  15,  10,   5],
        [ 10,  15,  20,  25,  25,  25,  20,  15,  10],
        [ 15,  20,  25,  30,  30,  30,  25,  20,  15],
        [ 20,  25,  30,  35,  35,  35,  30,  25,  20],
        [ 30,  35,  40,  45,  45,  45,  40,  35,  30],
        [ 40,  50,  55,  60,  60,  60,  55,  50,  40],
        [ 50,  60,  65,  70,  70,  70,  65,  60,  50]
    ]
};
PIECE_SQUARE_TABLES['玉'] = PIECE_SQUARE_TABLES['王'];
PIECE_SQUARE_TABLES['!と'] = PIECE_SQUARE_TABLES['金'];
PIECE_SQUARE_TABLES['!杏'] = PIECE_SQUARE_TABLES['金'];
PIECE_SQUARE_TABLES['!圭'] = PIECE_SQUARE_TABLES['金'];
PIECE_SQUARE_TABLES['!全'] = PIECE_SQUARE_TABLES['金'];
PIECE_SQUARE_TABLES['!馬'] = PIECE_SQUARE_TABLES['角'].map(row => row.map(v => v + 20));
PIECE_SQUARE_TABLES['!竜'] = PIECE_SQUARE_TABLES['飛'].map(row => row.map(v => v + 20));

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
    constructor(difficulty, savedState = null) {
        this.difficulty = difficulty;

        if (savedState) {
            // 保存されたゲーム状態を復元
            this.board = savedState.board;
            this.currentPlayer = savedState.currentPlayer;
            this.playerCaptured = savedState.playerCaptured;
            this.cpuCaptured = savedState.cpuCaptured;
            this.moveHistory = savedState.moveHistory;
            this.positionHistory = savedState.positionHistory || [];
            this.gameOver = savedState.gameOver;
            this.stateHistory = savedState.stateHistory || [];
        } else {
            this.board = this.initializeBoard();
            this.currentPlayer = 'player';
            this.playerCaptured = [];
            this.cpuCaptured = [];
            this.moveHistory = [];
            this.positionHistory = [];
            this.gameOver = false;
            this.stateHistory = []; // 待った用の状態履歴
        }

        this.selectedPiece = null;
        this.selectedCell = null;
        this.selectedCapturedPiece = null;
        this.pendingMove = null;
        this.lastMove = savedState?.lastMove || null; // 最後の手（ハイライト用）

        // 置換表（Transposition Table）- 同一局面のキャッシュ
        this.transpositionTable = new Map();
        this.ttMaxSize = 100000;

        // 外部AIエンジン関連
        this.useExternalEngine = false;  // 外部エンジン使用フラグ
        this.aiEngine = null;            // AIEngineManager参照
        this.aiStrength = STRENGTH_LEVELS.INTERMEDIATE;
        this.cpuThinking = false;        // CPU思考中フラグ
        this.moveCount = 1;              // 手数カウント

        this.setupAudioContext();
        this.renderBoard();
        this.updateUI();
        this.setupPromotionModal();
        this.updateMoveHistory();

        // 初期局面を記録（新規ゲームの場合のみ）
        if (!savedState) {
            this.recordPosition();
        }
    }

    /**
     * 外部AIエンジンを設定
     * @param {AIEngineManager} engineManager
     * @param {string} strength - 強さ設定
     */
    setAIEngine(engineManager, strength = STRENGTH_LEVELS.INTERMEDIATE) {
        this.aiEngine = engineManager;
        this.aiStrength = strength;
        this.useExternalEngine = true;

        // エンジンマネージャーにゲーム参照を設定
        if (engineManager) {
            engineManager.setGame(this);
        }
    }

    /**
     * 内蔵AIに切り替え
     */
    useBuiltinAI() {
        this.useExternalEngine = false;
    }

    /**
     * 現在のSFEN文字列を取得
     * @returns {string}
     */
    getSfen() {
        return SfenConverter.boardToSfen(
            this.board,
            this.playerCaptured,
            this.cpuCaptured,
            this.currentPlayer,
            this.moveCount
        );
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
        board[0][0] = { type: '香', owner: 'cpu', promoted: false };
        board[0][1] = { type: '桂', owner: 'cpu', promoted: false };
        board[0][2] = { type: '銀', owner: 'cpu', promoted: false };
        board[0][3] = { type: '金', owner: 'cpu', promoted: false };
        board[0][4] = { type: '玉', owner: 'cpu', promoted: false };
        board[0][5] = { type: '金', owner: 'cpu', promoted: false };
        board[0][6] = { type: '銀', owner: 'cpu', promoted: false };
        board[0][7] = { type: '桂', owner: 'cpu', promoted: false };
        board[0][8] = { type: '香', owner: 'cpu', promoted: false };
        board[1][1] = { type: '飛', owner: 'cpu', promoted: false };
        board[1][7] = { type: '角', owner: 'cpu', promoted: false };
        for (let i = 0; i < 9; i++) {
            board[2][i] = { type: '歩', owner: 'cpu', promoted: false };
        }

        // 先手（プレイヤー）の駒配置
        for (let i = 0; i < 9; i++) {
            board[6][i] = { type: '歩', owner: 'player', promoted: false };
        }
        board[7][7] = { type: '飛', owner: 'player', promoted: false };
        board[7][1] = { type: '角', owner: 'player', promoted: false };
        board[8][0] = { type: '香', owner: 'player', promoted: false };
        board[8][1] = { type: '桂', owner: 'player', promoted: false };
        board[8][2] = { type: '銀', owner: 'player', promoted: false };
        board[8][3] = { type: '金', owner: 'player', promoted: false };
        board[8][4] = { type: '王', owner: 'player', promoted: false };
        board[8][5] = { type: '金', owner: 'player', promoted: false };
        board[8][6] = { type: '銀', owner: 'player', promoted: false };
        board[8][7] = { type: '桂', owner: 'player', promoted: false };
        board[8][8] = { type: '香', owner: 'player', promoted: false };

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

                // 最後の手をハイライト
                if (this.lastMove) {
                    if (this.lastMove.from && this.lastMove.from.row === row && this.lastMove.from.col === col) {
                        cell.classList.add('last-move-from');
                    }
                    if (this.lastMove.to && this.lastMove.to.row === row && this.lastMove.to.col === col) {
                        cell.classList.add('last-move-to');
                    }
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
        if (this.gameOver || this.currentPlayer !== 'player') return;

        const piece = this.board[row][col];

        // 持ち駒を選択している場合
        if (this.selectedCapturedPiece) {
            // バリデーションチェック
            if (this.canPlaceCapturedPiece(this.selectedCapturedPiece, row, col, 'player')) {
                this.placeCapturedPiece(row, col);
                this.selectedCapturedPiece = null;
                this.clearHighlights();

                if (!this.gameOver) {
                    setTimeout(() => this.cpuTurn(), 500);
                }
            }
            // 無効な場所をクリックした場合は何もしない（エラーメッセージなし）
            return;
        }

        // 駒を選択
        if (piece && piece.owner === 'player' && !this.selectedPiece) {
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

        if (kingRow === undefined) return false;

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

    // 盤面のハッシュを生成（千日手判定用）
    getBoardHash() {
        let hash = this.currentPlayer + '|';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    hash += `${r}${c}${piece.type}${piece.owner}|`;
                }
            }
        }
        // 持ち駒も含める
        hash += 'P:' + [...this.playerCaptured].sort().join(',');
        hash += 'C:' + [...this.cpuCaptured].sort().join(',');
        return hash;
    }

    // 局面を履歴に追加（王手情報も記録）
    recordPosition() {
        const hash = this.getBoardHash();
        // recordPositionは手を打った後に呼ばれるので、currentPlayerは次の手番
        // 直前に手を打ったプレイヤーが王手をかけているかをチェック
        const lastPlayer = this.currentPlayer === 'player' ? 'cpu' : 'player';
        const isGivingCheck = this.isKingInCheck(this.currentPlayer);

        this.positionHistory.push({
            hash: hash,
            checker: isGivingCheck ? lastPlayer : null  // 王手をかけているプレイヤー
        });
    }

    // 千日手チェック（同一局面4回で引き分け、ただし連続王手は攻め側の負け）
    // 戻り値: { isRepetition: boolean, perpetualChecker: 'player'|'cpu'|null }
    checkRepetition() {
        const currentHash = this.getBoardHash();

        // 同一局面の履歴を取得（オブジェクト形式と文字列形式の両方に対応）
        const samePositions = this.positionHistory.filter(p =>
            (typeof p === 'object' ? p.hash : p) === currentHash
        );
        const count = samePositions.length;

        if (count < 4) {
            return { isRepetition: false, perpetualChecker: null };
        }

        // 同一局面4回以上の場合、連続王手をチェック
        // 同一局面が現れた全てのインデックスを取得
        const samePositionIndices = [];
        for (let i = 0; i < this.positionHistory.length; i++) {
            const p = this.positionHistory[i];
            const h = typeof p === 'object' ? p.hash : p;
            if (h === currentHash) {
                samePositionIndices.push(i);
            }
        }

        // 最初の同一局面から現在までの間、どちらかが連続して王手をかけ続けているか確認
        if (samePositionIndices.length >= 4) {
            const startIndex = samePositionIndices[0];
            const currentIndex = this.positionHistory.length - 1;

            // playerが連続王手しているかチェック
            let playerPerpetualCheck = true;
            // cpuが連続王手しているかチェック
            let cpuPerpetualCheck = true;

            for (let i = startIndex; i <= currentIndex; i++) {
                const pos = this.positionHistory[i];
                // 古い形式（文字列のみ）の場合は連続王手判定不可
                if (typeof pos !== 'object') {
                    playerPerpetualCheck = false;
                    cpuPerpetualCheck = false;
                    break;
                }

                // checkerがnullでない場合、そのプレイヤーが王手をかけている
                if (pos.checker !== 'player') {
                    playerPerpetualCheck = false;
                }
                if (pos.checker !== 'cpu') {
                    cpuPerpetualCheck = false;
                }
            }

            if (playerPerpetualCheck) {
                return { isRepetition: true, perpetualChecker: 'player' };
            }
            if (cpuPerpetualCheck) {
                return { isRepetition: true, perpetualChecker: 'cpu' };
            }
        }

        // 連続王手ではない通常の千日手
        return { isRepetition: true, perpetualChecker: null };
    }

    // 詰み判定（王手がかかっていて、合法手がない）
    isCheckmate(player) {
        if (!this.isKingInCheck(player)) {
            return false;
        }
        const legalMoves = this.getAllLegalMoves(player);
        return legalMoves.length === 0;
    }

    // ステイルメイト判定（王手ではないが、合法手がない）
    isStalemate(player) {
        if (this.isKingInCheck(player)) {
            return false;
        }
        const legalMoves = this.getAllLegalMoves(player);
        return legalMoves.length === 0;
    }

    // ゲーム終了条件をチェック
    checkGameEndConditions() {
        // 千日手チェック（連続王手の千日手も含む）
        const repetitionResult = this.checkRepetition();
        if (repetitionResult.isRepetition) {
            if (repetitionResult.perpetualChecker) {
                // 連続王手の千日手: 王手をかけ続けた側の負け
                const winner = repetitionResult.perpetualChecker === 'player' ? 'cpu' : 'player';
                this.endGame(winner, '連続王手の千日手');
            } else {
                // 通常の千日手: 引き分け
                this.endGameDraw('千日手');
            }
            return true;
        }

        // 現在のプレイヤーの詰み/ステイルメイトをチェック
        if (this.isCheckmate(this.currentPlayer)) {
            const winner = this.currentPlayer === 'player' ? 'cpu' : 'player';
            this.endGame(winner, '詰み');
            return true;
        }

        if (this.isStalemate(this.currentPlayer)) {
            this.endGameDraw('ステイルメイト');
            return true;
        }

        return false;
    }

    // 引き分け終了
    endGameDraw(reason) {
        this.gameOver = true;
        document.getElementById('game-result').textContent = `引き分け（${reason}）`;
        document.getElementById('game-over').classList.remove('hidden');
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

        // 打ち歩詰めチェック（完全版）
        // 歩を打って相手が詰みになる場合のみ禁止
        // 玉が逃げられる、合い駒ができる、打った歩を取れる場合は許可
        if (pieceType === '歩') {
            if (this.isUchifuzume(pieceType, row, col, player)) {
                return false;
            }
        }

        // 王手放置チェック（仮想的に配置してチェック）
        this.board[row][col] = { type: pieceType, owner: player, promoted: false };
        const isCheck = this.isKingInCheck(player);
        this.board[row][col] = null; // 元に戻す

        if (isCheck) return false;

        return true;
    }

    // 打ち歩詰め判定
    // 歩を打った結果、相手玉が詰みになる場合はtrue（禁止手）を返す
    isUchifuzume(pieceType, row, col, player) {
        const opponent = player === 'player' ? 'cpu' : 'player';

        // 歩を打った位置の前方に相手玉がいるかチェック
        const frontRow = player === 'player' ? row - 1 : row + 1;
        if (frontRow < 0 || frontRow >= 9) {
            return false; // 盤外なので打ち歩詰めではない
        }

        const frontPiece = this.board[frontRow][col];
        if (!frontPiece || frontPiece.owner !== opponent ||
            (frontPiece.type !== '玉' && frontPiece.type !== '王')) {
            return false; // 前方に相手玉がいないので打ち歩詰めではない
        }

        // ここから打ち歩詰め判定
        // 仮想的に歩を配置
        this.board[row][col] = { type: pieceType, owner: player, promoted: false };

        // 相手玉に王手がかかっているか確認（歩を打った直後）
        if (!this.isKingInCheck(opponent)) {
            // 王手でないなら打ち歩詰めではない
            this.board[row][col] = null;
            return false;
        }

        // 相手に合法手があるかチェック（詰みかどうか）
        const opponentHasLegalMove = this.hasAnyLegalMove(opponent);

        // 元に戻す
        this.board[row][col] = null;

        // 相手に合法手がない = 詰み = 打ち歩詰め（禁止）
        return !opponentHasLegalMove;
    }

    // 指定プレイヤーに合法手が1つでもあるかをチェック
    // getAllLegalMovesより効率的（1つ見つかれば終了）
    hasAnyLegalMove(player) {
        // 1. 盤上の駒の移動をチェック
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === player) {
                    const validMoves = this.getValidMoves(r, c);
                    if (validMoves.length > 0) {
                        return true; // 合法手が1つでもあれば即座にtrue
                    }
                }
            }
        }

        // 2. 持ち駒の打ち込みをチェック
        const captured = player === 'player' ? this.playerCaptured : this.cpuCaptured;
        const uniquePieces = [...new Set(captured)];

        for (const pt of uniquePieces) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    // 打ち歩詰め判定中の再帰を防ぐため、打ち歩詰めチェックなしで判定
                    if (this.canPlaceCapturedPieceWithoutUchifuzume(pt, r, c, player)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // 打ち歩詰めチェックを除いた持ち駒配置チェック（再帰防止用）
    canPlaceCapturedPieceWithoutUchifuzume(pieceType, row, col, player) {
        // 既に駒がある場所には置けない
        if (this.board[row][col]) {
            return false;
        }

        // 二歩チェック
        if (pieceType === '歩') {
            for (let r = 0; r < 9; r++) {
                const piece = this.board[r][col];
                if (piece && piece.owner === player && piece.type === '歩' && !piece.promoted) {
                    return false;
                }
            }
        }

        // 行き所のない駒チェック
        if (player === 'player') {
            if (pieceType === '歩' && row === 0) return false;
            if (pieceType === '香' && row === 0) return false;
            if (pieceType === '桂' && (row === 0 || row === 1)) return false;
        } else {
            if (pieceType === '歩' && row === 8) return false;
            if (pieceType === '香' && row === 8) return false;
            if (pieceType === '桂' && (row === 8 || row === 7)) return false;
        }

        // 王手放置チェック
        this.board[row][col] = { type: pieceType, owner: player, promoted: false };
        const isCheck = this.isKingInCheck(player);
        this.board[row][col] = null;

        if (isCheck) return false;

        return true;
    }

    placeCapturedPiece(row, col) {
        const pieceType = this.selectedCapturedPiece;

        // バリデーションチェック（無効な場合は何もしない）
        if (!this.canPlaceCapturedPiece(pieceType, row, col, 'player')) {
            return;
        }

        // 待った用に状態を保存
        this.saveStateSnapshot();

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

        // 効果音を再生
        this.playMoveSound();

        // 指し手を記録
        this.recordMove(`${pieceType}打`, row, col, 'player');

        // 最後の手を記録（ハイライト用）- 打ち駒は移動元なし
        this.lastMove = {
            from: null,
            to: { row: row, col: col }
        };

        this.currentPlayer = 'cpu';

        // 局面を記録
        this.recordPosition();

        this.renderBoard();
        this.updateUI();

        // ゲーム終了条件をチェック
        this.checkGameEndConditions();
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

        // 待った用に状態を保存（プレイヤーの手の場合のみ）
        const { fromRow, fromCol, toRow, toCol } = this.pendingMove;
        const piece = this.board[fromRow][fromCol];
        if (piece.owner === 'player') {
            this.saveStateSnapshot();
        }

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

        // 最後の手を記録（ハイライト用）
        this.lastMove = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };

        this.pendingMove = null;
        this.currentPlayer = this.currentPlayer === 'player' ? 'cpu' : 'player';

        // 局面を記録
        this.recordPosition();

        this.renderBoard();
        this.updateUI();

        // ゲーム終了条件をチェック
        if (this.checkGameEndConditions()) {
            return;
        }

        if (!this.gameOver && this.currentPlayer === 'cpu') {
            setTimeout(() => this.cpuTurn(), 500);
        }
    }

    makeMove(fromRow, fromCol, toRow, toCol, promote = false) {
        const piece = this.board[fromRow][fromCol];

        // 待った用に状態を保存（CPUの手の場合）
        if (piece.owner === 'cpu') {
            this.saveStateSnapshot();
        }

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

        // 最後の手を記録（ハイライト用）
        this.lastMove = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };

        this.currentPlayer = this.currentPlayer === 'player' ? 'cpu' : 'player';

        // 局面を記録
        this.recordPosition();

        this.renderBoard();
        this.updateUI();

        // ゲーム終了条件をチェック
        this.checkGameEndConditions();
    }

    async cpuTurn() {
        if (this.gameOver) return;

        this.cpuThinking = true;
        this.updateThinkingIndicator(true);

        try {
            // 外部エンジンを使用する場合
            if (this.useExternalEngine && this.aiEngine?.currentEngine?.isReady()) {
                await this.cpuTurnWithExternalEngine();
            } else {
                // 内蔵AIを使用
                this.cpuTurnWithBuiltinAI();
            }
        } catch (error) {
            console.warn('External engine error, falling back to builtin AI:', error);
            // フォールバック：内蔵AIを使用
            this.cpuTurnWithBuiltinAI();
        } finally {
            this.cpuThinking = false;
            this.updateThinkingIndicator(false);
        }
    }

    /**
     * 外部エンジンを使ってCPUの手を決定
     * @private
     */
    async cpuTurnWithExternalEngine() {
        const legalMoves = this.getAllLegalMoves('cpu');

        if (legalMoves.length === 0) {
            this.endGame('player');
            return;
        }

        try {
            // 現在の局面をSFEN形式で取得
            const sfen = this.getSfen();

            // エンジンから最善手を取得
            const result = await this.aiEngine.getBestMove(sfen);

            if (!result || !result.move) {
                throw new Error('No valid move returned from engine');
            }

            // USI形式からinternal形式に変換
            const move = MoveConverter.fromUsi(result.move, 'cpu');

            // 指し手を検証
            const isValid = this.validateMove(move, legalMoves);

            if (!isValid) {
                console.warn('Invalid move from engine:', result.move);
                throw new Error('Invalid move from engine');
            }

            // 手を実行
            this.executeAIMove(move);

        } catch (error) {
            console.error('External engine failed:', error);
            throw error;
        }
    }

    /**
     * 内蔵AIでCPUの手を決定
     * @private
     */
    cpuTurnWithBuiltinAI() {
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
            // 駒を取れる手があれば優先、なければランダム
            // 持ち駒を使う手も考慮（ランダムに混ぜる）
            const captureMoves = legalMoves.filter(m => m.type === 'move' && this.board[m.toRow][m.toCol]);

            if (captureMoves.length > 0 && Math.random() < 0.7) {
                selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
            } else {
                selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            }
        } else {
            // Hard: Minimax法（深さ4）+ α-β枝刈り + 置換表 + Move Ordering
            const depth = 4;
            let bestScore = -Infinity;
            let bestMoves = [];

            // 探索開始時に置換表をクリア
            this.transpositionTable.clear();

            // Move Orderingで手を並び替え
            const orderedMoves = this.orderMoves(legalMoves, 'cpu');

            let alpha = -Infinity;
            const beta = Infinity;

            for (const move of orderedMoves) {
                const undo = this.applyVirtualMove(move, 'cpu');
                const score = this.minimax(depth - 1, alpha, beta, false);
                this.undoVirtualMove(undo);

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [move];
                    alpha = Math.max(alpha, score);
                } else if (score === bestScore) {
                    bestMoves.push(move);
                }
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

    /**
     * 指し手を検証
     * @private
     */
    validateMove(move, legalMoves) {
        if (move.type === 'drop') {
            return legalMoves.some(m =>
                m.type === 'drop' &&
                m.toRow === move.toRow &&
                m.toCol === move.toCol &&
                (m.piece === move.piece || m.pieceType === move.pieceType)
            );
        } else {
            return legalMoves.some(m =>
                m.type === 'move' &&
                m.fromRow === move.fromRow &&
                m.fromCol === move.fromCol &&
                m.toRow === move.toRow &&
                m.toCol === move.toCol
            );
        }
    }

    /**
     * AI（外部エンジン）の指し手を実行
     * @private
     */
    executeAIMove(move) {
        if (move.type === 'move') {
            this.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promote);
        } else {
            // 持ち駒を打つ
            this.executeCpuDrop({
                type: 'drop',
                piece: move.piece || move.pieceType,
                toRow: move.toRow,
                toCol: move.toCol
            });
        }
    }

    /**
     * 思考中表示を更新
     * @private
     */
    updateThinkingIndicator(thinking) {
        const indicator = document.getElementById('turn-indicator');
        if (indicator) {
            if (thinking) {
                indicator.textContent = 'CPU思考中...';
                indicator.classList.add('thinking');
            } else {
                this.updateUI();
            }
        }
    }

    // CPUが持ち駒を打つ処理
    executeCpuDrop(move) {
        // 待った用に状態を保存
        this.saveStateSnapshot();

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

        // 最後の手を記録（ハイライト用）- 打ち駒は移動元なし
        this.lastMove = {
            from: null,
            to: { row: move.toRow, col: move.toCol }
        };

        this.currentPlayer = 'player';

        // 局面を記録
        this.recordPosition();

        this.renderBoard();
        this.updateUI();

        // ゲーム終了条件をチェック
        this.checkGameEndConditions();
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

    // 置換表用のハッシュ生成（簡易版）
    getPositionHash() {
        let hash = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const p = this.board[r][c];
                if (p) hash += `${r}${c}${p.type}${p.owner[0]}`;
            }
        }
        hash += this.playerCaptured.sort().join('') + this.cpuCaptured.sort().join('');
        return hash;
    }

    // 手の並び替え（Move Ordering）- α-β枝刈りの効率化
    orderMoves(moves, player) {
        const pieceValues = {
            '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000,
            '王': 100000, '玉': 100000,
            '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1000, '!竜': 1200
        };

        return moves.map(move => {
            let score = 0;

            if (move.type === 'move') {
                const target = this.board[move.toRow][move.toCol];
                // 1. 駒を取る手を優先（MVV-LVA: Most Valuable Victim - Least Valuable Attacker）
                if (target) {
                    const victimValue = pieceValues[target.type] || 0;
                    const attackerValue = pieceValues[move.piece.type] || 0;
                    score += 10000 + victimValue * 10 - attackerValue;
                }

                // 2. 成りを優先
                const piece = move.piece;
                if (piece && !piece.promoted && PIECES[piece.type]?.canPromote) {
                    if ((player === 'cpu' && move.toRow >= 6) ||
                        (player === 'player' && move.toRow <= 2)) {
                        score += 500;
                    }
                }

                // 3. 中央への移動を優先
                const centerDistance = Math.abs(move.toCol - 4) + Math.abs(move.toRow - 4);
                score += (8 - centerDistance) * 10;

                // 4. 前進を優先
                if (player === 'cpu') {
                    score += move.toRow * 5;
                } else {
                    score += (8 - move.toRow) * 5;
                }
            } else {
                // 打ち駒: 価値の高い駒を優先、中央を優先
                score += (pieceValues[move.piece] || 0) / 10;
                const centerDistance = Math.abs(move.toCol - 4) + Math.abs(move.toRow - 4);
                score += (8 - centerDistance) * 5;
            }

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(item => item.move);
    }

    // Minimax法（Alpha-Beta法 + 置換表 + Move Ordering）
    minimax(depth, alpha, beta, isMaximizing) {
        // 置換表のルックアップ
        const hash = this.getPositionHash();
        const ttEntry = this.transpositionTable.get(hash);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 'exact') return ttEntry.score;
            if (ttEntry.flag === 'lower' && ttEntry.score > alpha) alpha = ttEntry.score;
            if (ttEntry.flag === 'upper' && ttEntry.score < beta) beta = ttEntry.score;
            if (alpha >= beta) return ttEntry.score;
        }

        if (depth === 0) {
            return this.evaluateBoard('cpu');
        }

        const player = isMaximizing ? 'cpu' : 'player';
        let legalMoves = this.getAllLegalMoves(player);

        if (legalMoves.length === 0) {
            // 詰み
            return isMaximizing ? -1000000 : 1000000;
        }

        // Move Ordering: 良い手を先に探索
        legalMoves = this.orderMoves(legalMoves, player);

        let bestScore;
        let flag = 'exact';

        if (isMaximizing) {
            bestScore = -Infinity;
            for (const move of legalMoves) {
                const undo = this.applyVirtualMove(move, player);
                const evalScore = this.minimax(depth - 1, alpha, beta, false);
                this.undoVirtualMove(undo);

                if (evalScore > bestScore) {
                    bestScore = evalScore;
                }
                if (bestScore > alpha) {
                    alpha = bestScore;
                }
                if (beta <= alpha) {
                    flag = 'lower';
                    break;
                }
            }
        } else {
            bestScore = Infinity;
            for (const move of legalMoves) {
                const undo = this.applyVirtualMove(move, player);
                const evalScore = this.minimax(depth - 1, alpha, beta, true);
                this.undoVirtualMove(undo);

                if (evalScore < bestScore) {
                    bestScore = evalScore;
                }
                if (bestScore < beta) {
                    beta = bestScore;
                }
                if (beta <= alpha) {
                    flag = 'upper';
                    break;
                }
            }
        }

        // 置換表に保存
        if (this.transpositionTable.size >= this.ttMaxSize) {
            // 古いエントリを削除（簡易的に全クリア）
            this.transpositionTable.clear();
        }
        this.transpositionTable.set(hash, { depth, score: bestScore, flag });

        return bestScore;
    }

    // 盤面評価関数（CPU視点）- PST（駒位置価値テーブル）使用
    evaluateBoard(player) {
        const pieceValues = {
            '歩': 100, '香': 300, '桂': 400, '銀': 500, '金': 600, '角': 800, '飛': 1000,
            '王': 100000, '玉': 100000,
            '!と': 700, '!杏': 700, '!圭': 700, '!全': 700, '!馬': 1000, '!竜': 1200
        };

        let score = 0;

        // 盤上の駒の評価（PST使用）
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    // 駒の基本価値
                    let value = pieceValues[piece.type] || 0;

                    // PST（位置価値）を加算
                    const pst = PIECE_SQUARE_TABLES[piece.type];
                    if (pst) {
                        if (piece.owner === 'cpu') {
                            // CPUは上から下へ攻める（そのままのテーブル）
                            value += pst[r][c];
                        } else {
                            // プレイヤーは下から上へ攻める（テーブルを反転）
                            value += pst[8 - r][8 - c];
                        }
                    }

                    if (piece.owner === 'cpu') {
                        score += value;
                    } else {
                        score -= value;
                    }
                }
            }
        }

        // 持ち駒の評価（打てる柔軟性があるため価値を上乗せ）
        for (const p of this.cpuCaptured) {
            score += (pieceValues[p] || 0) * 1.15;
        }
        for (const p of this.playerCaptured) {
            score -= (pieceValues[p] || 0) * 1.15;
        }

        // 王手がかかっているかどうかの評価
        if (this.isKingInCheck('player')) {
            score += 300;
        }
        if (this.isKingInCheck('cpu')) {
            score -= 300;
        }

        // 王の安全性評価（周囲に味方の駒があるか）
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && (piece.type === '王' || piece.type === '玉')) {
                    let defenders = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                                const neighbor = this.board[nr][nc];
                                if (neighbor && neighbor.owner === piece.owner) {
                                    defenders++;
                                }
                            }
                        }
                    }
                    const safetyBonus = defenders * 20;
                    if (piece.owner === 'cpu') {
                        score += safetyBonus;
                    } else {
                        score -= safetyBonus;
                    }
                }
            }
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
        document.getElementById('turn-indicator').textContent =
            this.currentPlayer === 'player' ? 'あなたの手番です' : 'CPUが考えています...';

        // 評価表示を更新
        this.updateEvaluationDisplay();

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

    endGame(winner, reason = '') {
        this.gameOver = true;
        let resultText = winner === 'player' ? 'あなたの勝ちです！' : 'CPUの勝ちです';
        if (reason) {
            resultText += `（${reason}）`;
        }
        document.getElementById('game-result').textContent = resultText;
        document.getElementById('game-over').classList.remove('hidden');
    }

    resign() {
        this.endGame('cpu');
    }

    // 現在の状態をスナップショットとして保存（待った用）
    saveStateSnapshot() {
        const snapshot = {
            board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
            currentPlayer: this.currentPlayer,
            playerCaptured: [...this.playerCaptured],
            cpuCaptured: [...this.cpuCaptured],
            moveHistory: this.moveHistory.map(m => ({ ...m })),
            positionHistory: this.positionHistory.map(p =>
                typeof p === 'object' ? { ...p } : p
            ),
            gameOver: this.gameOver
        };
        this.stateHistory.push(snapshot);

        // メモリ節約のため、最大100手分まで保持
        if (this.stateHistory.length > 100) {
            this.stateHistory.shift();
        }
    }

    // 待った（1手戻る）- プレイヤーとCPUの両方の手を戻す
    undo() {
        // ゲーム終了後は待った不可
        if (this.gameOver) return false;

        // CPUの手番中は待った不可
        if (this.currentPlayer === 'cpu') return false;

        // 最低2手（プレイヤー+CPU）戻す必要がある
        if (this.stateHistory.length < 2) return false;

        // 2手分戻す（直前のCPUの手と、その前のプレイヤーの手）
        this.stateHistory.pop(); // CPUの手後の状態
        const previousState = this.stateHistory.pop(); // プレイヤーの手後の状態

        if (!previousState) return false;

        // 状態を復元
        this.board = previousState.board;
        this.currentPlayer = previousState.currentPlayer;
        this.playerCaptured = previousState.playerCaptured;
        this.cpuCaptured = previousState.cpuCaptured;
        this.moveHistory = previousState.moveHistory;
        this.positionHistory = previousState.positionHistory;
        this.gameOver = previousState.gameOver;

        // 選択状態をリセット
        this.selectedPiece = null;
        this.selectedCell = null;
        this.selectedCapturedPiece = null;
        this.pendingMove = null;

        // UI更新
        this.clearHighlights();
        this.renderBoard();
        this.updateUI();
        this.updateMoveHistory();

        return true;
    }

    // ゲーム状態を取得（保存用）
    getGameState() {
        return {
            difficulty: this.difficulty,
            board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
            currentPlayer: this.currentPlayer,
            playerCaptured: [...this.playerCaptured],
            cpuCaptured: [...this.cpuCaptured],
            moveHistory: this.moveHistory.map(m => ({ ...m })),
            positionHistory: this.positionHistory.map(p =>
                typeof p === 'object' ? { ...p } : p
            ),
            gameOver: this.gameOver,
            lastMove: this.lastMove ? { ...this.lastMove } : null,
            stateHistory: this.stateHistory.map(s => ({
                board: s.board.map(row => row.map(cell => cell ? { ...cell } : null)),
                currentPlayer: s.currentPlayer,
                playerCaptured: [...s.playerCaptured],
                cpuCaptured: [...s.cpuCaptured],
                moveHistory: s.moveHistory.map(m => ({ ...m })),
                positionHistory: s.positionHistory.map(p =>
                    typeof p === 'object' ? { ...p } : p
                ),
                gameOver: s.gameOver
            })),
            savedAt: new Date().toISOString()
        };
    }

    // ゲームをlocalStorageに保存
    saveGame() {
        const state = this.getGameState();
        localStorage.setItem('shogiGameSave', JSON.stringify(state));
        return true;
    }

    // localStorageから保存データを読み込み
    static loadGame() {
        const savedData = localStorage.getItem('shogiGameSave');
        if (!savedData) return null;

        try {
            return JSON.parse(savedData);
        } catch (e) {
            console.error('Failed to parse saved game:', e);
            return null;
        }
    }

    // 保存データが存在するかチェック
    static hasSavedGame() {
        return localStorage.getItem('shogiGameSave') !== null;
    }

    // 保存データを削除
    static clearSavedGame() {
        localStorage.removeItem('shogiGameSave');
    }

    // 棋譜をテキスト形式で出力
    exportKifu() {
        const difficultyNames = {
            'easy': '初級',
            'medium': '中級',
            'hard': '上級'
        };

        const now = new Date();
        const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

        let kifu = '# 将棋棋譜\n';
        kifu += `対局日: ${dateStr}\n`;
        kifu += `先手: あなた\n`;
        kifu += `後手: CPU（${difficultyNames[this.difficulty] || this.difficulty}）\n`;
        kifu += '\n';
        kifu += '---棋譜---\n';

        this.moveHistory.forEach(move => {
            const playerMark = move.player === 'player' ? '☗' : '☖';
            kifu += `${move.number}. ${playerMark}${move.text.trim()}\n`;
        });

        if (this.gameOver) {
            kifu += '\n';
            const resultEl = document.getElementById('game-result');
            if (resultEl) {
                kifu += `結果: ${resultEl.textContent}\n`;
            }
        } else {
            kifu += '\n対局中\n';
        }

        return kifu;
    }

    // 棋譜をダウンロード
    downloadKifu() {
        const kifu = this.exportKifu();
        const blob = new Blob([kifu], { type: 'text/plain; charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const filename = `shogi_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.txt`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // プレイヤー視点の評価を取得
    // 戻り値: { score, percentage, advantage }
    getPlayerEvaluation() {
        const cpuScore = this.evaluateBoard('cpu');
        const playerScore = -cpuScore; // 反転（正=先手有利）

        // tanh関数でパーセンテージに変換
        const scaledScore = Math.tanh(playerScore / 2000);
        const percentage = Math.round((scaledScore + 1) * 50);

        let advantage = 'even';
        if (playerScore > 100) advantage = 'player';
        else if (playerScore < -100) advantage = 'cpu';

        return { score: playerScore, percentage, advantage };
    }

    // 評価表示を更新
    updateEvaluationDisplay() {
        const evalBarFill = document.getElementById('eval-bar-fill');
        const evalPercentage = document.getElementById('eval-percentage');
        const evalScore = document.getElementById('eval-score');

        if (!evalBarFill) return;

        const evaluation = this.getPlayerEvaluation();

        // バー幅を更新
        evalBarFill.style.width = `${evaluation.percentage}%`;

        // パーセンテージ表示
        const cpuPct = 100 - evaluation.percentage;
        evalPercentage.textContent = `${evaluation.percentage}% - ${cpuPct}%`;

        // スコア表示
        const scoreText = evaluation.score >= 0
            ? `+${Math.abs(evaluation.score)}`
            : `-${Math.abs(evaluation.score)}`;
        evalScore.textContent = scoreText;

        // スタイル更新
        evalScore.className = `eval-score ${evaluation.advantage}-advantage`;
    }
}
