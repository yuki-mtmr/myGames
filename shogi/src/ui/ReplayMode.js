/**
 * ReplayMode - 感想戦の再演モード(悪手局面で正解手を探させる)
 *
 * 盤面は ShogiGame を replayMode で再利用する(CPU応答と終局モーダルを抑止)。
 * 判定ロジックは ReplaySession(TDD済み)に委譲し、ここは盤面と表示のみ扱う。
 */

import { ShogiGame } from '../../game.js';
import { SfenConverter } from '../ai/SfenConverter.js';
import { DOMRenderer } from '../renderers/index.js';
import { ReplaySession } from '../training/ReplaySession.js';
import { formatUsiMove } from '../analysis/MoveExplainer.js';

function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

/** SFEN から ShogiGame 復元用の savedState を組み立てる */
function sfenToSavedState(sfen) {
    const { board, currentPlayer, playerCaptured, cpuCaptured } =
        SfenConverter.sfenToBoard(sfen);
    return {
        board,
        currentPlayer,
        playerCaptured,
        cpuCaptured,
        moveHistory: [],
        positionHistory: [],
        sfenHistory: [sfen],
        gameOver: false,
        stateHistory: [],
    };
}

/**
 * 再演モードを開始する
 * @param {Object} mistake - MistakeRecord 相当
 *   ({ ply, moveText, sfenBefore, bestMove, winrateBefore })
 * @param {{ engine: Object, onExit: Function }} deps -
 *   engine は getBestMove を持つこと。onExit は終了時に呼ばれる
 */
export function startReplay(mistake, { engine, onExit }) {
    const banner = document.getElementById('replay-banner');
    const promptEl = document.getElementById('replay-prompt');
    const feedbackEl = document.getElementById('replay-feedback');
    const exitBtn = document.getElementById('replay-exit-btn');
    if (!banner || !promptEl || !feedbackEl || !exitBtn) return;

    const session = new ReplaySession(mistake, { engine });
    let replayGame = null;
    let evaluating = false;

    const setupBoard = () => {
        replayGame = new ShogiGame('replay', sfenToSavedState(mistake.sfenBefore));
        replayGame.replayMode = true;
        replayGame.setRenderer(new DOMRenderer());
        replayGame.onReplayPlayerMove = handlePlayerMove;
        replayGame.renderBoard();
    };

    const handlePlayerMove = async () => {
        if (evaluating || session.finished) return;
        evaluating = true;
        feedbackEl.textContent = '判定中…';

        try {
            const sfenAfter = replayGame.sfenHistory[replayGame.sfenHistory.length - 1];
            const outcome = await session.submitAnswer({
                sfenAfter,
                gameOver: replayGame.gameOver,
            });
            renderOutcome(outcome);
        } finally {
            evaluating = false;
        }
    };

    const renderOutcome = (outcome) => {
        const pct = outcome.answerWinrate === null || outcome.answerWinrate === undefined
            ? null : Math.round(outcome.answerWinrate * 100);

        if (outcome.result === 'correct') {
            feedbackEl.textContent = pct === null
                ? '正解! 見事に決めました。'
                : `正解! この手なら勝率${pct}%を保てます。`;
            feedbackEl.dataset.result = 'correct';
            return;
        }
        if (outcome.result === 'error') {
            feedbackEl.textContent = '判定に失敗しました。もう一度指してください。';
            feedbackEl.dataset.result = 'error';
            setupBoard();
            return;
        }

        const label = outcome.result === 'close' ? '惜しい!' : '不正解…';
        if (outcome.revealBestMove) {
            const bestText = formatUsiMove(outcome.bestMove) ?? '(取得失敗)';
            feedbackEl.textContent =
                `${label} 最善手は ${bestText} でした。局面を戻したので、最善手を指して感覚を上書きしましょう。`;
            feedbackEl.dataset.result = 'reveal';
            // エラー修正学習: 開示後にもう一度指させる(判定はしない)
            setupBoard();
            replayGame.onReplayPlayerMove = () => {
                feedbackEl.textContent = 'お疲れさまでした。「戻る」で一覧へどうぞ。';
            };
            return;
        }

        feedbackEl.textContent =
            `${label} 勝率${pct}%に下がります。局面を戻したので、別の手を探してください(残り${outcome.attemptsLeft}回)。`;
        feedbackEl.dataset.result = outcome.result;
        setupBoard();
    };

    const handleExit = () => {
        exitBtn.removeEventListener('click', handleExit);
        hide(banner);
        onExit();
    };
    exitBtn.addEventListener('click', handleExit);

    promptEl.textContent =
        `${mistake.ply}手目、あなたは ${mistake.moveText} と指しました(悪手)。この局面でより良い手を指してください。`;
    feedbackEl.textContent = '';
    feedbackEl.dataset.result = '';
    show(banner);
    setupBoard();
}
