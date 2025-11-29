# Email Delivery with Watermarking Setup

This guide explains how to set up automated email delivery for digital products with automatic PDF watermarking.

## Overview

When a customer purchases a product, they automatically receive an email with their purchased files attached. PDF files are automatically watermarked with the customer's email address to discourage reselling.

## Features

### ✅ Automatic Email Delivery
- Emails are sent automatically when payment is completed
- Works for both single product and cart checkouts
- Professional HTML email template with product details

### ✅ PDF Watermarking
- PDF files are automatically watermarked with customer's email
- Watermark appears diagonally across each page
- Subtle corner watermark with email address
- Non-destructive: If watermarking fails, original file is still sent

### ✅ Multiple File Support
- Supports PDF, ZIP, images, and other file types
- Each file type is handled appropriately
- Files are attached to the email

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Resend API Key**: Get your API key from Resend dashboard
3. **Verified Domain** (recommended): Verify your sending domain in Resend for better deliverability

## Setup Steps

### 1. Install Dependencies

The required packages are already installed:
- `resend` - Email service
- `pdf-lib` - PDF watermarking

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here

# Optional: Customize sender email/name
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=The Patterns Place
```

**Important**: 
- Use your verified domain for `RESEND_FROM_EMAIL` for best deliverability
- If using Resend's default domain (like `onboarding@resend.dev`), emails will work but may have deliverability issues
- Update `RESEND_FROM_NAME` to match your brand

### 3. Verify Stripe Checkout Metadata

The checkout flow already includes `buyerEmail` in metadata. Verify that your checkout API routes include:

```typescript
metadata: {
  buyerId: user.id,
  buyerEmail: user.email,
  // ... other metadata
}
```

Check these files:
- `app/api/checkout/cart/route.ts`
- `app/api/checkout/route.ts`

### 4. Test Email Delivery

1. Make a test purchase
2. Complete payment via Stripe Checkout
3. Check your email inbox (and spam folder)
4. Verify PDFs are watermarked with your email

## How It Works

### Order Processing Flow

1. **Payment Complete**: Stripe sends `checkout.session.completed` webhook
2. **Order Created**: Webhook creates order record in database
3. **Email Trigger**: Product delivery service is called automatically
4. **File Processing**:
   - Files are downloaded from Supabase Storage
   - PDFs are watermarked with customer email
   - Other files are attached as-is
5. **Email Sent**: Email with attachments is sent via Resend

### Watermarking Details

**For PDF Files:**
- Watermark text: `"Purchased by: {customer_email}"`
- Position: Diagonal across center of page (45° rotation)
- Style: Light gray, 30% opacity
- Additional: Small corner watermark with email address

**For Other Files:**
- Files are attached without modification
- Customer email is shown in email body instead

### Error Handling

- **Watermarking Failures**: Original PDF is sent if watermarking fails
- **Download Failures**: Failed files are skipped, other files still sent
- **Email Failures**: Logged but don't fail the webhook (order still created)
- All errors are logged to console for debugging

## Email Template

The email includes:
- **Header**: Branded gradient header with "Thank You" message
- **Product Details**: Product title, description, seller name
- **Attachments**: All purchased files attached
- **Security Notice**: Explains that email is embedded in files
- **Order Information**: Order ID for reference

## File Size Limits

- **Email Attachments**: Up to 25MB total (Resend limit)
- **Individual Files**: No hard limit, but large files may fail
- **Recommendation**: Keep individual files under 10MB

## Security Considerations

### Privacy
- Customer email is embedded in PDFs as watermark
- Files are stored securely in private Supabase bucket
- Email addresses are only visible to file owners

### Watermarking Limitations
- Watermarks can be removed by determined users
- Provides deterrent rather than absolute protection
- Works best for PDFs (other formats not watermarked)

### File Access
- Files can be accessed via website after purchase
- Email delivery is a convenience feature
- Customers should save emails for their records

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check Domain**: Ensure sending domain is verified in Resend
3. **Check Logs**: Look for errors in webhook logs
4. **Verify Metadata**: Ensure `buyerEmail` is in Stripe session metadata

### PDFs Not Watermarked

1. **Check File Type**: Only PDFs are watermarked (`.pdf` extension)
2. **Check Logs**: Look for watermarking errors in console
3. **File Corruption**: Corrupted PDFs may fail watermarking
4. **Fallback**: Original PDF is sent if watermarking fails

### Missing Attachments

1. **Check File Upload**: Verify files are uploaded to `product-files` bucket
2. **Check Storage Permissions**: Ensure files are accessible
3. **File Size**: Very large files may fail to attach
4. **File Count**: All files should attach unless there's an error

### Watermark Not Visible

1. **Opacity**: Watermark is intentionally subtle (30% opacity)
2. **Color**: Light gray may be hard to see on light backgrounds
3. **Position**: Check diagonal center and bottom-left corner
4. **PDF Viewer**: Some PDF viewers may not show watermarks clearly

## Advanced Configuration

### Customizing Watermark

Edit `lib/watermark.ts` to customize:
- Watermark text format
- Position and rotation
- Color and opacity
- Font and size

### Customizing Email Template

Edit `lib/email.ts` to customize:
- HTML email design
- Text content
- Branding elements
- Email subject line

### Batch Processing

For large orders or many files:
- Consider queue system (e.g., Bull, BullMQ)
- Process watermarks in background
- Send emails asynchronously

## Limitations

### File Types
- **PDFs**: Fully supported with watermarking
- **Images**: Attached but not watermarked (future enhancement possible)
- **Other Files**: Attached as-is

### Seller Files
- Sellers can upload any file type
- Only PDFs get watermarked automatically
- Consider requiring PDFs for pattern files

### Email Delivery
- Dependent on Resend service uptime
- Subject to spam filters
- Large attachments may be blocked

## Future Enhancements

Potential improvements:
- Image watermarking support
- Custom watermark text (seller-configurable)
- Watermark on ZIP files (extract, watermark PDFs, rezip)
- Download link emails instead of attachments
- Email delivery status tracking
- Retry mechanism for failed deliveries

## Support

For issues or questions:
1. Check console logs for errors
2. Verify environment variables
3. Test with a small PDF first
4. Check Resend dashboard for delivery status

