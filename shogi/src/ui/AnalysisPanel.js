/**
 * AnalysisPanel - 終局後のAI解析(感想戦v1)パネル
 *
 * 対局の全局面を解析し、自分(先手)の疑問手/悪手/大悪手を一覧表示する。
 * 悪手は自動でタグ付けして MistakeStore に蓄積する(癖ダッシュボードv3で利用)。
 */

import { analyzeGame } from '../analysis/GameAnalyzer.js';
import { explainMistake } from '../analysis/MoveExplainer.js';
import { tagPhase } from '../training/MistakeTagger.js';
import { MistakeStore } from '../storage/MistakeStore.js';
import { trainingConfig } from '../config/trainingConfig.js';
import { startReplay } from './ReplayMode.js';

const SEVERITY_LABELS = {
    inaccuracy: { text: '疑問手', mark: '?!', className: 'severity-inaccuracy' },
    mistake: { text: '悪手', mark: '?', className: 'severity-mistake' },
    blunder: { text: '大悪手', mark: '??', className: 'severity-blunder' },
};

const PHASE_LABELS = { opening: '序盤', middlegame: '中盤', endgame: '終盤' };

function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

/**
 * 解析パネルのイベントを初期化する
 * @param {{ getGame: () => Object|null, engineManager: Object }} deps
 */
export function setupAnalysisPanel({ getGame, engineManager }) {
    const panel = document.getElementById('analysis-panel');
    const analyzeBtn = document.getElementById('analyze-btn');
    const closeBtn = document.getElementById('analysis-close-btn');
    if (!panel || !analyzeBtn || !closeBtn) return;

    let analyzing = false;

    analyzeBtn.addEventListener('click', async () => {
        if (analyzing) return;
        const game = getGame();
        if (!game || !game.gameOver) return;

        const engine = engineManager.currentEngine;
        if (!engine || engine.getType() !== 'yaneuraou') {
            // Minimax の評価値は勝率変換のスケールと非整合のため判定を出さない
            renderError('AI解析はやねうら王エンジン使用時のみ利用できます。');
            hide(document.getElementById('game-over'));
            show(panel);
            return;
        }

        analyzing = true;
        hide(document.getElementById('game-over'));
        show(panel);
        renderProgress(0, 1);

        try {
            const result = await analyzeGame(
                {
                    sfens: [...game.sfenHistory],
                    moveTexts: game.moveHistory.map(m => m.text.trim()),
                },
                {
                    engine,
                    config: { movetimeMs: trainingConfig.analysis.movetimeMs },
                    onProgress: ({ done, total }) => renderProgress(done, total),
                }
            );
            const playerMistakes = result.mistakes.filter(m => m.mover === 'player');
            persistMistakes(playerMistakes);
            renderResult(result, playerMistakes, (mistake) => {
                hide(panel);
                startReplay(mistake, {
                    engine,
                    onExit: () => {
                        // 元対局の最終局面と操作ハンドラを復元してから一覧へ戻る
                        getGame()?.renderBoard();
                        show(panel);
                    },
                });
            });
        } catch (error) {
            console.error('Game analysis failed:', error);
            renderError('解析中にエラーが発生しました。もう一度お試しください。');
        } finally {
            analyzing = false;
        }
    });

    closeBtn.addEventListener('click', () => {
        hide(panel);
        show(document.getElementById('game-over'));
    });
}

/** 悪手を自動タグ付けして蓄積する(失敗しても表示は継続) */
function persistMistakes(mistakes) {
    try {
        const store = new MistakeStore();
        const gameId = globalThis.crypto?.randomUUID?.() ?? `g-${Date.now()}`;
        for (const m of mistakes) {
            store.save({
                gameId,
                ply: m.ply,
                sfenBefore: m.sfenBefore,
                moveText: m.moveText,
                bestMove: m.bestMove,
                winrateBefore: m.winrateBefore,
                winrateAfter: m.winrateAfter,
                drop: m.drop,
                severity: m.severity,
                tags: { phase: tagPhase(m.ply) },
            });
        }
    } catch (error) {
        console.warn('Failed to persist mistakes:', error);
    }
}

function renderProgress(done, total) {
    const progress = document.getElementById('analysis-progress');
    const bar = document.getElementById('analysis-progress-bar');
    const text = document.getElementById('analysis-progress-text');
    show(progress);
    hide(document.getElementById('analysis-result'));
    if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
    if (text) text.textContent = `解析中… ${done}/${total} 局面`;
}

function renderError(message) {
    hide(document.getElementById('analysis-progress'));
    const resultEl = document.getElementById('analysis-result');
    show(resultEl);
    document.getElementById('analysis-summary').textContent = message;
    document.getElementById('mistake-list').innerHTML = '';
}

function renderResult(result, playerMistakes, onReplayRequest) {
    hide(document.getElementById('analysis-progress'));
    const resultEl = document.getElementById('analysis-result');
    show(resultEl);

    const summary = document.getElementById('analysis-summary');
    const list = document.getElementById('mistake-list');
    list.innerHTML = '';

    if (playerMistakes.length === 0) {
        summary.textContent = '悪手は検出されませんでした。好局でした!';
        return;
    }

    const counts = playerMistakes.reduce((acc, m) => ({
        ...acc, [m.severity]: (acc[m.severity] ?? 0) + 1,
    }), {});
    summary.textContent = ['blunder', 'mistake', 'inaccuracy']
        .filter(s => counts[s])
        .map(s => `${SEVERITY_LABELS[s].text} ${counts[s]}件`)
        .join(' / ');

    for (const m of playerMistakes) {
        const { text, mark, className } = SEVERITY_LABELS[m.severity];
        const item = document.createElement('li');
        item.className = `mistake-item ${className}`;

        const head = document.createElement('div');
        head.className = 'mistake-head';
        head.textContent = `${m.ply}手目 ▲${m.moveText} 【${text} ${mark}】 ${PHASE_LABELS[tagPhase(m.ply)]}`;

        const body = document.createElement('div');
        body.className = 'mistake-explanation';
        body.textContent = explainMistake({ ...m, bestMoveUsi: m.bestMove });

        item.append(head, body);

        const replayBtn = document.createElement('button');
        replayBtn.className = 'replay-btn';
        replayBtn.textContent = 'この局面を再演する';
        replayBtn.addEventListener('click', () => onReplayRequest?.(m));
        item.appendChild(replayBtn);

        list.appendChild(item);
    }
}
