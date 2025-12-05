import { Resend } from 'resend';
import { COMPANY_INFO } from './company-info';

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
    const fromName = process.env.RESEND_FROM_NAME || COMPANY_INFO.name;

    // Logo URL - use absolute URL for email clients (PNG works better than SVG in email)
    // Note: Many email clients block images by default, but users can enable them
    const logoUrl = `${COMPANY_INFO.urls.website}/icons/apple-touch-icon.png`;
    const brandColor = '#E8A598';
    const brandColorLight = '#E8A598';
    const brandColorDark = '#d99184';

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
                Hello${data.customerName ? ` ${data.customerName}` : ''},
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

Hello${data.customerName ? ` ${data.customerName}` : ''},

Your purchase has been completed successfully! You can find your digital product files attached to this email.

Product: ${data.productTitle}
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
      to: data.customerEmail,
      subject: `Your Purchase: ${data.productTitle}`,
      html: emailHtml,
      text: emailText,
      attachments: data.attachments.map(att => ({
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

interface SellerSaleNotificationData {
  sellerEmail: string;
  sellerName?: string;
  productTitle: string;
  orderId: string;
  saleAmount: number;
  currency: string;
  platformFee: number;
  netAmount: number;
  buyerName?: string;
  buyerEmail?: string;
}

/**
 * Sends an email to the seller notifying them of a sale
 */
export async function sendSellerSaleNotificationEmail(
  data: SellerSaleNotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured in environment variables');
      return {
        success: false,
        error: 'Email service not configured - RESEND_API_KEY is missing',
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('📧 Preparing to send seller sale notification email...');
    console.log('Recipient:', data.sellerEmail);
    console.log('Product:', data.productTitle);
    console.log('Order ID:', data.orderId);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
    const fromName = process.env.RESEND_FROM_NAME || COMPANY_INFO.name;

    const logoUrl = `${COMPANY_INFO.urls.website}/icons/apple-touch-icon.png`;
    const brandColor = '#E8A598';
    const brandColorLight = '#E8A598';
    const brandColorDark = '#d99184';

    // Format currency amounts
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.currency || 'USD',
      }).format(amount);
    };

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
              <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">🎉 You Made a Sale!</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Hello${data.sellerName ? ` ${data.sellerName}` : ''},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #555; line-height: 1.6;">
                Great news! Your product has been purchased. Here are the details of your sale:
              </p>
              
              <!-- Product Info Card -->
              <div style="background: linear-gradient(135deg, ${brandColorLight}10 0%, ${brandColorLight}05 100%); padding: 24px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${brandColor};">
                <h2 style="margin: 0 0 12px 0; color: ${brandColorDark}; font-size: 22px; font-weight: 600;">${data.productTitle}</h2>
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>Order ID:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px;">${data.orderId}</code>
                </p>
              </div>
              
              <!-- Sale Details -->
              <div style="background: #f9f9f9; border: 2px solid ${brandColorLight}30; padding: 24px; border-radius: 8px; margin: 30px 0;">
                <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px; font-weight: 600;">Sale Breakdown</h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Sale Amount:</td>
                    <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px; font-weight: 600;">${formatCurrency(data.saleAmount)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Platform Fee:</td>
                    <td style="padding: 8px 0; text-align: right; color: #666; font-size: 14px;">-${formatCurrency(data.platformFee)}</td>
                  </tr>
                  <tr style="border-top: 2px solid ${brandColorLight}40; margin-top: 8px;">
                    <td style="padding: 12px 0 0 0; color: #333; font-size: 16px; font-weight: 600;">Your Earnings:</td>
                    <td style="padding: 12px 0 0 0; text-align: right; color: ${brandColorDark}; font-size: 18px; font-weight: 700;">${formatCurrency(data.netAmount)}</td>
                  </tr>
                </table>
              </div>
              
              ${
                data.buyerName || data.buyerEmail
                  ? `
              <!-- Buyer Info -->
              <div style="background: #fff9f5; border: 2px solid ${brandColorLight}50; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${brandColor};">
                <p style="margin: 0 0 8px 0; color: #333; font-size: 15px; font-weight: 600;">
                  👤 Buyer Information
                </p>
                ${data.buyerName ? `<p style="margin: 4px 0; color: #555; font-size: 14px;"><strong>Name:</strong> ${data.buyerName}</p>` : ''}
                ${data.buyerEmail ? `<p style="margin: 4px 0; color: #555; font-size: 14px;"><strong>Email:</strong> ${data.buyerEmail}</p>` : ''}
              </div>
              `
                  : ''
              }
              
              <!-- Dashboard Link -->
              <div style="margin: 30px 0; text-align: center;">
                <a href="${COMPANY_INFO.urls.website}/dashboard/earnings" style="display: inline-block; background: ${brandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Your Earnings Dashboard
                </a>
              </div>
              
              <!-- Footer Message -->
              <p style="margin: 30px 0 0 0; font-size: 15px; color: #555;">
                Your earnings will be transferred to your connected Stripe account according to your payout schedule. If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email.support}" style="color: ${brandColorDark}; text-decoration: none; font-weight: 600;">${COMPANY_INFO.email.support}</a>.
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
🎉 You Made a Sale!

Hello${data.sellerName ? ` ${data.sellerName}` : ''},

Great news! Your product has been purchased. Here are the details of your sale:

Product: ${data.productTitle}
Order ID: ${data.orderId}

Sale Breakdown:
Sale Amount: ${formatCurrency(data.saleAmount)}
Platform Fee: -${formatCurrency(data.platformFee)}
Your Earnings: ${formatCurrency(data.netAmount)}

${data.buyerName || data.buyerEmail ? `Buyer Information:\n${data.buyerName ? `Name: ${data.buyerName}\n` : ''}${data.buyerEmail ? `Email: ${data.buyerEmail}\n` : ''}` : ''}

View your earnings dashboard: ${COMPANY_INFO.urls.website}/dashboard/earnings

Your earnings will be transferred to your connected Stripe account according to your payout schedule. If you have any questions, please contact us at ${COMPANY_INFO.email.support}.

Best regards,
${COMPANY_INFO.name} Team
    `.trim();

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.sellerEmail,
      subject: `🎉 Sale Notification: ${data.productTitle}`,
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      console.error('Error details:', JSON.stringify(result.error, null, 2));
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    console.log('✅ Seller notification email sent successfully! Message ID:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Error sending seller sale notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
