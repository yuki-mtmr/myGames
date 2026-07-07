/**
 * DrillSelector - 今日のドリル出題選択(純粋関数)
 *
 * 期日到来分(古い順)→ 未学習 の優先度で sessionSize 問を選ぶ。
 * セッションを短く区切る設計意図は docs/design-principles.md 原則8。
 */

import { isDue } from './FsrsScheduler.js';
import { trainingConfig } from '../config/trainingConfig.js';

/**
 * @param {Array<{ fsrs: Object|null }>} items - DrillItem の配列
 * @param {{ now: string|Date, sessionSize?: number }} options
 * @returns {Object[]} 出題する DrillItem(優先度順)
 */
export function selectDrillItems(items, { now, sessionSize } = {}) {
    const size = sessionSize ?? trainingConfig.drill.sessionSize;

    const dueItems = items
        .filter(i => i.fsrs && isDue(i.fsrs, now))
        .sort((a, b) => String(a.fsrs.due).localeCompare(String(b.fsrs.due)));
    const newItems = items.filter(i => !i.fsrs);

    return [...dueItems, ...newItems].slice(0, size);
}
