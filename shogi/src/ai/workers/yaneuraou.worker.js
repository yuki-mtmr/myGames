/**
 * YaneuraOu Web Worker
 * やねうら王WASMエンジンとのUSIプロトコル通信を管理
 */

let engine = null;
let isReady = false;
let currentSearchId = null;

/**
 * メインスレッドからのメッセージを処理
 */
self.onmessage = async (event) => {
  const { id, type, ...payload } = event.data;

  try {
    switch (type) {
      case 'init':
        await handleInit(id);
        break;

      case 'search':
        await handleSearch(id, payload);
        break;

      case 'stop':
        handleStop(id);
        break;

      case 'quit':
        handleQuit(id);
        break;

      default:
        sendError(id, `Unknown command: ${type}`);
    }
  } catch (error) {
    sendError(id, error.message);
  }
};

/**
 * エンジンの初期化
 */
async function handleInit(id) {
  try {
    // @mizarjp/yaneuraou.k-p パッケージをインポート
    // Note: Viteがこれをバンドルして提供する
    const YaneuraOu = await import('@mizarjp/yaneuraou.k-p');

    // エンジンインスタンスを作成
    engine = await YaneuraOu.default();

    // USI初期化シーケンス
    sendUsi('usi');

    // usiokを待つ
    await waitForResponse('usiok');

    // isreadyを送信
    sendUsi('isready');

    // readyokを待つ
    await waitForResponse('readyok');

    isReady = true;

    self.postMessage({ id, type: 'ready' });

  } catch (error) {
    console.error('Engine initialization failed:', error);
    sendError(id, `Engine initialization failed: ${error.message}`);
  }
}

/**
 * 探索を実行
 */
async function handleSearch(id, { sfen, time, depth }) {
  if (!isReady || !engine) {
    sendError(id, 'Engine is not ready');
    return;
  }

  currentSearchId = id;

  try {
    // 局面を設定
    sendUsi(`position sfen ${sfen}`);

    // 探索開始
    let goCommand = 'go';
    if (time) {
      goCommand += ` movetime ${time}`;
    }
    if (depth) {
      goCommand += ` depth ${depth}`;
    }

    sendUsi(goCommand);

    // bestmoveを待つ
    const result = await waitForBestmove(id);

    if (result && currentSearchId === id) {
      self.postMessage({
        id,
        type: 'bestmove',
        move: result.move,
        score: result.score,
        pv: result.pv
      });
    }

  } catch (error) {
    if (currentSearchId === id) {
      sendError(id, error.message);
    }
  } finally {
    if (currentSearchId === id) {
      currentSearchId = null;
    }
  }
}

/**
 * 探索を停止
 */
function handleStop(id) {
  if (engine) {
    sendUsi('stop');
  }
  self.postMessage({ id, type: 'stopped' });
}

/**
 * エンジンを終了
 */
function handleQuit(id) {
  if (engine) {
    sendUsi('quit');
    engine = null;
  }
  isReady = false;
  self.postMessage({ id, type: 'quit' });
}

/**
 * USIコマンドをエンジンに送信
 */
function sendUsi(command) {
  if (engine && engine.postMessage) {
    engine.postMessage(command);
  }
}

/**
 * 特定のレスポンスを待つ
 */
function waitForResponse(expected) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${expected}`));
    }, 10000);

    const originalHandler = engine.onmessage;

    engine.onmessage = (line) => {
      // 元のハンドラも呼び出す
      if (originalHandler) {
        originalHandler(line);
      }

      if (line.trim() === expected) {
        clearTimeout(timeout);
        engine.onmessage = originalHandler;
        resolve();
      }
    };
  });
}

/**
 * bestmoveレスポンスを待つ
 */
function waitForBestmove(searchId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Search timeout'));
    }, 60000); // 最大60秒

    let lastScore = 0;
    let lastPv = [];

    const originalHandler = engine.onmessage;

    engine.onmessage = (line) => {
      // 元のハンドラも呼び出す
      if (originalHandler) {
        originalHandler(line);
      }

      const trimmed = line.trim();

      // info行から探索情報を抽出
      if (trimmed.startsWith('info')) {
        const info = parseInfoLine(trimmed);
        if (info.score !== undefined) {
          lastScore = info.score;
        }
        if (info.pv) {
          lastPv = info.pv;
        }

        // 探索情報をメインスレッドに送信
        self.postMessage({
          id: searchId,
          type: 'info',
          depth: info.depth,
          score: info.score,
          pv: info.pv,
          nodes: info.nodes,
          nps: info.nps
        });
      }

      // bestmove行
      if (trimmed.startsWith('bestmove')) {
        clearTimeout(timeout);
        engine.onmessage = originalHandler;

        const parts = trimmed.split(' ');
        const move = parts[1];

        if (move === 'resign' || move === 'win' || move === 'none') {
          resolve({ move: null, score: lastScore, pv: lastPv });
        } else {
          resolve({ move, score: lastScore, pv: lastPv });
        }
      }
    };
  });
}

/**
 * info行をパース
 */
function parseInfoLine(line) {
  const result = {};
  const parts = line.split(' ');

  for (let i = 1; i < parts.length; i++) {
    switch (parts[i]) {
      case 'depth':
        result.depth = parseInt(parts[++i], 10);
        break;
      case 'score':
        if (parts[i + 1] === 'cp') {
          result.score = parseInt(parts[i + 2], 10);
          i += 2;
        } else if (parts[i + 1] === 'mate') {
          // 詰みの場合、大きなスコアを設定
          const mateIn = parseInt(parts[i + 2], 10);
          result.score = mateIn > 0 ? 30000 - mateIn : -30000 - mateIn;
          i += 2;
        }
        break;
      case 'nodes':
        result.nodes = parseInt(parts[++i], 10);
        break;
      case 'nps':
        result.nps = parseInt(parts[++i], 10);
        break;
      case 'pv':
        result.pv = parts.slice(i + 1);
        i = parts.length; // pvは残り全部
        break;
    }
  }

  return result;
}

/**
 * エラーメッセージを送信
 */
function sendError(id, message) {
  self.postMessage({ id, type: 'error', error: message });
}
