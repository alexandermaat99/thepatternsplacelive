import { Resend } from 'resend';

interface ProductDeliveryEmailData {
  customerEmail: string;
  customerName?: string;
  productTitle: string;
  productDescription?: string;
  sellerName?: string;
  orderId: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

/**
 * Sends an email to the customer with their purchased product files
 */
export async function sendProductDeliveryEmail(
  data: ProductDeliveryEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured in environment variables');
      console.error('Please add RESEND_API_KEY to your .env.local file');
      return {
        success: false,
        error: 'Email service not configured - RESEND_API_KEY is missing',
      };
    }
    
    // Initialize Resend client lazily (only when needed, not at module load)
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('📧 Preparing to send product delivery email...');
    console.log('Recipient:', data.customerEmail);
    console.log('Product:', data.productTitle);
    console.log('Attachments:', data.attachments.length, 'file(s)');

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
    const fromName = process.env.RESEND_FROM_NAME || 'The Patterns Place';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Thank You for Your Purchase!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p>Hello${data.customerName ? ` ${data.customerName}` : ''},</p>
    
    <p>Your purchase has been completed successfully! You can find your digital product files attached to this email.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea;">${data.productTitle}</h2>
      ${data.productDescription ? `<p style="color: #666;">${data.productDescription.substring(0, 200)}${data.productDescription.length > 200 ? '...' : ''}</p>` : ''}
      ${data.sellerName ? `<p style="color: #888; font-size: 0.9em;">Sold by: ${data.sellerName}</p>` : ''}
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; color: #856404;">
        <strong>📎 Your files are attached to this email.</strong><br>
        <small>Note: Your email address is embedded in the files to protect the seller's intellectual property.</small>
      </p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 0.9em; color: #666;">
        Order ID: <code>${data.orderId}</code><br>
        You can also access your files anytime from your account.
      </p>
    </div>
    
    <p style="margin-top: 30px;">
      If you have any questions or issues, please contact us or the seller directly.
    </p>
    
    <p>Best regards,<br>The Patterns Place Team</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
    `;

    const emailText = `
Thank You for Your Purchase!

Hello${data.customerName ? ` ${data.customerName}` : ''},

Your purchase has been completed successfully! You can find your digital product files attached to this email.

Product: ${data.productTitle}
${data.sellerName ? `Sold by: ${data.sellerName}\n` : ''}
Order ID: ${data.orderId}

Your files are attached to this email. Note: Your email address is embedded in the files to protect the seller's intellectual property.

You can also access your files anytime from your account.

If you have any questions or issues, please contact us or the seller directly.

Best regards,
The Patterns Place Team
    `.trim();

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.customerEmail,
      subject: `Your Purchase: ${data.productTitle}`,
      html: emailHtml,
      text: emailText,
      attachments: data.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })),
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      console.error('Error details:', JSON.stringify(result.error, null, 2));
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    console.log('✅ Email sent successfully! Message ID:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Error sending product delivery email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

