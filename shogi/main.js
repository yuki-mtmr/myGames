import './style.css';
import { ShogiGame } from './game.js';

let game = null;

document.addEventListener('DOMContentLoaded', () => {
    // 対人対戦モード選択
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode === 'pvp') {
                startGame(null, 'pvp');
            }
        });
    });

    // CPU難易度選択
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            if (level) {
                startGame(level, 'cpu');
            }
        });
    });

    // 待ったボタン
    document.getElementById('undo-btn').addEventListener('click', () => {
        if (game && !game.gameOver) {
            game.undo();
        }
    });

    // 棋譜エクスポートボタン
    document.getElementById('export-kif-btn').addEventListener('click', () => {
        if (game && game.moveHistory.length > 0) {
            game.downloadKIF();
        }
    });

    // 投了ボタン - モーダルを表示
    document.getElementById('resign-btn').addEventListener('click', () => {
        if (game && !game.gameOver) {
            document.getElementById('resign-confirm').classList.remove('hidden');
        }
    });

    // 投了確認 - はい
    document.getElementById('resign-yes-btn').addEventListener('click', () => {
        document.getElementById('resign-confirm').classList.add('hidden');
        if (game) {
            game.resign();
        }
    });

    // 投了確認 - いいえ
    document.getElementById('resign-no-btn').addEventListener('click', () => {
        document.getElementById('resign-confirm').classList.add('hidden');
    });

    // 再開ボタン
    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('game-setup').classList.remove('hidden');
        game = null;
    });
});

function startGame(difficulty, gameMode = 'cpu') {
    document.getElementById('game-setup').classList.add('hidden');
    game = new ShogiGame(difficulty, gameMode);
}
