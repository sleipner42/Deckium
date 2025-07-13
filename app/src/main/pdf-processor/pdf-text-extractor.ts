import { promises as fs } from 'fs';

export async function extractPDFText(
    filePath: string,
): Promise<{ text: string; numPages: number }> {
    try {
        // Read the PDF file
        const dataBuffer = await fs.readFile(filePath);

        // Try to parse with pdf-parse
        try {
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(dataBuffer);

            return {
                text: pdfData.text || '',
                numPages: pdfData.numpages || 0,
            };
        } catch (parseError) {
            console.warn('pdf-parse failed, attempting fallback:', parseError);

            // If pdf-parse fails due to test file issue, provide basic extraction
            if (
                parseError instanceof Error &&
                parseError.message.includes('test/data')
            ) {
                console.log(
                    'Detected pdf-parse test file issue, using fallback approach',
                );

                // Simple text extraction fallback
                const text = extractTextFromPDFBuffer(dataBuffer);
                return {
                    text:
                        text ||
                        'PDF content could not be extracted due to parsing limitations.',
                    numPages: 1, // We can't determine page count without proper parsing
                };
            }

            throw parseError;
        }
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error(
            `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

function extractTextFromPDFBuffer(buffer: Buffer): string {
    try {
        // Convert buffer to string and look for readable text patterns
        const pdfString = buffer.toString('latin1');

        // Look for text in PDF streams - more comprehensive approach
        const textPatterns = [
            // Text in parentheses (most common)
            /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)/g,
            // Text in angle brackets
            /<([^<>]*)>/g,
            // Text after Tj or TJ operators
            /\s+\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*Tj/g,
            // Text in square brackets for arrays
            /\[\s*\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*\]/g,
        ];

        let extractedTexts: string[] = [];

        for (const pattern of textPatterns) {
            let match;
            while ((match = pattern.exec(pdfString)) !== null) {
                const text = match[1];
                if (text && text.length > 0) {
                    // Decode basic PDF escape sequences
                    const decodedText = text
                        .replace(/\\n/g, '\n')
                        .replace(/\\r/g, '\r')
                        .replace(/\\t/g, '\t')
                        .replace(/\\\(/g, '(')
                        .replace(/\\\)/g, ')')
                        .replace(/\\\\/g, '\\')
                        // Filter out control characters and binary data
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '')
                        .trim();

                    // Only include text that looks like readable content
                    if (
                        decodedText.length >= 2 &&
                        /[a-zA-Z\s]/.test(decodedText)
                    ) {
                        extractedTexts.push(decodedText);
                    }
                }
            }
        }

        if (extractedTexts.length > 0) {
            // Remove duplicates and join
            const uniqueTexts = [...new Set(extractedTexts)];
            const result = uniqueTexts.join(' ').trim();

            if (result.length > 10) {
                // Ensure we have substantial text
                return result;
            }
        }

        return 'PDF contains text but could not be extracted using fallback method. The PDF may use advanced encoding or be image-based.';
    } catch (error) {
        console.error('Fallback text extraction failed:', error);
        return 'PDF text extraction failed due to parsing error.';
    }
}
