/**
 * @jest-environment node
 */
import { normalizeHex } from './color';

describe('normalizeHex', () => {
    it('normalizes 3- and 6-digit hex with or without #', () => {
        expect(normalizeHex('#f00')).toBe('FF0000');
        expect(normalizeHex('#ff0000')).toBe('FF0000');
        expect(normalizeHex('ff0000')).toBe('FF0000');
        expect(normalizeHex('#AbCdEf')).toBe('ABCDEF');
    });

    it('drops alpha from 8-digit hex', () => {
        expect(normalizeHex('#ff000080')).toBe('FF0000');
    });

    it('parses rgb() and rgba()', () => {
        expect(normalizeHex('rgb(255, 0, 0)')).toBe('FF0000');
        expect(normalizeHex('rgba(0, 128, 255, 0.5)')).toBe('0080FF');
    });

    it('resolves named colors', () => {
        expect(normalizeHex('red')).toBe('FF0000');
        expect(normalizeHex('White')).toBe('FFFFFF');
    });

    it('returns undefined for transparent/empty/unknown', () => {
        expect(normalizeHex('transparent')).toBeUndefined();
        expect(normalizeHex('')).toBeUndefined();
        expect(normalizeHex(undefined)).toBeUndefined();
        expect(normalizeHex(null)).toBeUndefined();
        expect(normalizeHex('notacolor')).toBeUndefined();
        expect(normalizeHex('#12')).toBeUndefined();
    });
});
