/**
 * DashboardStats - 癖ダッシュボード用の集計(純粋関数)
 */

/**
 * 対局ごとの悪手率(自分の手数あたりの 悪手+大悪手 率)を古い順で返す。
 * 疑問手は「率」には含めない(改善の主指標をぶれさせないため)。
 * @param {Array<{ gameId: string, playedAt: string, totalPlies: number,
 *                 mistakeCounts: Object }>} games
 * @returns {Array<{ gameId: string, playedAt: string, rate: number }>}
 */
export function mistakeRateSeries(games) {
    return games
        .slice()
        .sort((a, b) => String(a.playedAt).localeCompare(String(b.playedAt)))
        .map(g => {
            const playerPlies = Math.ceil((g.totalPlies ?? 0) / 2);
            const badMoves = (g.mistakeCounts?.mistake ?? 0) + (g.mistakeCounts?.blunder ?? 0);
            return {
                gameId: g.gameId,
                playedAt: g.playedAt,
                rate: playerPlies > 0 ? badMoves / playerPlies : 0,
            };
        });
}

/**
 * フェーズ別の悪手件数
 * @param {Array<{ tags?: { phase?: string } }>} mistakes
 * @returns {{ opening: number, middlegame: number, endgame: number }}
 */
export function phaseDistribution(mistakes) {
    const counts = { opening: 0, middlegame: 0, endgame: 0 };
    for (const m of mistakes) {
        const phase = m.tags?.phase;
        if (phase in counts) counts[phase] += 1;
    }
    return counts;
}
