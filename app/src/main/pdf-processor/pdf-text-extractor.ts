import { promises as fs } from 'fs';

export async function extractPDFText(
    filePath: string,
): Promise<{ text: string; numPages: number }> {
    try {
        // Read the PDF file
        const dataBuffer = await fs.readFile(filePath);

        // Try pdf2json first as it's more reliable
        try {
            const PDFParser = require('pdf2json');

            return new Promise((resolve, reject) => {
                const pdfParser = new PDFParser();

                pdfParser.on('pdfParser_dataError', (errData: any) => {
                    console.warn('pdf2json failed:', errData);
                    reject(errData);
                });

                pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
                    try {
                        // Extract text from pdf2json data
                        let text = '';
                        let pageCount = 0;

                        if (pdfData.Pages) {
                            pageCount = pdfData.Pages.length;

                            for (const page of pdfData.Pages) {
                                if (page.Texts) {
                                    for (const textItem of page.Texts) {
                                        if (textItem.R) {
                                            for (const run of textItem.R) {
                                                if (run.T) {
                                                    // Decode URI component (pdf2json encodes text)
                                                    text +=
                                                        decodeURIComponent(
                                                            run.T,
                                                        ) + ' ';
                                                }
                                            }
                                        }
                                    }
                                }
                                text += '\n\n'; // Add page breaks
                            }
                        }

                        resolve({
                            text: text.trim(),
                            numPages: pageCount,
                        });
                    } catch (parseError) {
                        reject(parseError);
                    }
                });

                pdfParser.parseBuffer(dataBuffer);
            });
        } catch (pdf2jsonError) {
            console.warn('pdf2json failed, trying pdf-parse:', pdf2jsonError);

            // Fallback to pdf-parse with workaround
            try {
                const pdfParse = require('pdf-parse');

                // Try to prevent the test file access by providing options
                const options = {
                    // Disable internal test file loading
                    max: 0,
                    version: 'default',
                };

                const pdfData = await pdfParse(dataBuffer, options);

                return {
                    text: pdfData.text || '',
                    numPages: pdfData.numpages || 0,
                };
            } catch (parseError) {
                console.warn(
                    'pdf-parse also failed, using fallback:',
                    parseError,
                );

                // Final fallback to manual extraction
                const text = extractTextFromPDFBuffer(dataBuffer);
                return {
                    text:
                        text ||
                        'PDF content could not be extracted due to parsing limitations.',
                    numPages: 1,
                };
            }
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
