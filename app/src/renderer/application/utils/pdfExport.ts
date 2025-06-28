import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Presentation, Slide, TextBox } from '../../../common/domain/entities/types';
import { PRESENTATION_DIMENSIONS } from '../../../common/utils/constants';
import { StandaloneSlideRenderer } from '../components/presentation/StandaloneSlideRenderer';

export interface PDFExportOptions {
  quality: number; // 1-3, where 3 is highest quality
  includeSlideNumbers: boolean;
  pageFormat: 'landscape' | 'portrait';
  backgroundColor: string;
}

export interface PDFExportProgress {
  currentSlide: number;
  totalSlides: number;
  status: 'preparing' | 'rendering' | 'generating' | 'complete' | 'error';
  message: string;
}

export class PDFExportService {
  private onProgress?: (progress: PDFExportProgress) => void;

  constructor(onProgress?: (progress: PDFExportProgress) => void) {
    this.onProgress = onProgress;
  }

  async exportPresentationToPDF(
    presentation: Presentation,
    filename: string,
    options: Partial<PDFExportOptions> = {}
  ): Promise<void> {
    const defaultOptions: PDFExportOptions = {
      quality: 2,
      includeSlideNumbers: false,
      pageFormat: 'landscape',
      backgroundColor: '#ffffff',
      ...options,
    };

    try {
      this.reportProgress(0, presentation.slides.length, 'preparing', 'Preparing export...');

      // Create PDF document
      const pdf = new jsPDF({
        orientation: defaultOptions.pageFormat,
        unit: 'px',
        format: [PRESENTATION_DIMENSIONS.WIDTH, PRESENTATION_DIMENSIONS.HEIGHT],
        compress: true,
      });

      // Process each slide
      for (let i = 0; i < presentation.slides.length; i++) {
        const slide = presentation.slides[i];
        
        this.reportProgress(
          i + 1,
          presentation.slides.length,
          'rendering',
          `Rendering slide ${i + 1} of ${presentation.slides.length}...`
        );

        // Render slide to canvas (without text for background)
        const canvas = await this.renderSlideToCanvas(slide, defaultOptions, true);

        // Add page (except for first slide)
        if (i > 0) {
          pdf.addPage([PRESENTATION_DIMENSIONS.WIDTH, PRESENTATION_DIMENSIONS.HEIGHT], defaultOptions.pageFormat);
        }

        // Add slide image to PDF
        const imgData = canvas.toDataURL('image/png', defaultOptions.quality / 3);
        pdf.addImage(
          imgData,
          'PNG',
          0,
          0,
          PRESENTATION_DIMENSIONS.WIDTH,
          PRESENTATION_DIMENSIONS.HEIGHT,
          undefined,
          'FAST' // Use faster compression for better performance
        );

        // Add text elements as selectable text on top of the image
        this.addTextElementsToPDF(pdf, slide);

        // Add slide number if requested
        if (defaultOptions.includeSlideNumbers) {
          this.addSlideNumber(pdf, i + 1, presentation.slides.length);
        }
      }

      this.reportProgress(
        presentation.slides.length,
        presentation.slides.length,
        'generating',
        'Generating PDF file...'
      );

      // Save the PDF
      pdf.save(filename);

      this.reportProgress(
        presentation.slides.length,
        presentation.slides.length,
        'complete',
        'Export completed successfully!'
      );

    } catch (error) {
      console.error('PDF Export Error:', error);
      this.reportProgress(
        0,
        presentation.slides.length,
        'error',
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private async renderSlideToCanvas(
    slide: Slide,
    options: PDFExportOptions,
    hideText: boolean = false
  ): Promise<HTMLCanvasElement> {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-20000px'; // Hide way off-screen
    container.style.left = '-20000px';
    container.style.width = `${PRESENTATION_DIMENSIONS.WIDTH}px`;
    container.style.height = `${PRESENTATION_DIMENSIONS.HEIGHT}px`;
    container.style.background = options.backgroundColor;
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    
    document.body.appendChild(container);

    try {
      // Render the slide component
      await this.renderSlideComponent(container, slide, hideText);

      // Wait for any images or charts to load
      await this.waitForElementsToLoad(container);

      // Create canvas from the rendered slide
      const canvas = await html2canvas(container, {
        width: PRESENTATION_DIMENSIONS.WIDTH,
        height: PRESENTATION_DIMENSIONS.HEIGHT,
        scale: options.quality,
        backgroundColor: slide.background || options.backgroundColor,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure all styles are copied correctly
          const clonedContainer = clonedDoc.querySelector('[data-slide-container]') as HTMLElement;
          if (clonedContainer) {
            clonedContainer.style.transform = 'none';
            clonedContainer.style.overflow = 'hidden';
          }
        },
      });

      return canvas;
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  private async renderSlideComponent(container: HTMLElement, slide: Slide, hideText: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const root = createRoot(container);
        
        // Render the slide component using standalone renderer
        root.render(
          React.createElement(StandaloneSlideRenderer, {
            slide,
            scale: 1,
            hideText,
            style: {
              transform: 'none',
              overflow: 'hidden',
            },
          })
        );

        // Give React time to render
        setTimeout(() => {
          resolve();
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async waitForElementsToLoad(container: HTMLElement): Promise<void> {
    // Wait for images to load
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Continue even if image fails
          // Timeout after 5 seconds
          setTimeout(() => resolve(), 5000);
        }
      });
    });

    // Wait for any Plotly charts to render
    const plotlyElements = container.querySelectorAll('[data-plotly="true"]');
    const plotlyPromises = Array.from(plotlyElements).map(() => {
      return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500); // Give Plotly time to render
      });
    });

    // Wait for all elements
    await Promise.all([...imagePromises, ...plotlyPromises]);

    // Additional wait to ensure everything is stable
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  private addSlideNumber(pdf: jsPDF, currentSlide: number, totalSlides: number): void {
    const slideText = `${currentSlide} / ${totalSlides}`;
    
    // Set font for slide number
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    
    // Position slide number at bottom right
    const x = PRESENTATION_DIMENSIONS.WIDTH - 60;
    const y = PRESENTATION_DIMENSIONS.HEIGHT - 20;
    
    pdf.text(slideText, x, y);
  }

  private extractTextFromHTML(html: string): string {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extract text content while preserving some structure
    let text = '';
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent) {
        text += node.textContent + ' ';
      }
    }
    
    return text.trim();
  }

  private addTextElementsToPDF(pdf: jsPDF, slide: Slide): void {
    // Add text elements as selectable text in the PDF
    const textElements = slide.elements.filter(el => el.type === 'textbox') as TextBox[];
    
    for (const textElement of textElements) {
      if (!textElement.content) continue;
      
      const plainText = this.extractTextFromHTML(textElement.content);
      if (!plainText) continue;

      // Set up text properties
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);

      // Calculate position based on element alignment
      const elementX = textElement.position.x;
      const elementY = textElement.position.y;
      const elementWidth = textElement.size.width;
      const elementHeight = textElement.size.height;
      
      // Account for padding (consistent with StandaloneTextElement)
      const padding = 5;
      const maxWidth = elementWidth - (padding * 2);
      
      // Split text into lines
      const lines = pdf.splitTextToSize(plainText, maxWidth);
      const lineHeight = 20; // Approximate line height
      
      // Calculate vertical positioning based on verticalAlign
      let startY = elementY + padding + 16; // 16 is approximate font baseline
      if (textElement.verticalAlign === 'middle') {
        const totalTextHeight = lines.length * lineHeight;
        startY = elementY + (elementHeight - totalTextHeight) / 2 + 16;
      } else if (textElement.verticalAlign === 'bottom') {
        const totalTextHeight = lines.length * lineHeight;
        startY = elementY + elementHeight - totalTextHeight - padding + 16;
      }

      // Add each line with proper alignment
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let x = elementX + padding;
        
        // Calculate horizontal positioning based on align
        if (textElement.align === 'center') {
          x = elementX + elementWidth / 2;
        } else if (textElement.align === 'right') {
          x = elementX + elementWidth - padding;
        }
        
        const y = startY + (i * lineHeight);
        
        // Set text alignment for jsPDF
        let textAlign: 'left' | 'center' | 'right' = 'left';
        if (textElement.align === 'center') textAlign = 'center';
        else if (textElement.align === 'right') textAlign = 'right';

        pdf.text(line, x, y, { 
          align: textAlign
        });
      }
    }
  }

  private reportProgress(
    currentSlide: number,
    totalSlides: number,
    status: PDFExportProgress['status'],
    message: string
  ): void {
    if (this.onProgress) {
      this.onProgress({
        currentSlide,
        totalSlides,
        status,
        message,
      });
    }
  }
}

// Utility function for easy export
export async function exportPresentationToPDF(
  presentation: Presentation,
  filename?: string,
  options?: Partial<PDFExportOptions>,
  onProgress?: (progress: PDFExportProgress) => void
): Promise<void> {
  const exportService = new PDFExportService(onProgress);
  const finalFilename = filename || `${presentation.title || 'presentation'}.pdf`;
  
  return exportService.exportPresentationToPDF(presentation, finalFilename, options);
}