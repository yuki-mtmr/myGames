import './style.css';
import { ShogiGame } from './game.js';
import {
    aiEngineManager,
    browserCapabilities,
    ENGINE_TYPES,
    STRENGTH_LEVELS
} from './src/ai/index.js';

let game = null;
let engineInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // ブラウザ互換性チェックとUI初期化
    initializeEngineUI();

    // 保存データがあれば「続きから」ボタンを表示
    if (ShogiGame.hasSavedGame()) {
        document.getElementById('load-game-section').classList.remove('hidden');
    }

    // 対局開始ボタン
    document.getElementById('start-btn').addEventListener('click', () => {
        startGame();
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

    // AIエンジン選択
    document.querySelectorAll('.engine-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // AI強さ選択
    document.querySelectorAll('.strength-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.strength-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
});

/**
 * AIエンジンUIを初期化
 */
function initializeEngineUI() {
    const caps = browserCapabilities.check();
    const engineSelect = document.getElementById('engine-select');
    const compatWarning = document.getElementById('compat-warning');

    if (!engineSelect) return;

    // 利用可能なエンジンに基づいてUIを更新
    const yaneuraouBtn = document.querySelector('.engine-btn[data-engine="yaneuraou"]');

    if (yaneuraouBtn) {
        if (!caps.canUseYaneuraOu) {
            yaneuraouBtn.disabled = true;
            yaneuraouBtn.classList.add('disabled');
            yaneuraouBtn.title = caps.fallbackReason || 'お使いのブラウザでは利用できません';
        }
    }

    // 互換性警告の表示
    if (compatWarning && !caps.canUseYaneuraOu) {
        compatWarning.classList.remove('hidden');
        const warningText = compatWarning.querySelector('.warning-text');
        if (warningText) {
            warningText.textContent = browserCapabilities.getRecommendation() ||
                'やねうら王AIを使用するにはChrome 91以上が必要です。';
        }
    }

    // デフォルト選択
    const defaultEngine = caps.canUseYaneuraOu ? 'auto' : 'builtin';
    const defaultBtn = document.querySelector(`.engine-btn[data-engine="${defaultEngine}"]`);
    if (defaultBtn) {
        defaultBtn.classList.add('selected');
    }

    // 強さのデフォルト選択
    const defaultStrength = document.querySelector('.strength-btn[data-strength="intermediate"]');
    if (defaultStrength) {
        defaultStrength.classList.add('selected');
    }
}

/**
 * 選択されたエンジンタイプを取得
 */
function getSelectedEngine() {
    const selected = document.querySelector('.engine-btn.selected');
    return selected?.dataset.engine || 'auto';
}

/**
 * 選択された強さを取得
 */
function getSelectedStrength() {
    const selected = document.querySelector('.strength-btn.selected');
    return selected?.dataset.strength || 'intermediate';
}

/**
 * 強さ設定を内蔵AI用の難易度に変換
 */
function strengthToDifficulty(strength) {
    switch (strength) {
        case 'beginner': return 'easy';
        case 'intermediate': return 'easy';
        case 'advanced': return 'medium';
        case 'expert': return 'hard';
        default: return 'medium';
    }
}

/**
 * 強さ設定の日本語名を取得
 */
function getStrengthName(strength) {
    switch (strength) {
        case 'beginner': return '入門';
        case 'intermediate': return '初級';
        case 'advanced': return '中級';
        case 'expert': return '上級';
        default: return '初級';
    }
}

/**
 * ゲームを開始
 */
async function startGame() {
    document.getElementById('game-setup').classList.add('hidden');

    // エンジン設定を取得
    const engineType = getSelectedEngine();
    const strength = getSelectedStrength();
    const difficulty = strengthToDifficulty(strength);

    // ゲームインスタンスを作成
    game = new ShogiGame(difficulty);

    // 外部エンジンの初期化（必要な場合）
    if (engineType !== 'builtin') {
        try {
            showMessage('AIエンジンを初期化中...');

            // エンジンタイプを設定
            aiEngineManager.setPreferredEngine(
                engineType === 'yaneuraou' ? ENGINE_TYPES.YANEURAOU :
                engineType === 'auto' ? ENGINE_TYPES.AUTO : ENGINE_TYPES.BUILTIN
            );

            // 強さを設定
            aiEngineManager.setStrength(
                strength === 'beginner' ? STRENGTH_LEVELS.BEGINNER :
                strength === 'advanced' ? STRENGTH_LEVELS.ADVANCED :
                strength === 'expert' ? STRENGTH_LEVELS.EXPERT :
                STRENGTH_LEVELS.INTERMEDIATE
            );

            // 初期化
            const result = await aiEngineManager.initialize();

            if (result.success) {
                game.setAIEngine(aiEngineManager, aiEngineManager.strength);

                if (result.fallback) {
                    showMessage(`内蔵AI（${getStrengthName(strength)}）で対局開始`);
                } else {
                    showMessage(`${aiEngineManager.currentEngine.getName()}（${getStrengthName(strength)}）で対局開始`);
                }
            } else {
                showMessage(`内蔵AI（${getStrengthName(strength)}）で対局開始`);
            }

            engineInitialized = true;

        } catch (error) {
            console.error('Engine initialization failed:', error);
            showMessage(`内蔵AI（${getStrengthName(strength)}）で対局開始`);
        }
    } else {
        // 内蔵AI使用
        game.useBuiltinAI();
        showMessage(`内蔵AI（${getStrengthName(strength)}）で対局開始`);
    }
}

/**
 * 保存されたゲームを読み込み
 */
async function loadSavedGame() {
    const savedState = ShogiGame.loadGame();
    if (savedState) {
        document.getElementById('game-setup').classList.add('hidden');
        game = new ShogiGame(savedState.difficulty, savedState);

        // エンジン設定を取得して初期化
        const engineType = getSelectedEngine();

        if (engineType !== 'builtin' && !engineInitialized) {
            try {
                aiEngineManager.setPreferredEngine(
                    engineType === 'yaneuraou' ? ENGINE_TYPES.YANEURAOU :
                    ENGINE_TYPES.AUTO
                );
                await aiEngineManager.initialize();
                game.setAIEngine(aiEngineManager);
                engineInitialized = true;
            } catch (error) {
                console.warn('Engine initialization failed for loaded game:', error);
            }
        }

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
