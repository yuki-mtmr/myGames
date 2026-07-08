/**
 * ReviewPanel - 終局後の検討モード UI
 *
 * 終局を検知(#game-over の表示監視)して自動で検討モードに入り、
 * 棋譜ナビゲーション(ボタン/キーボード/棋譜クリック/グラフクリック)で
 * 対局を並べ直せる。局面移動は ReviewNavigator(TDD済み)、
 * グラフ座標は EvalGraphModel(TDD済み)に委譲し、ここは表示のみ扱う。
 * 対局状態(ShogiGame)には一切書き込まない読み取り専用ビューア。
 */

import {
    createReviewState, goNext, goPrev, goFirst, goLast, goTo, currentPosition,
} from '../review/ReviewNavigator.js';
import { buildGraphModel } from '../review/EvalGraphModel.js';
import { SfenConverter } from '../ai/SfenConverter.js';
import { DOMRenderer } from '../renderers/index.js';

const GRAPH_SIZE = { width: 300, height: 90, clampCp: 2000 };
const SEVERITY_MARKS = { inaccuracy: '?!', mistake: '?', blunder: '??' };
const SVG_NS = 'http://www.w3.org/2000/svg';

function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

/** 再演/ドリル中はナビを無効にする(盤面の取り合いを防ぐ) */
function isReplayActive() {
    return !document.getElementById('replay-banner')?.classList.contains('hidden');
}

export function setupReviewPanel({ getGame }) {
    const section = document.getElementById('review-section');
    const graphSvg = document.getElementById('eval-graph');
    const positionLabel = document.getElementById('review-position');
    const moveList = document.getElementById('move-list');
    const gameOverBanner = document.getElementById('game-over');
    if (!section || !graphSvg || !gameOverBanner) return;

    let state = null;
    let analysis = null; // { evals, judgments }
    let renderer = null;

    const renderPosition = () => {
        if (!state) return;
        const { sfen, ply, moveText } = currentPosition(state);

        try {
            const { board, playerCaptured, cpuCaptured } = SfenConverter.sfenToBoard(sfen);
            renderer ??= new DOMRenderer();
            renderer.renderBoard(board, null);
            renderer.renderCapturedPieces(
                playerCaptured.map(p => p.type ?? p),
                cpuCaptured.map(p => p.type ?? p),
                null
            );
        } catch (error) {
            console.warn('Review position render failed:', error);
            return;
        }

        positionLabel.textContent = ply === 0 ? '開始局面' : `${ply}手目 ${moveText ?? ''}`;
        highlightMoveListItem(moveList, state.index);
        highlightGraphCursor(graphSvg, state.index);
    };

    const navigate = (transform) => {
        if (!state || isReplayActive()) return;
        state = transform(state);
        renderPosition();
    };

    document.getElementById('review-first')?.addEventListener('click', () => navigate(goFirst));
    document.getElementById('review-prev')?.addEventListener('click', () => navigate(goPrev));
    document.getElementById('review-next')?.addEventListener('click', () => navigate(goNext));
    document.getElementById('review-last')?.addEventListener('click', () => navigate(goLast));

    const handleKey = (event) => {
        if (!state || isReplayActive()) return;
        if (event.key === 'ArrowLeft') { navigate(goPrev); event.preventDefault(); }
        if (event.key === 'ArrowRight') { navigate(goNext); event.preventDefault(); }
    };

    // 棋譜クリックでジャンプ(move-item は ply 順に並ぶ)
    moveList?.addEventListener('click', (event) => {
        const item = event.target.closest('.move-item');
        if (!item || !state) return;
        const items = [...moveList.querySelectorAll('.move-item')];
        const ply = items.indexOf(item) + 1;
        navigate(s => goTo(s, ply));
    });

    graphSvg.addEventListener('click', (event) => {
        if (!state || !analysis) return;
        const rect = graphSvg.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const ply = Math.round(ratio * (state.sfens.length - 1));
        navigate(s => goTo(s, ply));
    });

    const enterReview = () => {
        const game = getGame();
        if (!game?.gameOver || !game.sfenHistory?.length) return;
        try {
            state = createReviewState({
                sfens: [...game.sfenHistory],
                moveTexts: game.moveHistory.map(m => m.text.trim()),
            });
        } catch (error) {
            console.warn('Review mode unavailable:', error);
            return;
        }
        analysis = null;
        graphSvg.innerHTML = '';
        hide(graphSvg); // 解析前は空のグラフ枠を出さない
        document.addEventListener('keydown', handleKey);
        show(section);
        setInGameControlsVisible(false);
        renderPosition();
    };

    const exitReview = () => {
        state = null;
        analysis = null;
        renderer = null;
        document.removeEventListener('keydown', handleKey);
        hide(section);
        setInGameControlsVisible(true);
        clearMoveListDecorations(moveList);
    };

    // 終局バナーの表示/非表示で検討モードに入る/出る
    new MutationObserver(() => {
        const bannerVisible = !gameOverBanner.classList.contains('hidden');
        if (bannerVisible && !state) enterReview();
        // バナー非表示は「AI解析を開いた」だけの場合もあるため、
        // 検討状態の破棄は新規対局(gameOver=false の game 出現)で行う
        if (!bannerVisible && state && !getGame()?.gameOver) exitReview();
    }).observe(gameOverBanner, { attributes: true, attributeFilter: ['class'] });

    return {
        /** AI解析完了後に評価値グラフと悪手マークを表示する */
        setAnalysis(result) {
            if (!state) return;
            analysis = result;
            show(graphSvg);
            renderGraph(graphSvg, result, state.sfens.length - 1);
            decorateMoveList(moveList, result.judgments);
        },
    };
}

/** 終局後: 手番表示を検討モードに切り替え、対局専用ボタン(待った/投了)を隠す */
function setInGameControlsVisible(inGame) {
    const turnIndicator = document.getElementById('turn-indicator');
    if (!inGame && turnIndicator) {
        turnIndicator.textContent = '終局 — 検討モード';
        turnIndicator.classList.remove('thinking');
    }
    for (const id of ['undo-btn', 'resign-btn']) {
        document.getElementById(id)?.classList.toggle('hidden', !inGame);
    }
}

function renderGraph(svg, { evals, judgments }, maxPly) {
    svg.innerHTML = '';
    const model = buildGraphModel(evals, judgments, GRAPH_SIZE);
    if (model.points.length === 0) return;

    const centerLine = document.createElementNS(SVG_NS, 'line');
    centerLine.setAttribute('x1', 0);
    centerLine.setAttribute('x2', GRAPH_SIZE.width);
    centerLine.setAttribute('y1', GRAPH_SIZE.height / 2);
    centerLine.setAttribute('y2', GRAPH_SIZE.height / 2);
    centerLine.setAttribute('class', 'eval-graph-center');
    svg.appendChild(centerLine);

    const path = document.createElementNS(SVG_NS, 'polyline');
    path.setAttribute('points', model.points.map(p => `${p.x},${p.y}`).join(' '));
    path.setAttribute('class', 'eval-graph-line');
    svg.appendChild(path);

    for (const marker of model.markers) {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', marker.x);
        dot.setAttribute('cy', marker.y);
        dot.setAttribute('r', 3.5);
        dot.setAttribute('class', `eval-graph-marker severity-${marker.severity}`);
        svg.appendChild(dot);
    }

    // 現在位置カーソル(renderPosition が位置を更新)
    const cursor = document.createElementNS(SVG_NS, 'line');
    cursor.setAttribute('id', 'eval-graph-cursor');
    cursor.setAttribute('y1', 0);
    cursor.setAttribute('y2', GRAPH_SIZE.height);
    cursor.dataset.maxPly = String(maxPly);
    svg.appendChild(cursor);
}

function highlightGraphCursor(svg, index) {
    const cursor = svg.querySelector('#eval-graph-cursor');
    if (!cursor) return;
    const maxPly = Number(cursor.dataset.maxPly) || 1;
    const x = (index / maxPly) * GRAPH_SIZE.width;
    cursor.setAttribute('x1', x);
    cursor.setAttribute('x2', x);
}

function decorateMoveList(moveList, judgments) {
    if (!moveList) return;
    const items = [...moveList.querySelectorAll('.move-item')];
    for (const j of judgments) {
        const item = items[j.ply - 1];
        if (!item || !j.severity) continue;
        item.classList.add(`judged-${j.severity}`);
        if (!item.querySelector('.judgment-mark')) {
            const mark = document.createElement('span');
            mark.className = `judgment-mark severity-${j.severity}`;
            mark.textContent = SEVERITY_MARKS[j.severity];
            item.appendChild(mark);
        }
    }
}

function highlightMoveListItem(moveList, index) {
    if (!moveList) return;
    const items = [...moveList.querySelectorAll('.move-item')];
    items.forEach((item, i) => {
        item.classList.toggle('review-current', i + 1 === index);
    });
    const current = items[index - 1];
    current?.scrollIntoView({ block: 'nearest' });
}

function clearMoveListDecorations(moveList) {
    if (!moveList) return;
    moveList.querySelectorAll('.judgment-mark').forEach(el => el.remove());
    moveList.querySelectorAll('.move-item').forEach(el => {
        el.classList.remove('review-current', 'judged-inaccuracy', 'judged-mistake', 'judged-blunder');
    });
}
