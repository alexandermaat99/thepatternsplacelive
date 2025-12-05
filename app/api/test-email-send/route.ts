import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { watermarkPDF, isPDF } from '@/lib/watermark';
import { validateSafeUrl, safeFetch } from '@/lib/url-validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email');
    const pdfUrl = searchParams.get('pdfUrl');

    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.RESEND_FROM_NAME || 'The Patterns Place';

    console.log('📧 Sending test email to:', testEmail);

    // Prepare attachments if PDF URL is provided
    const attachments: Array<{
      filename: string;
      content: Buffer;
      content_type: string;
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
        const fileName = urlPath.split('/').pop() || 'test-document.pdf';
        const cleanFileName = fileName.includes('?') ? fileName.split('?')[0] : fileName;

        console.log('🎨 Watermarking PDF with email:', testEmail);

        // Watermark the PDF
        if (isPDF(cleanFileName, 'application/pdf')) {
          try {
            const watermarkedPDF = await watermarkPDF(new Uint8Array(pdfBuffer), testEmail);
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
          content_type: 'application/pdf',
        });

        console.log('📎 PDF attached:', cleanFileName, `(${pdfBuffer.length} bytes)`);
      } catch (pdfError) {
        console.error('❌ Error processing PDF:', pdfError);
        // Continue without PDF attachment if download/processing fails
      }
    }

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: testEmail,
      subject: pdfUrl
        ? 'Test Email with Watermarked PDF - The Patterns Place'
        : 'Test Email from The Patterns Place',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #667eea;">Test Email${pdfUrl ? ' with Watermarked PDF' : ''}</h1>
          <p>This is a test email to verify Resend is working correctly.</p>
          ${pdfUrl ? '<p><strong>📎 A watermarked PDF is attached to this email.</strong></p>' : ''}
          <p>If you received this, Resend is configured properly!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          ${pdfUrl ? '<p><strong>Watermark:</strong> Your email address (' + testEmail + ') has been embedded in the PDF.</p>' : ''}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">This is an automated test message.</p>
        </div>
      `,
      text: `Test Email${pdfUrl ? ' with Watermarked PDF' : ''}\n\nThis is a test email to verify Resend is working correctly.\n\n${pdfUrl ? 'A watermarked PDF is attached to this email.\n' : ''}If you received this, Resend is configured properly!\n\nTimestamp: ${new Date().toISOString()}`,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error.message || 'Failed to send email',
          details: result.error,
        },
        { status: 500 }
      );
    }

    console.log('✅ Test email sent successfully! Message ID:', result.data?.id);

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
      sentTo: testEmail,
    });
  } catch (error) {
    console.error('❌ Error sending test email:', error);
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
