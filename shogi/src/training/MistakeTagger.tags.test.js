import { describe, it, expect } from 'vitest';
import { extractPieceType, detectPatterns, buildTags } from './MistakeTagger.js';

const INITIAL = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
// ３三(row2,col6)に cpu の歩がいる初期局面(実際に歩がいる)
// bestMove '8h3c+' は駒取り

describe('extractPieceType', () => {
    it('移動・成り・打ちのテキストから駒種を抽出する', () => {
        expect(extractPieceType('３三 角成')).toBe('角');
        expect(extractPieceType('７六 歩')).toBe('歩');
        expect(extractPieceType('５五歩打')).toBe('歩');
        expect(extractPieceType('２八 飛')).toBe('飛');
    });

    it('成駒の移動も抽出できる', () => {
        expect(extractPieceType('３三 馬')).toBe('馬');
        expect(extractPieceType('５五 と')).toBe('と');
    });

    it('駒種が見つからなければ null', () => {
        expect(extractPieceType('')).toBeNull();
        expect(extractPieceType(null)).toBeNull();
    });
});

describe('detectPatterns', () => {
    it('着手後に大きく駒損していれば material_loss', () => {
        const sfens = [
            INITIAL,                 // ply1 の前
            INITIAL,                 // ply1 の後(ダミー)
            // ply2 の後: player の角が相手持ち駒に(タダ損)
            'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/7R1/LNSGKGSNL b b 1',
        ];
        const patterns = detectPatterns({ ply: 1, sfens, bestMove: null });
        expect(patterns).toContain('material_loss');
    });

    it('駒割に変化がなければ material_loss は付かない', () => {
        const sfens = [INITIAL, INITIAL, INITIAL];
        expect(detectPatterns({ ply: 1, sfens, bestMove: null }))
            .not.toContain('material_loss');
    });

    it('最善手が駒取りだったのに指していなければ missed_capture', () => {
        // 3c(３三)には cpu の歩がいる → bestMove 2b3c+ は駒取り
        const sfens = [INITIAL, INITIAL, INITIAL];
        const patterns = detectPatterns({ ply: 1, sfens, bestMove: '2b3c+' });
        expect(patterns).toContain('missed_capture');
    });

    it('最善手の移動先に相手駒がいなければ missed_capture は付かない', () => {
        const sfens = [INITIAL, INITIAL, INITIAL];
        expect(detectPatterns({ ply: 1, sfens, bestMove: '7g7f' }))
            .not.toContain('missed_capture');
    });

    it('対局終了間際で相手の応手が無い場合も落ちない', () => {
        const sfens = [INITIAL, INITIAL]; // sfens[ply+1] が無い
        expect(() => detectPatterns({ ply: 1, sfens, bestMove: '7g7f' })).not.toThrow();
    });
});

describe('buildTags', () => {
    it('phase / pieceType / patterns をまとめて返す', () => {
        const sfens = [
            INITIAL, INITIAL,
            'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/7R1/LNSGKGSNL b b 1',
        ];
        const tags = buildTags({ ply: 1, moveText: '３三 角成', sfens, bestMove: '2b3c+' });
        expect(tags.phase).toBe('opening');
        expect(tags.pieceType).toBe('角');
        expect(tags.patterns).toContain('material_loss');
    });
});
