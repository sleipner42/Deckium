import { ipcMain } from 'electron';

export interface TextMeasurementRequest {
  content: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  lineHeight?: number;
}

export interface TextMeasurementResult {
  actualHeight: number;
  actualWidth: number;
  lineCount: number;
  naturalWidth: number; // Width without any constraints
  hasOverflow: boolean;
  lineBreaks: string[]; // Array of lines after wrapping
}

export function setupTextMeasurementIPC() {
  ipcMain.handle(
    'text-measurement:measure',
    async (
      event,
      request: TextMeasurementRequest,
    ): Promise<TextMeasurementResult> => {
      // This will be handled by the renderer process
      // We'll forward this to the main window
      const { mainWindow } = global;
      if (!mainWindow) {
        throw new Error('Main window not available for text measurement');
      }

      try {
        const result = await mainWindow.webContents.executeJavaScript(`
        (() => {
          const measureText = (content, fontSize, fontFamily, width, lineHeight) => {
            // Create a temporary div for measurement
            const testDiv = document.createElement('div');
            testDiv.style.position = 'absolute';
            testDiv.style.visibility = 'hidden';
            testDiv.style.whiteSpace = 'pre-wrap';
            testDiv.style.wordWrap = 'break-word';
            testDiv.style.fontSize = fontSize + 'px';
            testDiv.style.fontFamily = fontFamily;
            testDiv.style.lineHeight = lineHeight ? lineHeight : '1.2';
            testDiv.style.padding = '0';
            testDiv.style.margin = '0';
            testDiv.style.border = 'none';
            testDiv.style.width = width + 'px';
            testDiv.textContent = content;
            
            document.body.appendChild(testDiv);
            
            const actualHeight = testDiv.offsetHeight;
            const actualWidth = testDiv.offsetWidth;
            
            // Measure natural width without constraints
            testDiv.style.width = 'auto';
            testDiv.style.whiteSpace = 'nowrap';
            const naturalWidth = testDiv.offsetWidth;
            
            // Get line breaks by measuring each character position
            testDiv.style.width = width + 'px';
            testDiv.style.whiteSpace = 'pre-wrap';
            
            const range = document.createRange();
            const lines = [];
            let currentLine = '';
            let lastTop = -1;
            
            // Split content into lines based on actual rendering
            for (let i = 0; i <= content.length; i++) {
              range.setStart(testDiv.firstChild, 0);
              range.setEnd(testDiv.firstChild, i);
              const rect = range.getBoundingClientRect();
              
              if (lastTop !== -1 && rect.top > lastTop) {
                // New line detected
                lines.push(currentLine);
                currentLine = content[i - 1] || '';
              } else {
                currentLine += content[i - 1] || '';
              }
              lastTop = rect.top;
            }
            
            if (currentLine) {
              lines.push(currentLine);
            }
            
            document.body.removeChild(testDiv);
            
            return {
              actualHeight,
              actualWidth,
              lineCount: lines.length,
              naturalWidth,
              hasOverflow: actualHeight > ${request.width}, // This might need adjustment
              lineBreaks: lines
            };
          };
          
          return measureText('${request.content.replace(/'/g, "\\'")}', ${request.fontSize}, '${request.fontFamily}', ${request.width}, ${request.lineHeight || 1.2});
        })()
      `);

        return result;
      } catch (error) {
        console.error('Error measuring text:', error);
        // Fallback to estimation
        throw error;
      }
    },
  );
}
