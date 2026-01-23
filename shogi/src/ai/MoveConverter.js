/**
 * Move Converter
 * 内部移動形式とUSI形式の相互変換を行う
 */

// 列番号 → USI列文字（左から1-9）
const COL_TO_USI = ['9', '8', '7', '6', '5', '4', '3', '2', '1'];
// 行番号 → USI行文字（上からa-i）
const ROW_TO_USI = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

// USI列文字 → 列番号
const USI_TO_COL = { '9': 0, '8': 1, '7': 2, '6': 3, '5': 4, '4': 5, '3': 6, '2': 7, '1': 8 };
// USI行文字 → 行番号
const USI_TO_ROW = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7, 'i': 8 };

// 内部駒名 → USI駒文字（駒打ち用）
const PIECE_TO_USI = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S',
  '金': 'G', '角': 'B', '飛': 'R'
};

// USI駒文字 → 内部駒名
const USI_TO_PIECE = {
  'P': '歩', 'L': '香', 'N': '桂', 'S': '銀',
  'G': '金', 'B': '角', 'R': '飛'
};

export class MoveConverter {
  /**
   * 内部移動形式をUSI形式に変換
   * @param {Object} move - 内部移動オブジェクト
   * @returns {string} USI形式の文字列
   *
   * 例:
   * - 移動: { type: 'move', fromRow: 6, fromCol: 6, toRow: 5, toCol: 6 } → "7g7f"
   * - 成り: { type: 'move', fromRow: 6, fromCol: 6, toRow: 3, toCol: 6, promote: true } → "7g7d+"
   * - 打ち: { type: 'drop', piece: '歩', toRow: 4, toCol: 4 } → "P*5e"
   */
  static toUsi(move) {
    if (move.type === 'drop') {
      // 駒打ち: P*5e形式
      const pieceChar = PIECE_TO_USI[move.piece] || PIECE_TO_USI[move.pieceType];
      if (!pieceChar) {
        throw new Error(`Unknown piece for drop: ${move.piece || move.pieceType}`);
      }
      const toCol = COL_TO_USI[move.toCol];
      const toRow = ROW_TO_USI[move.toRow];
      return `${pieceChar}*${toCol}${toRow}`;
    } else {
      // 通常移動: 7g7f形式
      const fromCol = COL_TO_USI[move.fromCol];
      const fromRow = ROW_TO_USI[move.fromRow];
      const toCol = COL_TO_USI[move.toCol];
      const toRow = ROW_TO_USI[move.toRow];
      const promote = move.promote ? '+' : '';
      return `${fromCol}${fromRow}${toCol}${toRow}${promote}`;
    }
  }

  /**
   * USI形式を内部移動形式に変換
   * @param {string} usi - USI形式の文字列
   * @param {string} owner - 駒の所有者 ('player' or 'cpu')
   * @returns {Object} 内部移動オブジェクト
   *
   * 例:
   * - "7g7f" → { type: 'move', fromRow: 6, fromCol: 2, toRow: 5, toCol: 2, promote: false }
   * - "7g7d+" → { type: 'move', fromRow: 6, fromCol: 2, toRow: 3, toCol: 2, promote: true }
   * - "P*5e" → { type: 'drop', piece: '歩', toRow: 4, toCol: 4 }
   */
  static fromUsi(usi, owner = 'cpu') {
    if (!usi || usi.length < 4) {
      throw new Error(`Invalid USI move: ${usi}`);
    }

    // 駒打ちのチェック（P*5e形式）
    if (usi[1] === '*') {
      const pieceChar = usi[0].toUpperCase();
      const piece = USI_TO_PIECE[pieceChar];
      if (!piece) {
        throw new Error(`Unknown piece in USI drop: ${pieceChar}`);
      }

      const toCol = USI_TO_COL[usi[2]];
      const toRow = USI_TO_ROW[usi[3]];

      if (toCol === undefined || toRow === undefined) {
        throw new Error(`Invalid destination in USI drop: ${usi}`);
      }

      return {
        type: 'drop',
        piece: piece,
        pieceType: piece,
        toRow: toRow,
        toCol: toCol,
        owner: owner
      };
    }

    // 通常移動（7g7f または 7g7f+ 形式）
    const fromCol = USI_TO_COL[usi[0]];
    const fromRow = USI_TO_ROW[usi[1]];
    const toCol = USI_TO_COL[usi[2]];
    const toRow = USI_TO_ROW[usi[3]];
    const promote = usi.length > 4 && usi[4] === '+';

    if (fromCol === undefined || fromRow === undefined ||
        toCol === undefined || toRow === undefined) {
      throw new Error(`Invalid coordinates in USI move: ${usi}`);
    }

    return {
      type: 'move',
      fromRow: fromRow,
      fromCol: fromCol,
      toRow: toRow,
      toCol: toCol,
      promote: promote,
      owner: owner
    };
  }

  /**
   * 座標をUSI形式の座標文字列に変換
   * @param {number} row - 行番号 (0-8)
   * @param {number} col - 列番号 (0-8)
   * @returns {string} USI座標 (例: "7g")
   */
  static coordinateToUsi(row, col) {
    return COL_TO_USI[col] + ROW_TO_USI[row];
  }

  /**
   * USI座標文字列を座標に変換
   * @param {string} usiCoord - USI座標 (例: "7g")
   * @returns {Object} { row, col }
   */
  static usiToCoordinate(usiCoord) {
    if (usiCoord.length !== 2) {
      throw new Error(`Invalid USI coordinate: ${usiCoord}`);
    }

    const col = USI_TO_COL[usiCoord[0]];
    const row = USI_TO_ROW[usiCoord[1]];

    if (col === undefined || row === undefined) {
      throw new Error(`Invalid USI coordinate: ${usiCoord}`);
    }

    return { row, col };
  }

  /**
   * 移動が有効なUSI形式かどうかを検証
   * @param {string} usi - USI形式の文字列
   * @returns {boolean}
   */
  static isValidUsi(usi) {
    if (!usi || typeof usi !== 'string') {
      return false;
    }

    // 駒打ち形式: P*5e
    if (usi.length >= 4 && usi[1] === '*') {
      const pieceChar = usi[0].toUpperCase();
      if (!USI_TO_PIECE[pieceChar]) return false;
      if (USI_TO_COL[usi[2]] === undefined) return false;
      if (USI_TO_ROW[usi[3]] === undefined) return false;
      return true;
    }

    // 通常移動形式: 7g7f または 7g7f+
    if (usi.length < 4 || usi.length > 5) {
      return false;
    }

    if (USI_TO_COL[usi[0]] === undefined) return false;
    if (USI_TO_ROW[usi[1]] === undefined) return false;
    if (USI_TO_COL[usi[2]] === undefined) return false;
    if (USI_TO_ROW[usi[3]] === undefined) return false;

    if (usi.length === 5 && usi[4] !== '+') {
      return false;
    }

    return true;
  }

  /**
   * 複数のUSI移動を内部形式の配列に変換
   * @param {string} usiMoves - スペース区切りのUSI移動列
   * @param {string} startingPlayer - 開始プレイヤー ('player' or 'cpu')
   * @returns {Array} 内部移動オブジェクトの配列
   */
  static parseUsiMoves(usiMoves, startingPlayer = 'player') {
    const moves = usiMoves.trim().split(/\s+/);
    let currentPlayer = startingPlayer;

    return moves.map(usi => {
      const move = this.fromUsi(usi, currentPlayer);
      currentPlayer = currentPlayer === 'player' ? 'cpu' : 'player';
      return move;
    });
  }
}
