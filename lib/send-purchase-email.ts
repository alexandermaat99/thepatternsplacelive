/**
 * Industry-standard purchase email delivery
 * Synchronous, straightforward - same pattern as test-email that works
 */
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { Resend } from 'resend';
import { watermarkPDF, isPDF } from '@/lib/watermark';

interface PurchaseEmailData {
  orderId: string;
  buyerEmail: string;
  buyerName?: string;
  productId: string;
  productTitle: string;
  productDescription?: string;
  sellerId: string;
  sellerName?: string;
  filePaths: string[];
}

export async function sendPurchaseEmail(data: PurchaseEmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
  const fromName = process.env.RESEND_FROM_NAME || 'The Patterns Place';

  // Download and process files using signed URLs (same as test-email)
  const attachments: Array<{
    filename: string;
    content: Buffer;
    content_type: string;
  }> = [];

  const supabaseAdmin = createServiceRoleClient();

  for (const filePath of data.filePaths) {
    try {
      // Create signed URL (works reliably)
      const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
        .from('product-files')
        .createSignedUrl(filePath, 3600);

      if (urlError || !signedUrlData?.signedUrl) {
        console.error(`Failed to create signed URL for ${filePath}:`, urlError);
        continue;
      }

      // Download via HTTP fetch (same as test-email)
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.error(`HTTP error downloading ${filePath}: ${response.statusText}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      let fileBuffer = Buffer.from(arrayBuffer);

      const fileName = filePath.split('/').pop() || 'file';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      const contentType = extension === 'pdf' ? 'application/pdf' : 'application/octet-stream';

      // Watermark PDFs
      if (isPDF(fileName, contentType)) {
        try {
          const watermarkedPDF = await watermarkPDF(new Uint8Array(fileBuffer), data.buyerEmail);
          fileBuffer = Buffer.from(watermarkedPDF);
        } catch (wmError) {
          console.error(`Watermarking failed for ${fileName}, using original`);
        }
      }

      attachments.push({
        filename: fileName,
        content: fileBuffer,
        content_type: contentType,
      });
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      continue;
    }
  }

  if (attachments.length === 0) {
    return { success: false, error: 'No files could be processed' };
  }

  // Send email (same pattern as test-email)
  const result = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: data.buyerEmail,
    subject: `Your Purchase: ${data.productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Thank You for Your Purchase!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Hello${data.buyerName ? ` ${data.buyerName}` : ''},</p>
          <p>Your purchase has been completed successfully! Your digital product files are attached to this email.</p>
          <p><strong>Product:</strong> ${data.productTitle}</p>
          ${data.productDescription ? `<p>${data.productDescription}</p>` : ''}
          ${data.sellerName ? `<p><strong>Sold by:</strong> ${data.sellerName}</p>` : ''}
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>📎 Your files are attached to this email.</strong></p>
          </div>
          <p style="font-size: 0.9em; color: #666;">Order ID: <code>${data.orderId}</code></p>
          <p>Best regards,<br>The Patterns Place Team</p>
        </div>
      </div>
    `,
    text: `Thank You for Your Purchase!\n\nHello${data.buyerName ? ` ${data.buyerName}` : ''},\n\nYour purchase has been completed successfully! Your digital product files are attached to this email.\n\nProduct: ${data.productTitle}\nOrder ID: ${data.orderId}\n\nBest regards,\nThe Patterns Place Team`,
    attachments,
  });

  if (result.error) {
    return { success: false, error: result.error.message || 'Failed to send email' };
  }

  return { success: true };
}

