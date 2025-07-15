#!/bin/bash

# Install PDF processing dependencies
echo "Installing PDF processing dependencies..."

npm install pdf-parse

echo "PDF dependencies installation complete!"
echo ""
echo "Installed packages:"
echo "- pdf-parse: For extracting text content from PDFs"
echo "- pdf-lib: Already installed - for extracting embedded images"
echo ""
echo "Note: This implementation extracts only embedded images from PDFs, not full page screenshots."
echo ""
echo "You can now use the PDF processing functionality:"
echo "1. Use getPDFContent tool to list available PDFs"
echo "2. Process PDFs through the File menu (when implemented)"
echo "3. Use addImageFromPDF tool to add actual embedded images to slides"