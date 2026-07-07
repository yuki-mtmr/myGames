/**
 * MoveJudge - 勝率下落幅による指し手判定の純粋関数
 *
 * 閾値の初期値と出典は src/config/trainingConfig.js を参照。
 */

import { trainingConfig } from '../config/trainingConfig.js';

export const SEVERITY = Object.freeze({
    INACCURACY: 'inaccuracy', // 疑問手(?!)
    MISTAKE: 'mistake',       // 悪手(?)
    BLUNDER: 'blunder',       // 大悪手(??)
});

function assertWinrate(name, value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError(`${name} must be within [0, 1], got: ${value}`);
    }
}

/**
 * 着手者視点の勝率変化から指し手を判定する
 * @param {{ winrateBefore: number, winrateAfter: number }} winrates - 着手者視点の勝率(0-1)
 * @param {{ inaccuracy?: number, mistake?: number, blunder?: number }} [thresholds]
 * @returns {{ drop: number, severity: string | null }}
 */
export function judgeMove({ winrateBefore, winrateAfter }, thresholds = {}) {
    assertWinrate('winrateBefore', winrateBefore);
    assertWinrate('winrateAfter', winrateAfter);

    const limits = { ...trainingConfig.judgeThresholds, ...thresholds };
    const drop = winrateBefore - winrateAfter;

    // 浮動小数点の境界誤差(例: 0.5 - 0.45 = 0.04999…)で閾値ちょうどの
    // 下落が取りこぼされないよう、微小な許容を持たせて比較する
    const EPSILON = 1e-9;
    let severity = null;
    if (drop >= limits.blunder - EPSILON) {
        severity = SEVERITY.BLUNDER;
    } else if (drop >= limits.mistake - EPSILON) {
        severity = SEVERITY.MISTAKE;
    } else if (drop >= limits.inaccuracy - EPSILON) {
        severity = SEVERITY.INACCURACY;
    }

    return { drop, severity };
}
