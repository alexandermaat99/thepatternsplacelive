import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_INFO } from '@/lib/company-info';
import { sanitizeString, validateEmail } from '@/lib/security/input-validation';

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sku = sanitizeString(String(body?.sku ?? ''), 64).trim();
    const quantity = Number(body?.quantity);
    const receiptEmail = sanitizeString(String(body?.receiptEmail ?? ''), 254).trim();
    const paymentMethodRaw = String(body?.paymentMethod ?? '').trim().toLowerCase();
    const paymentMethod =
      paymentMethodRaw === 'venmo' || paymentMethodRaw === 'stripe' || paymentMethodRaw === 'cash'
        ? paymentMethodRaw
        : null;

    if (!sku) {
      return NextResponse.json({ success: false, error: 'SKU is required' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }
    if (!receiptEmail || !validateEmail(receiptEmail)) {
      return NextResponse.json(
        { success: false, error: 'Valid receipt email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.admin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: fabric, error: fabricError } = await supabase
      .from('fabric')
      .select('sku,name,sell_price,current_quantity')
      .eq('sku', sku)
      .maybeSingle();

    if (fabricError) throw fabricError;
    if (!fabric) {
      return NextResponse.json(
        { success: false, error: `No fabric found for SKU ${sku}` },
        { status: 404 }
      );
    }

    const currentQty = fabric.current_quantity;
    if (currentQty == null) {
      return NextResponse.json(
        { success: false, error: 'This fabric has no current quantity set.' },
        { status: 400 }
      );
    }
    if (quantity > Number(currentQty)) {
      return NextResponse.json(
        { success: false, error: 'Not enough inventory for that quantity.' },
        { status: 400 }
      );
    }

    const newQty = Number(currentQty) - quantity;

    const { data: updatedRows, error: updateError } = await supabase
      .from('fabric')
      .update({ current_quantity: newQty })
      .eq('sku', sku)
      .gte('current_quantity', quantity)
      .select('sku,current_quantity')
      .limit(1);

    if (updateError) throw updateError;
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory changed. Please re-scan and try again.' },
        { status: 409 }
      );
    }

    const unitPrice = fabric.sell_price != null ? Number(fabric.sell_price) : 0;
    const total = unitPrice * quantity;

    // Send receipt email (non-fatal if email fails)
    let emailSent = false;
    let emailError: string | null = null;

    if (!process.env.RESEND_API_KEY) {
      emailError = 'Email service not configured (RESEND_API_KEY missing)';
    } else {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
        const fromName = process.env.RESEND_FROM_NAME || COMPANY_INFO.name;

        const title = fabric.name || fabric.sku;
        const subject = `Receipt: ${title}`;

        const html = `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#f6f6f6; margin:0; padding:24px;">
    <table role="presentation" style="max-width:640px; width:100%; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e8e8e8;">
      <tr>
        <td style="padding:20px 24px; border-bottom:1px solid #eee;">
          <div style="font-size:18px; font-weight:700;">${COMPANY_INFO.name}</div>
          <div style="color:#666; font-size:13px;">Farmers market receipt</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <div style="font-size:16px; font-weight:700; margin-bottom:8px;">${title}</div>
          <div style="color:#666; font-size:13px; margin-bottom:18px;">SKU: <code>${fabric.sku}</code></div>

          <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:8px 0; color:#666;">Quantity</td>
              <td style="padding:8px 0; text-align:right; font-weight:600;">${quantity}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#666;">Unit price</td>
              <td style="padding:8px 0; text-align:right; font-weight:600;">${formatMoney(unitPrice)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0; border-top:1px solid #eee; font-weight:700;">Total</td>
              <td style="padding:12px 0; border-top:1px solid #eee; text-align:right; font-weight:800;">${formatMoney(total)}</td>
            </tr>
          </table>

          <div style="margin-top:18px; color:#666; font-size:12px;">
            If you have questions, contact ${COMPANY_INFO.email.support}.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

        const text =
          `${COMPANY_INFO.name} - Fabric sale receipt\n\n` +
          `Item: ${title}\n` +
          `SKU: ${fabric.sku}\n` +
          `Quantity: ${quantity}\n` +
          `Unit price: ${formatMoney(unitPrice)}\n` +
          `Total: ${formatMoney(total)}\n`;

        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: receiptEmail,
          subject,
          html,
          text,
        });

        if (result.error) {
          emailError = result.error.message || 'Failed to send receipt email';
        } else {
          emailSent = true;
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'Failed to send receipt email';
      }
    }

    // Record the in-person purchase for auditing.
    // This should never block inventory changes / email sending if insert fails.
    let purchaseId: string | null = null;
    try {
      const { data: purchase, error: purchaseError } = await supabase
        .from('in_person_purchases')
        .insert({
          sku: fabric.sku,
          name: fabric.name,
          quantity,
          unit_price: unitPrice,
          total_amount: total,
          receipt_email: receiptEmail,
          payment_method: paymentMethod,
          processed_by: user.id,
          inventory_before: Number(currentQty),
          inventory_after: newQty,
          email_sent: emailSent,
          email_error: emailError,
        })
        .select('id')
        .maybeSingle();

      if (purchaseError) {
        console.error('Failed to insert in-person purchase:', purchaseError);
      } else if (purchase?.id) {
        purchaseId = purchase.id;
      }
    } catch (e) {
      console.error('Failed to insert in-person purchase (exception):', e);
    }

    return NextResponse.json({
      success: true,
      sku,
      newQuantity: newQty,
      emailSent,
      emailError,
      purchaseId,
    });
  } catch (error) {
    console.error('Fabric sale error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while completing the sale.' },
      { status: 500 }
    );
  }
}
