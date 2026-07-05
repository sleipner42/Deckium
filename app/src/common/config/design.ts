import type { ElementShadow } from '../domain/entities/types';

export const SHADOW_CSS: Record<ElementShadow, string> = {
    none: 'none',
    soft: '0 2px 8px rgba(0, 0, 0, 0.12)',
    medium: '0 6px 20px rgba(0, 0, 0, 0.18)',
};

export function shadowCss(shadow?: ElementShadow): string {
    return SHADOW_CSS[shadow ?? 'none'];
}
