/**
 * DashboardPanel - 癖ダッシュボード(認定済みの癖 / フェーズ別分布 / 悪手率推移)
 *
 * 集計は DashboardStats / HabitDetector(TDD済み)に委譲し、ここは表示のみ。
 */

import { MistakeStore } from '../storage/MistakeStore.js';
import { GameStore } from '../storage/GameStore.js';
import { detectHabits } from '../training/HabitDetector.js';
import { mistakeRateSeries, phaseDistribution } from '../training/DashboardStats.js';
import { trainingConfig } from '../config/trainingConfig.js';
import { startDrillSession } from './DrillMode.js';

const PHASE_LABELS = { opening: '序盤', middlegame: '中盤', endgame: '終盤' };

function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

function el(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
}

/** 横棒(幅は 0-1 の比率) */
function bar(label, ratio, valueText) {
    const row = el('div', 'dash-bar-row');
    row.appendChild(el('span', 'dash-bar-label', label));
    const track = el('div', 'dash-bar-track');
    const fill = el('div', 'dash-bar-fill');
    fill.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'dash-bar-value', valueText));
    return row;
}

function render(body, onDrillRequest) {
    body.innerHTML = '';

    let games, mistakes, recentIds;
    try {
        const gameStore = new GameStore();
        games = gameStore.findAll();
        mistakes = new MistakeStore().findAll();
        recentIds = gameStore.recentGameIds(trainingConfig.habit.windowGames);
    } catch (error) {
        console.warn('Dashboard data load failed:', error);
        body.appendChild(el('p', 'dash-empty', 'データの読み込みに失敗しました。'));
        return;
    }

    if (games.length === 0) {
        body.appendChild(el('p', 'dash-empty',
            'まだデータがありません。対局後に「AI解析(感想戦)」を実行すると、悪手が蓄積されてここに表示されます。'));
        return;
    }

    // 認定済みの癖
    body.appendChild(el('h3', 'dash-section-title', 'あなたの癖(認定済み)'));
    const habits = detectHabits(mistakes, { recentGameIds: recentIds });
    if (habits.length === 0) {
        body.appendChild(el('p', 'dash-empty',
            `認定された癖はまだありません(同型の悪手が直近${trainingConfig.habit.windowGames}局で${trainingConfig.habit.minOccurrences}回以上になると認定されます)。`));
    } else {
        for (const habit of habits) {
            const card = el('div', 'habit-card');
            card.appendChild(el('div', 'habit-label', `🔴 ${habit.label}`));
            card.appendChild(el('div', 'habit-count',
                `${habit.occurrences}回 / 直近${habit.windowGames}局`));
            const drillBtn = el('button', 'replay-btn', 'この癖のドリルへ');
            drillBtn.addEventListener('click', () => onDrillRequest?.(habit));
            card.appendChild(drillBtn);
            body.appendChild(card);
        }
    }

    // フェーズ別分布
    body.appendChild(el('h3', 'dash-section-title', 'フェーズ別の悪手分布'));
    const distribution = phaseDistribution(mistakes);
    const maxCount = Math.max(1, ...Object.values(distribution));
    for (const [phase, count] of Object.entries(distribution)) {
        body.appendChild(bar(PHASE_LABELS[phase], count / maxCount, `${count}件`));
    }

    // 悪手率の推移(直近10局)
    body.appendChild(el('h3', 'dash-section-title', '悪手率の推移(悪手+大悪手 / 自分の手数)'));
    const series = mistakeRateSeries(games).slice(-10);
    const maxRate = Math.max(0.2, ...series.map(s => s.rate));
    series.forEach((s, i) => {
        const date = String(s.playedAt).slice(5, 10).replace('-', '/');
        body.appendChild(bar(`${i + 1}局目(${date})`, s.rate / maxRate,
            `${Math.round(s.rate * 100)}%`));
    });
}

/**
 * ダッシュボードのイベントを初期化する
 * @param {{ engineManager?: Object }} [deps] - ドリル判定用エンジンの取得元
 */
export function setupDashboardPanel({ engineManager } = {}) {
    const panel = document.getElementById('dashboard-panel');
    const body = document.getElementById('dashboard-body');
    const openBtn = document.getElementById('dashboard-btn');
    const closeBtn = document.getElementById('dashboard-close-btn');
    if (!panel || !body || !openBtn || !closeBtn) return;

    const onDrillRequest = (habit) => {
        const engine = engineManager?.currentEngine;
        if (!engine || engine.getType() !== 'yaneuraou') {
            body.prepend(el('p', 'dash-empty',
                'ドリルの判定にはやねうら王エンジンが必要です。対局を開始してエンジンを起動してから再度お試しください。'));
            return;
        }
        hide(panel);
        startDrillSession(habit, {
            engine,
            onExit: () => {
                render(body, onDrillRequest);
                show(panel);
            },
        });
    };

    openBtn.addEventListener('click', () => {
        render(body, onDrillRequest);
        show(panel);
    });
    closeBtn.addEventListener('click', () => hide(panel));
}
