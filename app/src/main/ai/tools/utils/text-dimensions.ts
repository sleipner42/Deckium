/**
 * Utility functions for text dimension calculations and validation
 */

/**
 * Estimates the actual height and line break information for text content based on line count,
 * font size, and content width
 * This is more accurate than using the element's declared height
 *
 * @param content The text content to estimate dimensions for
 * @param fontSize The font size in pixels
 * @param width The width of the text container in pixels
 * @returns An object containing the estimated height and information about line breaks
 */
export interface TextDimensionResult {
  height: number;
  width: number;
  lineBreakInfo: string | null;
}

export function estimateTextDimensions(
  content: string,
  fontSize: number,
  width: number,
): TextDimensionResult {
  // If there's no content, return minimal dimensions
  if (!content || content.trim() === '') {
    return {
      height: fontSize * 1.2,
      width: fontSize * 2, // Minimal width for empty content
      lineBreakInfo: null,
    };
  }

  // Get all lines from explicit line breaks
  const lines = content.split('\n');
  let totalLines = 0;
  let lineBreakDetected = false;
  const longLines: { text: string; length: number; maxLength: number }[] = [];

  // Average character width for the given font size (approximation)
  const averageCharWidth = fontSize * 0.6;

  // Maximum characters per line at the given width
  const maxCharsPerLine = Math.floor((width - 10) / averageCharWidth); // 10px for padding

  // Calculate total lines accounting for wrapping
  for (const line of lines) {
    if (line.trim() === '') {
      totalLines += 1; // Count empty lines
    } else if (maxCharsPerLine > 0) {
      // Calculate how many lines this text will wrap to
      const wrappedLineCount = Math.max(
        1,
        Math.ceil(line.length / maxCharsPerLine),
      );
      totalLines += wrappedLineCount;

      // Check if this line will be broken due to width constraints
      if (line.length > maxCharsPerLine) {
        lineBreakDetected = true;
        // Store information about the first few long lines for the warning message
        if (longLines.length < 3) {
          // If line is too long, add it to our tracking array with truncated preview
          const truncatedText =
            line.length > 50 ? `${line.substring(0, 47)}...` : line;
          longLines.push({
            text: truncatedText,
            length: line.length,
            maxLength: maxCharsPerLine,
          });
        }
      }
    } else {
      totalLines += 1;
    }
  }

  // Approximate line height based on font size
  const lineHeight = fontSize * 1.2; // Reduced from 1.4 for more accurate height

  // Calculate total height with padding
  const totalHeight = totalLines * lineHeight + 10; // Reduced padding from 24px to 10px

  // For titles or very short content, ensure minimum height based on font size
  const minHeight = fontSize * 1.3;
  const estimatedHeight = Math.max(totalHeight, minHeight);

  // Calculate the estimated text width based on content
  let estimatedWidth = width; // Default to container width

  // Find the longest line to estimate natural width
  let maxLineLength = 0;
  for (const line of lines) {
    maxLineLength = Math.max(maxLineLength, line.length);
  }

  // Calculate natural width based on the longest line
  const naturalWidth = Math.ceil(maxLineLength * averageCharWidth) + 10; // Add padding

  // If natural width is less than container width and there's no wrapping
  if (naturalWidth < width && !lineBreakDetected) {
    estimatedWidth = naturalWidth;
  }

  // Generate line break warning information if needed
  let lineBreakInfo = null;
  if (lineBreakDetected) {
    lineBreakInfo =
      `Note: Text will be broken across lines due to box width constraints. If this was not intended, consider increasing the width of the text box, but remember that this can change alignment.\n` +
      `Current box width (${width}px) can fit ~${maxCharsPerLine} characters at ${fontSize}px font size.\n${longLines
        .map(
          (line) =>
            `- Line "${line.text}" has ${line.length} characters but only ${line.maxLength} will fit per line`,
        )
        .join('\n')}`;
  }

  return {
    height: estimatedHeight,
    width: estimatedWidth,
    lineBreakInfo,
  };
}
