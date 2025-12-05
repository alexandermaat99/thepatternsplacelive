import { NextRequest, NextResponse } from 'next/server';
import { sendProductDeliveryEmail } from '@/lib/email';
import { watermarkPDF, isPDF } from '@/lib/watermark';
import { validateSafeUrl, safeFetch } from '@/lib/url-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, productTitle, productDescription, customerName, sellerName, orderId, pdfUrl } =
      body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    if (!productTitle) {
      return NextResponse.json(
        { success: false, error: 'Product title is required' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('📧 Sending test purchase email to:', email);

    // Prepare attachments if PDF URL is provided
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];

    if (pdfUrl) {
      try {
        console.log('📥 Downloading PDF from:', pdfUrl);

        // Validate URL to prevent SSRF attacks
        // Allow Supabase storage URLs and other public HTTPS URLs
        const validation = validateSafeUrl(pdfUrl, [
          '*.supabase.co',
          '*.supabase.in', // Supabase India region
        ]);

        if (!validation.isValid) {
          throw new Error(`Invalid PDF URL: ${validation.error}`);
        }

        // Download PDF using safe fetch
        const response = await safeFetch(pdfUrl, ['*.supabase.co', '*.supabase.in']);
        if (!response.ok) {
          throw new Error(`Failed to download PDF: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        let pdfBuffer = Buffer.from(arrayBuffer);

        // Extract filename from URL or use default
        const urlPath = new URL(pdfUrl).pathname;
        const fileName = urlPath.split('/').pop() || 'test-pattern.pdf';
        const cleanFileName = fileName.includes('?') ? fileName.split('?')[0] : fileName;

        console.log('🎨 Watermarking PDF with email:', email);

        // Watermark the PDF
        if (isPDF(cleanFileName, 'application/pdf')) {
          try {
            const watermarkedPDF = await watermarkPDF(new Uint8Array(pdfBuffer), email);
            pdfBuffer = Buffer.from(watermarkedPDF);
            console.log('✅ PDF watermarked successfully');
          } catch (watermarkError) {
            console.error('⚠️ Watermarking failed, sending original PDF:', watermarkError);
            // Continue with original PDF if watermarking fails
          }
        }

        attachments.push({
          filename: cleanFileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });

        console.log('📎 PDF attached:', cleanFileName, `(${pdfBuffer.length} bytes)`);
      } catch (pdfError) {
        console.error('❌ Error processing PDF:', pdfError);
        // Continue without PDF attachment if download/processing fails
      }
    }

    // Send purchase completion email using the same function as real purchases
    const emailResult = await sendProductDeliveryEmail({
      customerEmail: email,
      customerName: customerName || undefined,
      productTitle,
      productDescription: productDescription || undefined,
      sellerName: sellerName || undefined,
      orderId: orderId || `TEST-${Date.now()}`,
      attachments,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    console.log('✅ Test purchase email sent successfully! Message ID:', emailResult.messageId);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      sentTo: email,
    });
  } catch (error) {
    console.error('❌ Error sending test purchase email:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
