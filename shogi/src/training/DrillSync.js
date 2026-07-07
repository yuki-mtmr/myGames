/**
 * DrillSync - 認定された癖から矯正ドリル問題を自動生成する(純粋関数)
 *
 * 「癖の蓄積 → 矯正ドリルへの自動変換」(docs/architecture.md)の変換部。
 * 同じ悪手(mistakeId)からは1問だけ生成する。
 */

function generateId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `d-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/**
 * @param {{ tagKey: string, mistakeIds: Array }} habit - 認定済みの癖
 * @param {Object[]} mistakes - MistakeRecord の配列
 * @param {Array<{ mistakeId: string }>} existingItems - 既存の DrillItem
 * @returns {Object[]} 新規作成すべき DrillItem
 */
export function syncDrillItems(habit, mistakes, existingItems) {
    const memberIds = new Set(habit.mistakeIds ?? []);
    const existingMistakeIds = new Set(existingItems.map(i => i.mistakeId));

    return mistakes
        .filter(m => memberIds.has(m.id) && !existingMistakeIds.has(m.id))
        .map(m => ({
            id: generateId(),
            mistakeId: m.id,
            habitTagKey: habit.tagKey,
            ply: m.ply,
            sfenBefore: m.sfenBefore,
            moveText: m.moveText,
            bestMove: m.bestMove,
            winrateBefore: m.winrateBefore,
            fsrs: null,
        }));
}
