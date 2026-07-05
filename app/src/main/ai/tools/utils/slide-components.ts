import { createTextBox } from '../../../../common/domain/entities/element-factory';
import type { ContentElement } from '../../../../common/domain/entities/types';
import type { PresentationService } from '../../../presentation/service';
import { sanitizeTextContent } from './html-sanitizer';

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export interface StyledTextOptions {
    fontSize: number;
    color: string;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
}

export function styledParagraph(
    text: string,
    options: StyledTextOptions,
): string {
    const alignClass =
        options.align && options.align !== 'left'
            ? ` class='ql-align-${options.align}'`
            : '';
    const span = `<span style='font-size: ${options.fontSize}px; color: ${options.color}'>${escapeHtml(text)}</span>`;
    const inner = options.bold ? `<strong>${span}</strong>` : span;
    return `<p${alignClass}>${inner}</p>`;
}

export function addTextElement(
    presentationService: PresentationService,
    slideId: string,
    html: string,
    position: { x: number; y: number },
    size: { width: number; height: number },
    zIndex: number,
    verticalAlign: 'top' | 'middle' | 'bottom',
): ContentElement {
    const cleaned = sanitizeTextContent(html);
    const element = createTextBox({
        content: cleaned.html,
        position,
        size,
        verticalAlign,
        zIndex,
    });
    presentationService.addElement(slideId, element);
    return element;
}
