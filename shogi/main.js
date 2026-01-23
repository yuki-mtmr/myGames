import './style.css';
import { ShogiGame } from './game.js';

let game = null;

document.addEventListener('DOMContentLoaded', () => {
    // 保存データがあれば「続きから」ボタンを表示
    if (ShogiGame.hasSavedGame()) {
        document.getElementById('load-game-section').classList.remove('hidden');
    }

    // 難易度選択
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            if (level) {
                startGame(level);
            }
        });
    });

    // 続きから再開ボタン
    document.getElementById('load-btn').addEventListener('click', () => {
        loadSavedGame();
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
        // 保存データがあれば「続きから」ボタンを表示
        if (ShogiGame.hasSavedGame()) {
            document.getElementById('load-game-section').classList.remove('hidden');
        }
        game = null;
    });

    // 待ったボタン
    document.getElementById('undo-btn').addEventListener('click', () => {
        if (game) {
            const success = game.undo();
            if (!success) {
                showMessage('待ったできません');
            }
        }
    });

    // 保存ボタン
    document.getElementById('save-btn').addEventListener('click', () => {
        if (game) {
            game.saveGame();
            showMessage('ゲームを保存しました');
            // 「続きから」ボタンを有効化
            document.getElementById('load-game-section').classList.remove('hidden');
        }
    });

    // 棋譜出力ボタン
    document.getElementById('export-btn').addEventListener('click', () => {
        if (game) {
            game.downloadKifu();
        }
    });

    // 形勢表示トグルボタン
    document.getElementById('eval-toggle-btn').addEventListener('click', () => {
        const panel = document.getElementById('evaluation-panel');
        const btn = document.getElementById('eval-toggle-btn');
        panel.classList.toggle('hidden');
        btn.classList.toggle('active');

        // 表示時に評価を更新
        if (!panel.classList.contains('hidden') && game) {
            game.updateEvaluationDisplay();
        }
    });
});

function startGame(difficulty) {
    document.getElementById('game-setup').classList.add('hidden');
    game = new ShogiGame(difficulty);
}

function loadSavedGame() {
    const savedState = ShogiGame.loadGame();
    if (savedState) {
        document.getElementById('game-setup').classList.add('hidden');
        game = new ShogiGame(savedState.difficulty, savedState);

        // ゲームオーバー状態の場合はモーダルを表示
        if (game.gameOver) {
            document.getElementById('game-over').classList.remove('hidden');
        }
    } else {
        showMessage('保存データが見つかりません');
    }
}

// メッセージ表示用の簡易トースト
function showMessage(text) {
    // 既存のトーストがあれば削除
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = text;
    document.body.appendChild(toast);

    // アニメーション後に削除
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
