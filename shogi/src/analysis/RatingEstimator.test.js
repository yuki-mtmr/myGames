import { describe, it, expect } from 'vitest';
import { estimateRating } from './RatingEstimator.js';

function judgment(mover, drop, skipped = false) {
    return { mover, drop, skipped, severity: null };
}

// テスト用に判定しやすい閾値を注入
const TIERS = [
    { maxAvgDrop: 0.01, label: '三段以上' },
    { maxAvgDrop: 0.025, label: '1〜3級' },
    { maxAvgDrop: Infinity, label: '10級以下' },
];
const CONFIG = { minMoves: 3, tiers: TIERS };

describe('estimateRating', () => {
    it('平均勝率損失から棋力ラベルを推定する', () => {
        const judgments = [
            judgment('player', 0.005),
            judgment('player', 0.005),
            judgment('player', 0.005),
            judgment('cpu', 0.10),
        ];
        const result = estimateRating(judgments, 'player', CONFIG);
        expect(result.label).toBe('三段以上');
        expect(result.avgDrop).toBeCloseTo(0.005, 10);
        expect(result.sampleSize).toBe(3);
    });

    it('mover でフィルタされる(CPUの手はCPUの推定に使う)', () => {
        const judgments = [
            judgment('player', 0.001),
            judgment('cpu', 0.05),
            judgment('cpu', 0.05),
            judgment('cpu', 0.05),
        ];
        expect(estimateRating(judgments, 'cpu', CONFIG).label).toBe('10級以下');
    });

    it('勝率が上がった手(負のdrop)は損失0として扱う', () => {
        const judgments = [
            judgment('player', -0.10),
            judgment('player', 0.03),
            judgment('player', 0.03),
        ];
        const result = estimateRating(judgments, 'player', CONFIG);
        expect(result.avgDrop).toBeCloseTo(0.02, 10);
        expect(result.label).toBe('1〜3級');
    });

    it('解析スキップの手は母数に含めない', () => {
        const judgments = [
            judgment('player', 0.005),
            judgment('player', 0.005),
            judgment('player', 0.005),
            { mover: 'player', drop: null, skipped: true, severity: null },
        ];
        expect(estimateRating(judgments, 'player', CONFIG).sampleSize).toBe(3);
    });

    it('手数不足なら label null で判定不能を返す', () => {
        const judgments = [judgment('player', 0.01)];
        const result = estimateRating(judgments, 'player', CONFIG);
        expect(result.label).toBeNull();
        expect(result.sampleSize).toBe(1);
    });

    it('既定設定(trainingConfig)でも動く', () => {
        const judgments = Array.from({ length: 20 }, () => judgment('player', 0.02));
        const result = estimateRating(judgments, 'player');
        expect(typeof result.label).toBe('string');
        expect(result.label.length).toBeGreaterThan(0);
    });
});
