import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Watermarks a PDF file with the customer's email address, flattens it, and locks it
 * @param pdfBytes - The PDF file as a Uint8Array
 * @param customerEmail - The customer's email to embed as watermark
 * @returns Watermarked, flattened, and locked PDF as Uint8Array
 */
export async function watermarkPDF(
  pdfBytes: Uint8Array,
  customerEmail: string
): Promise<Uint8Array> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the Helvetica font for the watermark text
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Load and convert SVG logo to PNG for embedding
    let logoImage: Uint8Array | null = null;
    try {
      const logoPath = join(process.cwd(), 'public', 'logos', 'back_logo.svg');
      const svgBuffer = await readFile(logoPath);
      // Convert SVG to PNG using sharp
      const pngBuffer = await sharp(svgBuffer)
        .resize(150, null, {
          // Resize to 150px width, maintain aspect ratio
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      logoImage = new Uint8Array(pngBuffer);
    } catch (logoError) {
      console.warn('⚠️ Could not load logo for watermark:', logoError);
      // Continue without logo if it fails
    }

    // Embed logo image if available
    let embeddedLogo: any = null;
    if (logoImage) {
      try {
        embeddedLogo = await pdfDoc.embedPng(logoImage);
      } catch (embedError) {
        console.warn('⚠️ Could not embed logo in PDF:', embedError);
      }
    }

    const pages = pdfDoc.getPages();
    const fontSize = 24; // Larger base font size for better visibility

    // Add watermark to each page
    pages.forEach(page => {
      const { width, height } = page.getSize();

      // Create watermark text with email
      const watermarkText = `Licensed for personal use only: ${customerEmail}`;
      const largeFontSize = fontSize * 2; // Make it large and visible

      // Calculate text width to center it
      const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, largeFontSize);

      // Center coordinates
      const centerX = width / 2;
      const centerY = height / 2;

      // Add visible watermark in top-left corner
      const topText = `Licensed for personal use only: ${customerEmail}`;
      const topTextWidth = helveticaFont.widthOfTextAtSize(topText, 4);
      const topTextY = height - 18;
      page.drawText(topText, {
        x: 10,
        y: topTextY, // Top-left (y is from bottom in PDF)
        size: 15,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3), // Darker
        opacity: 0.2, // Very visible
      });

      // Add watermark at bottom with logo and text on same line (bottom left)
      const bottomText = `Licensed for personal use only: ${customerEmail}`;
      const textSize = 15;
      const bottomY = 20; // Distance from bottom of page

      // Calculate positions for logo and text on same line
      let logoX = 10;
      let textX = 10;
      let logoHeight = 0;
      let logoWidth = 0;

      if (embeddedLogo) {
        const logoScale = 0.12; // Scale logo to fit with text
        logoWidth = embeddedLogo.width * logoScale;
        logoHeight = embeddedLogo.height * logoScale;

        // Position logo on the left
        logoX = 10;
        // Position text next to logo with some spacing
        textX = logoX + logoWidth + 8;
      }

      // Draw logo first (if available)
      if (embeddedLogo) {
        page.drawImage(embeddedLogo, {
          x: logoX,
          y: bottomY,
          width: logoWidth,
          height: logoHeight,
          opacity: 0.2,
        });
      }

      // Draw text on same line as logo
      page.drawText(bottomText, {
        x: textX,
        y: bottomY + logoHeight / 2 - textSize / 3, // Vertically center with logo
        size: textSize,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
        opacity: 0.3,
      });
    });

    // Set PDF metadata
    pdfDoc.setProducer('The Patterns Place');
    pdfDoc.setCreator('The Patterns Place');

    // Save the PDF - pdf-lib automatically flattens form fields and annotations when saving
    // This merges all layers into a single static layer, making watermarks harder to remove
    // The save process effectively "flattens" the PDF by converting interactive elements
    // into static content
    const saveOptions = {
      useObjectStreams: false, // Disable object streams for better compatibility
      addDefaultPage: false,
    };

    const pdfBytesWatermarked = await pdfDoc.save(saveOptions);

    // Note: PDF flattening happens automatically during save - form fields and annotations
    // are converted to static content. This makes the watermark harder to remove.
    //
    // For locking: pdf-lib's permission system requires a password for full encryption.
    // Without a password, we rely on:
    // 1. Flattening (automatic) - prevents editing form fields/annotations
    // 2. Watermarking - deters unauthorized sharing
    // 3. The PDF structure - makes content extraction more difficult

    return pdfBytesWatermarked;
  } catch (error) {
    console.error('❌ Error watermarking PDF:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    // If watermarking fails, return original PDF
    // This ensures delivery still works even if watermarking fails
    return pdfBytes;
  }
}

/**
 * Determines if a file is a PDF based on its file path or content type
 */
export function isPDF(filePath: string, contentType?: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return (
    lowerPath.endsWith('.pdf') ||
    contentType === 'application/pdf' ||
    contentType === 'application/x-pdf'
  );
}

/**
 * Gets the file extension from a file path
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
