import { describe, it, expect, beforeEach } from 'vitest';
import { ShogiGame } from './game.js';

// DOM のモック(game.test.js と同一構成)
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

describe('sfenHistory(解析用のSFEN列ライブ記録)', () => {
    let game;

    beforeEach(() => {
        setupDOM();
        game = new ShogiGame('easy');
    });

    it('新規ゲームでは初期局面のSFENが1件記録されている', () => {
        expect(game.sfenHistory).toHaveLength(1);
        expect(game.sfenHistory[0]).toBe(game.getSfen());
    });

    it('recordPosition のたびに現局面のSFENが追記される', () => {
        // 1手目をシミュレート: 盤面変更 + 手番切替 + recordPosition
        game.board[5][6] = game.board[6][6];
        game.board[6][6] = null;
        game.currentPlayer = 'cpu';
        game.recordPosition();

        expect(game.sfenHistory).toHaveLength(2);
        expect(game.sfenHistory[1]).toBe(game.getSfen());
        expect(game.sfenHistory[1]).not.toBe(game.sfenHistory[0]);
    });

    it('待った(undo)で sfenHistory も巻き戻る', () => {
        const initialSfen = game.sfenHistory[0];

        // プレイヤーの手(スナップショット→着手)
        game.saveStateSnapshot();
        game.board[5][6] = game.board[6][6];
        game.board[6][6] = null;
        game.currentPlayer = 'cpu';
        game.recordPosition();

        // CPUの手
        game.saveStateSnapshot();
        game.board[3][2] = game.board[2][2];
        game.board[2][2] = null;
        game.currentPlayer = 'player';
        game.recordPosition();

        expect(game.sfenHistory).toHaveLength(3);

        expect(game.undo()).toBe(true);
        expect(game.sfenHistory).toHaveLength(1);
        expect(game.sfenHistory[0]).toBe(initialSfen);
    });

    it('保存→復元で sfenHistory が維持される', () => {
        game.board[5][6] = game.board[6][6];
        game.board[6][6] = null;
        game.currentPlayer = 'cpu';
        game.recordPosition();

        const state = game.getGameState();
        const restored = new ShogiGame(state.difficulty, state);

        expect(restored.sfenHistory).toEqual(game.sfenHistory);
    });

    it('旧形式セーブ(sfenHistory無し)から復元しても壊れない', () => {
        const state = game.getGameState();
        delete state.sfenHistory;
        const restored = new ShogiGame(state.difficulty, state);
        expect(Array.isArray(restored.sfenHistory)).toBe(true);
    });
});
