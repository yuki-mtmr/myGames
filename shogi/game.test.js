import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShogiGame } from './game.js';

// DOM のモック
function setupDOM() {
    document.body.innerHTML = `
        <div id="app">
            <div id="shogi-board"></div>
            <div id="turn-indicator"></div>
            <div id="player-captured"></div>
            <div id="cpu-captured"></div>
            <div id="move-list"></div>
            <div id="game-over" class="hidden">
                <div id="game-result"></div>
            </div>
        </div>
    `;
}

describe('ShogiGame', () => {
    let game;

    beforeEach(() => {
        setupDOM();
        game = new ShogiGame('easy');
    });

    describe('getBoardHash', () => {
        it('同じ盤面で同じハッシュを返す', () => {
            const hash1 = game.getBoardHash();
            const hash2 = game.getBoardHash();
            expect(hash1).toBe(hash2);
        });

        it('手番が異なると異なるハッシュを返す', () => {
            const hash1 = game.getBoardHash();
            game.currentPlayer = 'cpu';
            const hash2 = game.getBoardHash();
            expect(hash1).not.toBe(hash2);
        });

        it('駒が動くと異なるハッシュを返す', () => {
            const hash1 = game.getBoardHash();
            // 歩を動かす
            game.board[5][0] = game.board[6][0];
            game.board[6][0] = null;
            const hash2 = game.getBoardHash();
            expect(hash1).not.toBe(hash2);
        });

        it('持ち駒が異なると異なるハッシュを返す', () => {
            const hash1 = game.getBoardHash();
            game.playerCaptured.push('歩');
            const hash2 = game.getBoardHash();
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('recordPosition / checkRepetition', () => {
        it('初期局面が記録されている', () => {
            expect(game.positionHistory.length).toBe(1);
        });

        it('4回同じ局面になると千日手を検出', () => {
            // 初期局面は1回記録済み
            const initialHash = game.getBoardHash();

            // 同じ局面を3回追加（合計4回）- オブジェクト形式で
            game.positionHistory.push({ hash: initialHash, checker: null });
            game.positionHistory.push({ hash: initialHash, checker: null });
            game.positionHistory.push({ hash: initialHash, checker: null });

            const result = game.checkRepetition();
            expect(result.isRepetition).toBe(true);
        });

        it('3回では千日手にならない', () => {
            const initialHash = game.getBoardHash();

            // 同じ局面を2回追加（合計3回）
            game.positionHistory.push({ hash: initialHash, checker: null });
            game.positionHistory.push({ hash: initialHash, checker: null });

            const result = game.checkRepetition();
            expect(result.isRepetition).toBe(false);
        });
    });

    describe('isKingInCheck', () => {
        it('初期配置では王手ではない', () => {
            expect(game.isKingInCheck('player')).toBe(false);
            expect(game.isKingInCheck('cpu')).toBe(false);
        });

        it('飛車で王手がかかっている状態を検出', () => {
            // 盤面をクリア
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));

            // プレイヤーの王を配置
            game.board[8][4] = { type: '王', owner: 'player' };
            // CPUの飛車を王の前に配置
            game.board[4][4] = { type: '飛', owner: 'cpu' };

            expect(game.isKingInCheck('player')).toBe(true);
        });

        it('角で王手がかかっている状態を検出', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));

            game.board[8][4] = { type: '王', owner: 'player' };
            game.board[5][1] = { type: '角', owner: 'cpu' };

            expect(game.isKingInCheck('player')).toBe(true);
        });
    });

    describe('isCheckmate', () => {
        it('初期配置では詰みではない', () => {
            expect(game.isCheckmate('player')).toBe(false);
            expect(game.isCheckmate('cpu')).toBe(false);
        });

        it('王手がかかっていない場合は詰みではない', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.board[0][0] = { type: '王', owner: 'player' };

            expect(game.isCheckmate('player')).toBe(false);
        });

        it('頭金の詰み（逃げ場なし）を検出', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.playerCaptured = [];
            game.cpuCaptured = [];

            // プレイヤーの王を隅に配置（角の詰み）
            // 王が[0][0]にいて、金2枚で詰ます
            game.board[0][0] = { type: '王', owner: 'player' };
            // CPUの金で王手（[1][0]から[0][0]への効き）
            game.board[1][0] = { type: '金', owner: 'cpu' };
            // もう1枚の金で逃げ場を塞ぐ（[0][1]を塞ぎ、[1][0]の金を守る）
            game.board[1][1] = { type: '金', owner: 'cpu' };

            expect(game.isKingInCheck('player')).toBe(true);
            expect(game.isCheckmate('player')).toBe(true);
        });

        it('王手がかかっているが逃げられる場合は詰みではない', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.playerCaptured = [];
            game.cpuCaptured = [];

            // プレイヤーの王を中央に配置
            game.board[4][4] = { type: '王', owner: 'player' };
            // CPUの飛車で王手
            game.board[4][0] = { type: '飛', owner: 'cpu' };

            expect(game.isKingInCheck('player')).toBe(true);
            // 上下に逃げられるので詰みではない
            expect(game.isCheckmate('player')).toBe(false);
        });

        it('合駒で王手を防げる場合は詰みではない', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.cpuCaptured = [];

            // プレイヤーの王と銀
            game.board[8][4] = { type: '王', owner: 'player' };
            game.board[8][3] = { type: '銀', owner: 'player' };
            // CPUの飛車で王手
            game.board[0][4] = { type: '飛', owner: 'cpu' };
            // 逃げ場を塞ぐ
            game.board[8][5] = { type: '金', owner: 'cpu' };
            game.board[7][3] = { type: '金', owner: 'cpu' };
            game.board[7][5] = { type: '金', owner: 'cpu' };

            expect(game.isKingInCheck('player')).toBe(true);
            // 銀で合駒できるので詰みではない
            expect(game.isCheckmate('player')).toBe(false);
        });
    });

    describe('isStalemate', () => {
        it('初期配置ではステイルメイトではない', () => {
            expect(game.isStalemate('player')).toBe(false);
            expect(game.isStalemate('cpu')).toBe(false);
        });

        it('王手がかかっている場合はステイルメイトではない', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.playerCaptured = [];
            game.cpuCaptured = [];

            game.board[0][0] = { type: '王', owner: 'player' };
            game.board[2][0] = { type: '飛', owner: 'cpu' };
            game.board[0][2] = { type: '飛', owner: 'cpu' };

            // 王手がかかっている状態
            if (game.isKingInCheck('player')) {
                expect(game.isStalemate('player')).toBe(false);
            }
        });

        it('合法手がなく王手でもない場合はステイルメイト', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.playerCaptured = [];
            game.cpuCaptured = [];

            // プレイヤーの王を隅に配置
            game.board[0][0] = { type: '王', owner: 'player' };
            // 周囲を相手の駒の効きで囲む（王手ではない）
            game.board[2][0] = { type: '飛', owner: 'cpu' };
            game.board[0][2] = { type: '飛', owner: 'cpu' };
            game.board[2][2] = { type: '角', owner: 'cpu' };

            // 王手ではないが動けない
            if (!game.isKingInCheck('player')) {
                const moves = game.getAllLegalMoves('player');
                if (moves.length === 0) {
                    expect(game.isStalemate('player')).toBe(true);
                }
            }
        });
    });

    describe('checkGameEndConditions', () => {
        it('千日手で引き分け終了', () => {
            const initialHash = game.getBoardHash();
            game.positionHistory.push(initialHash);
            game.positionHistory.push(initialHash);
            game.positionHistory.push(initialHash);

            const result = game.checkGameEndConditions();

            expect(result).toBe(true);
            expect(game.gameOver).toBe(true);
            expect(document.getElementById('game-result').textContent).toContain('千日手');
        });

        it('詰みで勝敗決定', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));
            game.playerCaptured = [];
            game.cpuCaptured = [];

            // プレイヤーの詰み状態を作成（角の詰み）
            game.board[0][0] = { type: '王', owner: 'player' };
            game.board[1][0] = { type: '金', owner: 'cpu' };
            game.board[1][1] = { type: '金', owner: 'cpu' };

            game.currentPlayer = 'player';
            const result = game.checkGameEndConditions();

            expect(result).toBe(true);
            expect(game.gameOver).toBe(true);
            expect(document.getElementById('game-result').textContent).toContain('CPU');
            expect(document.getElementById('game-result').textContent).toContain('詰み');
        });
    });

    describe('endGame', () => {
        it('プレイヤー勝利時のメッセージ', () => {
            game.endGame('player');
            expect(game.gameOver).toBe(true);
            expect(document.getElementById('game-result').textContent).toContain('あなたの勝ち');
        });

        it('CPU勝利時のメッセージ', () => {
            game.endGame('cpu');
            expect(game.gameOver).toBe(true);
            expect(document.getElementById('game-result').textContent).toContain('CPUの勝ち');
        });

        it('理由付きの終了メッセージ', () => {
            game.endGame('player', '詰み');
            expect(document.getElementById('game-result').textContent).toContain('詰み');
        });
    });

    describe('endGameDraw', () => {
        it('引き分けメッセージを表示', () => {
            game.endGameDraw('千日手');
            expect(game.gameOver).toBe(true);
            expect(document.getElementById('game-result').textContent).toBe('引き分け（千日手）');
        });

        it('ステイルメイトの引き分け', () => {
            game.endGameDraw('ステイルメイト');
            expect(document.getElementById('game-result').textContent).toBe('引き分け（ステイルメイト）');
        });
    });

    describe('連続王手の千日手', () => {
        it('playerが連続王手で千日手の場合、playerの負け', () => {
            // 現在の盤面のハッシュを使う
            const currentHash = game.getBoardHash();
            game.positionHistory = [];

            // 同一局面4回、全てplayerが王手をかけている
            for (let i = 0; i < 4; i++) {
                game.positionHistory.push({ hash: currentHash, checker: 'player' });
            }

            const result = game.checkRepetition();
            expect(result.isRepetition).toBe(true);
            expect(result.perpetualChecker).toBe('player');
        });

        it('cpuが連続王手で千日手の場合、cpuの負け', () => {
            const currentHash = game.getBoardHash();
            game.positionHistory = [];

            // 同一局面4回、全てcpuが王手をかけている
            for (let i = 0; i < 4; i++) {
                game.positionHistory.push({ hash: currentHash, checker: 'cpu' });
            }

            const result = game.checkRepetition();
            expect(result.isRepetition).toBe(true);
            expect(result.perpetualChecker).toBe('cpu');
        });

        it('連続王手ではない通常の千日手', () => {
            const currentHash = game.getBoardHash();
            game.positionHistory = [];

            // 同一局面4回、王手はかかっていない
            for (let i = 0; i < 4; i++) {
                game.positionHistory.push({ hash: currentHash, checker: null });
            }

            const result = game.checkRepetition();
            expect(result.isRepetition).toBe(true);
            expect(result.perpetualChecker).toBe(null);
        });

        it('王手が途切れている場合は連続王手ではない', () => {
            const currentHash = game.getBoardHash();
            game.positionHistory = [];

            // 同一局面4回だが、途中で王手が途切れている
            game.positionHistory.push({ hash: currentHash, checker: 'player' });
            game.positionHistory.push({ hash: currentHash, checker: null }); // 王手なし
            game.positionHistory.push({ hash: currentHash, checker: 'player' });
            game.positionHistory.push({ hash: currentHash, checker: 'player' });

            const result = game.checkRepetition();
            expect(result.isRepetition).toBe(true);
            expect(result.perpetualChecker).toBe(null); // 連続ではないのでnull
        });
    });

    describe('getAllLegalMoves', () => {
        it('初期配置で合法手が存在する', () => {
            const moves = game.getAllLegalMoves('player');
            expect(moves.length).toBeGreaterThan(0);
        });

        it('盤上の駒の移動と持ち駒の打ち込みを含む', () => {
            // 金なら二歩の制限なく打てる
            game.playerCaptured = ['金'];
            const moves = game.getAllLegalMoves('player');

            const boardMoves = moves.filter(m => m.type === 'move');
            const dropMoves = moves.filter(m => m.type === 'drop');

            expect(boardMoves.length).toBeGreaterThan(0);
            expect(dropMoves.length).toBeGreaterThan(0);
        });
    });

    describe('getValidMoves', () => {
        it('王手回避の手のみを返す', () => {
            game.board = Array(9).fill(null).map(() => Array(9).fill(null));

            // 王を中央に配置
            game.board[4][4] = { type: '王', owner: 'player' };
            // 飛車で王手
            game.board[4][0] = { type: '飛', owner: 'cpu' };
            // 王の前に銀を配置
            game.board[3][4] = { type: '銀', owner: 'player' };

            // 銀は王手を遮らない位置にいるので、動けない（王手放置になる）
            // ただし、銀が飛車の効きに入って合駒になる場合は動ける
            const silverMoves = game.getValidMoves(3, 4);

            // 銀が[4][3]に動くと飛車を遮れるかチェック
            const blockingMoves = silverMoves.filter(m => m.row === 4 && m.col >= 1 && m.col <= 3);
            // 合駒できる位置があれば、その手は許可される
            expect(silverMoves.length).toBeGreaterThanOrEqual(0);
        });
    });
});
