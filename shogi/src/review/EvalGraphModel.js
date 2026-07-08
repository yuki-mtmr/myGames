/**
 * EvalGraphModel - 評価値グラフの座標モデル(純粋関数)
 *
 * GameAnalyzer の evals(先手視点)を SVG 描画用の座標列に変換する。
 * y は上が先手有利(評価値+)、中央が互角。クランプ幅は呼び出し側指定。
 */

/**
 * @param {Array<{ ply: number, scoreCp: number|null }>} evals - 先手視点評価値列
 * @param {Array<{ ply: number, severity: string|null }>} judgments
 * @param {{ width: number, height: number, clampCp: number }} size
 * @returns {{ points: Array<{ply,x,y}>, markers: Array<{ply,x,y,severity}> }}
 */
export function buildGraphModel(evals, judgments, { width, height, clampCp }) {
    if (evals.length === 0) {
        return { points: [], markers: [] };
    }

    const maxPly = Math.max(1, evals.length - 1);
    const centerY = height / 2;

    const toXY = (ply, scoreCp) => {
        const clamped = Math.min(clampCp, Math.max(-clampCp, scoreCp));
        return {
            x: (ply / maxPly) * width,
            y: centerY - (clamped / clampCp) * centerY,
        };
    };

    const points = evals
        .filter(e => e.scoreCp !== null && e.scoreCp !== undefined)
        .map(e => ({ ply: e.ply, ...toXY(e.ply, e.scoreCp) }));

    const pointByPly = new Map(points.map(p => [p.ply, p]));
    const markers = judgments
        .filter(j => j.severity)
        .map(j => {
            const point = pointByPly.get(j.ply);
            return point ? { ply: j.ply, severity: j.severity, x: point.x, y: point.y } : null;
        })
        .filter(Boolean);

    return { points, markers };
}
