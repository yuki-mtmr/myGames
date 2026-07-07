/**
 * DrillMode - 矯正ドリルのセッション実行
 *
 * 認定済みの癖に属する悪手局面を FSRS スケジュールに従って出題し、
 * 解答結果で復習間隔を更新する。盤面と判定は ReplayMode を流用する。
 */

import { MistakeStore } from '../storage/MistakeStore.js';
import { DrillStore } from '../storage/DrillStore.js';
import { syncDrillItems } from '../training/DrillSync.js';
import { selectDrillItems } from '../training/DrillSelector.js';
import { reviewItem } from '../training/FsrsScheduler.js';
import { startReplay } from './ReplayMode.js';

/**
 * 癖1件ぶんのドリルセッションを開始する
 * @param {{ tagKey: string, label: string, mistakeIds: Array }} habit
 * @param {{ engine: Object, onExit: Function }} deps
 */
export function startDrillSession(habit, { engine, onExit }) {
    const drillStore = new DrillStore();

    // 癖に属する悪手からドリル問題を同期生成(初回のみ増える)
    try {
        const mistakes = new MistakeStore().findAll();
        const existing = drillStore.findAll({ habitTagKey: habit.tagKey });
        for (const item of syncDrillItems(habit, mistakes, existing)) {
            drillStore.save(item);
        }
    } catch (error) {
        console.warn('Drill sync failed:', error);
    }

    const pool = drillStore.findAll({ habitTagKey: habit.tagKey });
    const session = selectDrillItems(pool, { now: new Date() });

    if (session.length === 0) {
        showBannerMessage(
            `「${habit.label}」のドリルは今日の分が完了しています。また明日どうぞ。`,
            onExit
        );
        return;
    }

    let index = 0;
    let correctCount = 0;

    const runItem = () => {
        const item = session[index];
        let finishedOutcome = null;

        startReplay(item, {
            engine,
            promptText:
                `矯正ドリル「${habit.label}」 ${index + 1}/${session.length}問目: ` +
                `この局面(実戦で ${item.moveText} と指して悪手になった場面)で最善手を指してください。`,
            onFinished: (outcome) => {
                finishedOutcome = outcome;
                const correct = outcome.result === 'correct';
                if (correct) correctCount += 1;
                try {
                    drillStore.save({
                        ...item,
                        fsrs: reviewItem(item.fsrs, { correct, now: new Date() }),
                    });
                } catch (error) {
                    console.warn('Drill state save failed:', error);
                }
            },
            onExit: () => {
                // 未解答で「戻る」= セッション中断
                if (!finishedOutcome) {
                    onExit();
                    return;
                }
                index += 1;
                if (index < session.length) {
                    runItem();
                } else {
                    showBannerMessage(
                        `今日のドリル完了! ${session.length}問中${correctCount}問正解でした。` +
                        `間違えた問題は短い間隔で再出題されます。`,
                        onExit
                    );
                }
            },
        });
    };

    runItem();
}

/** 再演バナーを使って完了/空メッセージを表示する */
function showBannerMessage(message, onExit) {
    const banner = document.getElementById('replay-banner');
    const promptEl = document.getElementById('replay-prompt');
    const feedbackEl = document.getElementById('replay-feedback');
    const exitBtn = document.getElementById('replay-exit-btn');
    if (!banner || !exitBtn) {
        onExit();
        return;
    }

    promptEl.textContent = message;
    feedbackEl.textContent = '';
    feedbackEl.dataset.result = '';
    banner.classList.remove('hidden');

    const handleExit = () => {
        exitBtn.removeEventListener('click', handleExit);
        banner.classList.add('hidden');
        onExit();
    };
    exitBtn.addEventListener('click', handleExit);
}
