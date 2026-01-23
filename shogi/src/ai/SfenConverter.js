/**
 * SFEN (Shogi Forsyth-Edwards Notation) Converter
 * 内部形式とSFEN形式の相互変換を行う
 */

// 内部駒名 → SFEN駒文字のマッピング
const PIECE_TO_SFEN = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S',
  '金': 'G', '角': 'B', '飛': 'R', '王': 'K', '玉': 'K',
  '!と': '+P', '!杏': '+L', '!圭': '+N', '!全': '+S',
  '!馬': '+B', '!竜': '+R'
};

// SFEN駒文字 → 内部駒名のマッピング
const SFEN_TO_PIECE = {
  'P': '歩', 'L': '香', 'N': '桂', 'S': '銀',
  'G': '金', 'B': '角', 'R': '飛', 'K': '王',
  '+P': '!と', '+L': '!杏', '+N': '!圭', '+S': '!全',
  '+B': '!馬', '+R': '!竜'
};

// 持ち駒の順序（SFENの標準順序）
const HAND_PIECE_ORDER = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

export class SfenConverter {
  /**
   * 内部盤面表現をSFEN形式に変換
   * @param {Array} board - 9x9の盤面配列
   * @param {Array} playerCaptured - プレイヤーの持ち駒
   * @param {Array} cpuCaptured - CPUの持ち駒
   * @param {string} currentPlayer - 現在の手番 ('player' or 'cpu')
   * @param {number} moveCount - 手数（デフォルト1）
   * @returns {string} SFEN形式の文字列
   */
  static boardToSfen(board, playerCaptured, cpuCaptured, currentPlayer, moveCount = 1) {
    // 1. 盤面部分の変換
    const boardPart = this._boardToSfenBoard(board);

    // 2. 手番の変換（player=先手=b, cpu=後手=w）
    const turnPart = currentPlayer === 'player' ? 'b' : 'w';

    // 3. 持ち駒の変換
    const handPart = this._capturedToSfenHand(playerCaptured, cpuCaptured);

    // 4. 手数
    const movePart = moveCount.toString();

    return `${boardPart} ${turnPart} ${handPart} ${movePart}`;
  }

  /**
   * SFEN形式を内部盤面表現に変換
   * @param {string} sfen - SFEN形式の文字列
   * @returns {Object} { board, playerCaptured, cpuCaptured, currentPlayer, moveCount }
   */
  static sfenToBoard(sfen) {
    const parts = sfen.trim().split(' ');
    if (parts.length < 4) {
      throw new Error('Invalid SFEN format: expected 4 parts');
    }

    const [boardPart, turnPart, handPart, movePart] = parts;

    return {
      board: this._sfenBoardToBoard(boardPart),
      currentPlayer: turnPart === 'b' ? 'player' : 'cpu',
      ...this._sfenHandToCaptured(handPart),
      moveCount: parseInt(movePart, 10) || 1
    };
  }

  /**
   * 初期配置のSFENを返す
   * @returns {string}
   */
  static getInitialSfen() {
    return 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
  }

  /**
   * 盤面配列をSFEN盤面文字列に変換
   * @private
   */
  static _boardToSfenBoard(board) {
    const rows = [];

    for (let row = 0; row < 9; row++) {
      let rowStr = '';
      let emptyCount = 0;

      for (let col = 0; col < 9; col++) {
        const piece = board[row][col];

        if (piece === null) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount.toString();
            emptyCount = 0;
          }

          const sfenPiece = PIECE_TO_SFEN[piece.type];
          if (!sfenPiece) {
            throw new Error(`Unknown piece type: ${piece.type}`);
          }

          // CPUの駒（後手）は小文字、プレイヤー（先手）は大文字
          if (piece.owner === 'cpu') {
            rowStr += sfenPiece.toLowerCase();
          } else {
            rowStr += sfenPiece;
          }
        }
      }

      if (emptyCount > 0) {
        rowStr += emptyCount.toString();
      }

      rows.push(rowStr);
    }

    return rows.join('/');
  }

  /**
   * SFEN盤面文字列を盤面配列に変換
   * @private
   */
  static _sfenBoardToBoard(sfenBoard) {
    const board = Array(9).fill(null).map(() => Array(9).fill(null));
    const rows = sfenBoard.split('/');

    if (rows.length !== 9) {
      throw new Error('Invalid SFEN board: expected 9 rows');
    }

    for (let row = 0; row < 9; row++) {
      let col = 0;
      let i = 0;
      const rowStr = rows[row];

      while (i < rowStr.length && col < 9) {
        const char = rowStr[i];

        // 成り駒のチェック
        if (char === '+') {
          const nextChar = rowStr[i + 1];
          const sfenPiece = '+' + nextChar.toUpperCase();
          const pieceType = SFEN_TO_PIECE[sfenPiece];

          if (!pieceType) {
            throw new Error(`Unknown promoted piece: ${sfenPiece}`);
          }

          const isUpperCase = nextChar === nextChar.toUpperCase();
          board[row][col] = {
            type: pieceType,
            owner: isUpperCase ? 'player' : 'cpu',
            promoted: true
          };

          col++;
          i += 2;
        }
        // 数字（空きマス）
        else if (char >= '1' && char <= '9') {
          col += parseInt(char, 10);
          i++;
        }
        // 通常の駒
        else {
          const sfenPiece = char.toUpperCase();
          const pieceType = SFEN_TO_PIECE[sfenPiece];

          if (!pieceType) {
            throw new Error(`Unknown piece: ${char}`);
          }

          const isUpperCase = char === char.toUpperCase();
          board[row][col] = {
            type: pieceType,
            owner: isUpperCase ? 'player' : 'cpu',
            promoted: false
          };

          col++;
          i++;
        }
      }
    }

    return board;
  }

  /**
   * 持ち駒をSFEN形式に変換
   * @private
   */
  static _capturedToSfenHand(playerCaptured, cpuCaptured) {
    const playerHand = this._countCapturedPieces(playerCaptured);
    const cpuHand = this._countCapturedPieces(cpuCaptured);

    let result = '';

    // 先手（プレイヤー）の持ち駒（大文字）
    for (const sfenPiece of HAND_PIECE_ORDER) {
      const pieceType = SFEN_TO_PIECE[sfenPiece];
      const count = playerHand[pieceType] || 0;
      if (count > 0) {
        result += count > 1 ? count.toString() + sfenPiece : sfenPiece;
      }
    }

    // 後手（CPU）の持ち駒（小文字）
    for (const sfenPiece of HAND_PIECE_ORDER) {
      const pieceType = SFEN_TO_PIECE[sfenPiece];
      const count = cpuHand[pieceType] || 0;
      if (count > 0) {
        result += count > 1 ? count.toString() + sfenPiece.toLowerCase() : sfenPiece.toLowerCase();
      }
    }

    return result || '-';
  }

  /**
   * SFEN持ち駒形式を内部形式に変換
   * @private
   */
  static _sfenHandToCaptured(sfenHand) {
    const playerCaptured = [];
    const cpuCaptured = [];

    if (sfenHand === '-') {
      return { playerCaptured, cpuCaptured };
    }

    let i = 0;
    while (i < sfenHand.length) {
      let count = 1;

      // 数字があれば枚数
      if (sfenHand[i] >= '0' && sfenHand[i] <= '9') {
        let numStr = '';
        while (i < sfenHand.length && sfenHand[i] >= '0' && sfenHand[i] <= '9') {
          numStr += sfenHand[i];
          i++;
        }
        count = parseInt(numStr, 10);
      }

      if (i >= sfenHand.length) break;

      const char = sfenHand[i];
      const sfenPiece = char.toUpperCase();
      const pieceType = SFEN_TO_PIECE[sfenPiece];

      if (!pieceType) {
        throw new Error(`Unknown hand piece: ${char}`);
      }

      const isUpperCase = char === char.toUpperCase();
      const targetArray = isUpperCase ? playerCaptured : cpuCaptured;
      const owner = isUpperCase ? 'player' : 'cpu';

      for (let j = 0; j < count; j++) {
        targetArray.push({
          type: pieceType,
          owner: owner,
          promoted: false
        });
      }

      i++;
    }

    return { playerCaptured, cpuCaptured };
  }

  /**
   * 持ち駒の種類と枚数をカウント
   * @private
   */
  static _countCapturedPieces(captured) {
    const counts = {};
    for (const piece of captured) {
      // 成り駒は成る前の駒として数える
      const baseType = this._getBasePieceType(piece.type);
      counts[baseType] = (counts[baseType] || 0) + 1;
    }
    return counts;
  }

  /**
   * 成り駒を元の駒種に変換
   * @private
   */
  static _getBasePieceType(type) {
    const promotedToBase = {
      '!と': '歩', '!杏': '香', '!圭': '桂', '!全': '銀',
      '!馬': '角', '!竜': '飛'
    };
    return promotedToBase[type] || type;
  }
}
