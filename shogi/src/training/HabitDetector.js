/**
 * HabitDetector - タグ付き悪手ログから「癖」を認定する純粋関数
 *
 * 直近 windowGames 局の悪手を tagKey(phase/pattern)で集計し、
 * minOccurrences 回以上の同型を癖として返す(docs/architecture.md)。
 */

import { trainingConfig } from '../config/trainingConfig.js';

const PHASE_LABELS = { opening: '序盤', middlegame: '中盤', endgame: '終盤' };
const PATTERN_LABELS = {
    material_loss: '駒損',
    missed_capture: '取れる駒の見落とし',
    other: 'その他の悪手',
};

/**
 * tagKey(例: 'middlegame/material_loss')を日本語ラベルにする
 * @param {string} tagKey
 * @returns {string}
 */
export function habitLabel(tagKey) {
    const [phase, pattern] = tagKey.split('/');
    const phaseLabel = PHASE_LABELS[phase] ?? phase;
    const patternLabel = PATTERN_LABELS[pattern] ?? pattern;
    return `${phaseLabel}の${patternLabel}`;
}

/**
 * 癖を認定する
 * @param {Object[]} mistakes - MistakeRecord の配列(tags.phase / tags.patterns を持つ)
 * @param {{ recentGameIds: string[], minOccurrences?: number }} options -
 *   recentGameIds は直近 windowGames 局ぶんの gameId(GameStore.recentGameIds)
 * @returns {Array<{ tagKey: string, label: string, occurrences: number,
 *                   windowGames: number, mistakeIds: Array }>}
 */
export function detectHabits(mistakes, { recentGameIds, minOccurrences } = {}) {
    if (!Array.isArray(mistakes) || !Array.isArray(recentGameIds)) {
        throw new TypeError('mistakes and recentGameIds must be arrays');
    }
    const threshold = minOccurrences ?? trainingConfig.habit.minOccurrences;
    const windowSet = new Set(recentGameIds);

    const groups = new Map();
    for (const m of mistakes) {
        if (!windowSet.has(m.gameId)) continue;
        const phase = m.tags?.phase ?? 'unknown';
        const patterns = m.tags?.patterns?.length ? m.tags.patterns : ['other'];
        for (const pattern of patterns) {
            const tagKey = `${phase}/${pattern}`;
            const group = groups.get(tagKey) ?? { occurrences: 0, mistakeIds: [] };
            groups.set(tagKey, {
                occurrences: group.occurrences + 1,
                mistakeIds: [...group.mistakeIds, m.id ?? null],
            });
        }
    }

    return [...groups.entries()]
        .filter(([, g]) => g.occurrences >= threshold)
        .map(([tagKey, g]) => ({
            tagKey,
            label: habitLabel(tagKey),
            occurrences: g.occurrences,
            windowGames: recentGameIds.length,
            mistakeIds: g.mistakeIds,
        }))
        .sort((a, b) => b.occurrences - a.occurrences);
}
