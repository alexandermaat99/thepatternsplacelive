/**
 * Industry-standard purchase email delivery
 * Synchronous, straightforward - same pattern as test-email that works
 */
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { Resend } from 'resend';
import { watermarkPDF, isPDF } from '@/lib/watermark';
import { COMPANY_INFO } from './company-info';

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

export async function sendPurchaseEmail(
  data: PurchaseEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
  const fromName = process.env.RESEND_FROM_NAME || COMPANY_INFO.name;

  // Logo URL - use absolute URL for email clients (PNG works better than SVG in email)
  const logoUrl = `${COMPANY_INFO.urls.website}/icons/apple-touch-icon.png`;
  const brandColor = '#E8A598';
  const brandColorLight = '#E8A598';
  const brandColorDark = '#d99184';

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

  // Send email with updated template matching sendProductDeliveryEmail
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo and Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${brandColorLight}15 0%, ${brandColorLight}08 50%, ${brandColorLight}25 100%); padding: 40px 30px; text-align: center; border-bottom: 2px solid ${brandColorLight}30;">
              <img src="${logoUrl}" alt="${COMPANY_INFO.name}" style="max-width: 60px; width: 60px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;" />
              <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Thank You for Your Purchase!</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Hello${data.buyerName ? ` ${data.buyerName}` : ''},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #555; line-height: 1.6;">
                Your purchase has been completed successfully! You can find your digital product files attached to this email.
              </p>
              
              <!-- Product Info Card -->
              <div style="background: linear-gradient(135deg, ${brandColorLight}10 0%, ${brandColorLight}05 100%); padding: 24px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${brandColor};">
                <h2 style="margin: 0 0 12px 0; color: ${brandColorDark}; font-size: 22px; font-weight: 600;">${data.productTitle}</h2>
                ${data.productDescription ? `<p style="margin: 0 0 12px 0; color: #666; font-size: 14px; line-height: 1.5;">${data.productDescription.substring(0, 200)}${data.productDescription.length > 200 ? '...' : ''}</p>` : ''}
                ${data.sellerName ? `<p style="margin: 0; color: #888; font-size: 13px;">Sold by: <strong>${data.sellerName}</strong></p>` : ''}
              </div>
              
              <!-- Files Notice -->
              <div style="background: linear-gradient(135deg, ${brandColorLight}20 0%, ${brandColorLight}10 100%); border: 2px solid ${brandColorLight}40; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="margin: 0 0 8px 0; color: #333; font-size: 15px; font-weight: 600;">
                  📎 Your files are attached to this email.
                </p>
                <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
                  <small>Note: Your email address is embedded in the files to protect the seller's intellectual property.</small>
                </p>
              </div>
              
              <!-- Licensing Notice -->
              <div style="background: #fff9f5; border: 2px solid ${brandColorLight}50; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${brandColor};">
                <p style="margin: 0 0 12px 0; color: #333; font-size: 15px; font-weight: 600;">
                  ⚖️ License & Usage Terms
                </p>
                <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
                  <strong>You are the only person authorized to use this pattern.</strong> Creating patterns requires significant time, skill, and effort from the designer. This pattern is licensed for your personal use only. Please respect the designer's hard work by not sharing, distributing, or reselling this pattern.
                </p>
              </div>
              
              <!-- Order Info -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
                  <strong>Order ID:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px;">${data.orderId}</code>
                </p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  You can also access your files anytime from your account.
                </p>
              </div>
              
              <!-- Footer Message -->
              <p style="margin: 30px 0 0 0; font-size: 15px; color: #555;">
                If you have any questions or issues, please contact us at <a href="mailto:${COMPANY_INFO.email.support}" style="color: ${brandColorDark}; text-decoration: none; font-weight: 600;">${COMPANY_INFO.email.support}</a>${data.sellerName ? ' or the seller directly.' : '.'}
              </p>
              
              <div style="margin: 20px 0 0 0; text-align: left;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #333;">
                  Best regards,
                </p>
                <img src="${logoUrl}" alt="${COMPANY_INFO.name}" style="max-width: 33px; width: 33px; height: auto; margin-bottom: 8px; display: block;" />
                <p style="margin: 0; font-size: 15px; color: #333;">
                  <strong style="color: ${brandColorDark};">${COMPANY_INFO.name} Team</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #888; font-size: 12px; line-height: 1.5;">
                This is an automated message. Please do not reply to this email.<br>
                <a href="${COMPANY_INFO.urls.website}" style="color: ${brandColorDark}; text-decoration: none;">${COMPANY_INFO.urls.website}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

  const emailText = `
Thank You for Your Purchase!

Hello${data.buyerName ? ` ${data.buyerName}` : ''},

Your purchase has been completed successfully! You can find your digital product files attached to this email.

Product: ${data.productTitle}
${data.productDescription ? `${data.productDescription.substring(0, 200)}${data.productDescription.length > 200 ? '...' : ''}\n` : ''}
${data.sellerName ? `Sold by: ${data.sellerName}\n` : ''}
Order ID: ${data.orderId}

Your files are attached to this email. Note: Your email address is embedded in the files to protect the seller's intellectual property.

LICENSE & USAGE TERMS:
You are the only person authorized to use this pattern. Creating patterns requires significant time, skill, and effort from the designer. This pattern is licensed for your personal use only. Please respect the designer's hard work by not sharing, distributing, or reselling this pattern.

You can also access your files anytime from your account.

If you have any questions or issues, please contact us at ${COMPANY_INFO.email.support}${data.sellerName ? ' or the seller directly.' : '.'}

Best regards,
${COMPANY_INFO.name} Team
    `.trim();

  const result = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: data.buyerEmail,
    subject: `Your Purchase: ${data.productTitle}`,
    html: emailHtml,
    text: emailText,
    attachments,
  });

  if (result.error) {
    return { success: false, error: result.error.message || 'Failed to send email' };
  }

  return { success: true };
}
