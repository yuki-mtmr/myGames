import { describe, it, expect } from 'vitest';
import { mistakeRateSeries, phaseDistribution } from './DashboardStats.js';

describe('mistakeRateSeries', () => {
    it('対局ごとの悪手率(自分の手数あたり)を時系列で返す', () => {
        const games = [
            { gameId: 'g2', playedAt: '2026-07-02T00:00:00Z', totalPlies: 100,
              mistakeCounts: { inaccuracy: 2, mistake: 3, blunder: 0 } },
            { gameId: 'g1', playedAt: '2026-07-01T00:00:00Z', totalPlies: 50,
              mistakeCounts: { inaccuracy: 0, mistake: 0, blunder: 5 } },
        ];
        const series = mistakeRateSeries(games);

        expect(series.map(s => s.gameId)).toEqual(['g1', 'g2']); // 古い順
        // g1: 悪手系5 / 自分の手25 = 0.2
        expect(series[0].rate).toBeCloseTo(0.2, 10);
        // g2: (悪手3+大悪手0) / 50 = 0.06 (疑問手は悪手率に含めない)
        expect(series[1].rate).toBeCloseTo(0.06, 10);
    });

    it('手数0の対局は rate 0 で落ちない', () => {
        const games = [{ gameId: 'g1', playedAt: '2026-07-01T00:00:00Z', totalPlies: 0,
                         mistakeCounts: { mistake: 1 } }];
        expect(mistakeRateSeries(games)[0].rate).toBe(0);
    });
});

describe('phaseDistribution', () => {
    it('フェーズ別の悪手件数を返す', () => {
        const mistakes = [
            { tags: { phase: 'opening' } },
            { tags: { phase: 'middlegame' } },
            { tags: { phase: 'middlegame' } },
            { tags: {} },
        ];
        expect(phaseDistribution(mistakes)).toEqual({
            opening: 1, middlegame: 2, endgame: 0,
        });
    });
});
