import { probeDimensions } from '../../main/ai/tools/utils/image-probe';

describe('image-probe', () => {
    it('returns null for undecodable buffers instead of throwing', () => {
        expect(probeDimensions(Buffer.from('not an image'))).toBeNull();
        expect(probeDimensions(Buffer.alloc(0))).toBeNull();
        expect(probeDimensions(Buffer.from('<svg></svg>', 'utf-8'))).toBeNull();
    });
});
