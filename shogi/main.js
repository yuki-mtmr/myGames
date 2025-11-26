import { ShogiGame } from './game.js';

let game = null;

// 難易度選択
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const level = btn.dataset.level;
        startGame(level);
    });
});

// 投了ボタン
document.getElementById('resign-btn').addEventListener('click', () => {
    if (game && confirm('投了しますか？')) {
        game.resign();
    }
});

// 再開ボタン
document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-setup').classList.remove('hidden');
});

function startGame(difficulty) {
    document.getElementById('game-setup').classList.add('hidden');
    game = new ShogiGame(difficulty);
}
