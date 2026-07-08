import { describe, it, expect } from 'vitest';
import { buildGraphModel } from './EvalGraphModel.js';

const EVALS = [
    { ply: 0, scoreCp: 0 },
    { ply: 1, scoreCp: 300 },
    { ply: 2, scoreCp: -600 },
    { ply: 3, scoreCp: null },     // 解析失敗の手
    { ply: 4, scoreCp: 5000 },     // クランプ対象
];
const JUDGMENTS = [
    { ply: 2, severity: 'blunder', mover: 'player' },
    { ply: 4, severity: null, mover: 'cpu' },
];

describe('buildGraphModel', () => {
    const size = { width: 100, height: 50, clampCp: 1000 };

    it('評価値を座標列に変換する(x=手数、y=先手視点評価値)', () => {
        const model = buildGraphModel(EVALS, JUDGMENTS, size);
        // x は 0..width を手数で等分
        expect(model.points[0]).toMatchObject({ ply: 0, x: 0, y: 25 }); // 0 → 中央
        expect(model.points[4].x).toBe(100);
        // +300/1000 → 中央から上方向へ 30% (y = 25 - 0.3*25 = 17.5)
        expect(model.points[1].y).toBeCloseTo(17.5, 5);
    });

    it('クランプ値を超える評価値は端に張り付く', () => {
        const model = buildGraphModel(EVALS, JUDGMENTS, size);
        expect(model.points[4].y).toBe(0); // +5000 → 上端
    });

    it('scoreCp null の手は座標列から除外される', () => {
        const model = buildGraphModel(EVALS, JUDGMENTS, size);
        expect(model.points.map(p => p.ply)).toEqual([0, 1, 2, 4]);
    });

    it('severity 付きの手はマーカーになる', () => {
        const model = buildGraphModel(EVALS, JUDGMENTS, size);
        expect(model.markers).toHaveLength(1);
        expect(model.markers[0]).toMatchObject({ ply: 2, severity: 'blunder' });
        expect(model.markers[0].x).toBe(50);
    });

    it('評価値が空なら空モデルを返す', () => {
        const model = buildGraphModel([], [], size);
        expect(model.points).toEqual([]);
        expect(model.markers).toEqual([]);
    });
});
