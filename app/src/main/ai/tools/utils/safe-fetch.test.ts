import { assertPublicUrl, assertSafeRedirect } from './safe-fetch';

describe('assertPublicUrl', () => {
    const blocked = [
        'http://127.0.0.1/',
        'http://localhost/',
        'http://sub.localhost/x',
        'http://169.254.169.254/latest/meta-data/', // cloud metadata
        'http://10.0.0.5/',
        'http://192.168.1.1/',
        'http://172.16.0.1/',
        'http://0.0.0.0/',
        'http://[::1]/',
        'http://[fe80::1]/',
        'https://100.64.0.1/',
    ];
    for (const url of blocked) {
        it(`rejects ${url}`, async () => {
            await expect(assertPublicUrl(url)).rejects.toThrow();
        });
    }

    it('rejects non-http(s) schemes', async () => {
        await expect(assertPublicUrl('ftp://example.com')).rejects.toThrow(
            /http and https/,
        );
        await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow();
    });

    it('rejects invalid URLs', async () => {
        await expect(assertPublicUrl('not a url')).rejects.toThrow(
            /Invalid URL/,
        );
    });

    it('allows a public IP literal', async () => {
        const url = await assertPublicUrl('http://8.8.8.8/');
        expect(url.hostname).toBe('8.8.8.8');
    });
});

describe('assertSafeRedirect', () => {
    it('blocks redirects to local/private hosts', () => {
        expect(() => assertSafeRedirect({ hostname: '127.0.0.1' })).toThrow();
        expect(() => assertSafeRedirect({ hostname: 'localhost' })).toThrow();
        expect(() =>
            assertSafeRedirect({ hostname: '169.254.169.254' }),
        ).toThrow();
    });

    it('allows redirects to public hosts', () => {
        expect(() =>
            assertSafeRedirect({ hostname: 'example.com' }),
        ).not.toThrow();
        expect(() => assertSafeRedirect({ hostname: '8.8.8.8' })).not.toThrow();
    });
});
