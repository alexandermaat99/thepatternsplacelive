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
    const itemsRaw = Array.isArray(body?.items) ? body.items : null;
    const sku = sanitizeString(String(body?.sku ?? ''), 64).trim();
    // New name: yards. Backward compatible with older clients that send `quantity`.
    const yards = Number(body?.yards ?? body?.quantity);
    const receiptEmail = sanitizeString(String(body?.receiptEmail ?? ''), 254).trim();
    const paymentMethodRaw = String(body?.paymentMethod ?? '').trim().toLowerCase();
    const paymentMethod =
      paymentMethodRaw === 'venmo' || paymentMethodRaw === 'stripe' || paymentMethodRaw === 'cash'
        ? paymentMethodRaw
        : null;

    if (!itemsRaw) {
      if (!sku) {
        return NextResponse.json({ success: false, error: 'SKU is required' }, { status: 400 });
      }
      if (!Number.isFinite(yards) || yards <= 0) {
        return NextResponse.json(
          { success: false, error: 'Yards must be greater than 0' },
          { status: 400 }
        );
      }
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

    type SaleLine = {
      sku: string;
      name: string | null;
      yards: number;
      unitPrice: number;
      lineTotal: number;
      inventoryBefore: number;
      inventoryAfter: number;
    };

    const requestedItems: Array<{ sku: string; yards: number }> = itemsRaw
      ? itemsRaw
          .map((it: any) => ({
            sku: sanitizeString(String(it?.sku ?? ''), 64).trim(),
            yards: Number(it?.yards ?? it?.quantity),
          }))
          .filter((it: { sku: string; yards: number }) => it.sku && Number.isFinite(it.yards) && it.yards > 0)
      : [{ sku, yards }];

    if (requestedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one valid line item is required.' },
        { status: 400 }
      );
    }

    const lines: SaleLine[] = [];
    for (const item of requestedItems) {
      const { data: fabric, error: fabricError } = await supabase
        .from('fabric')
        .select('sku,name,sell_price,current_quantity')
        .eq('sku', item.sku)
        .maybeSingle();

      if (fabricError) throw fabricError;
      if (!fabric) {
        return NextResponse.json(
          { success: false, error: `No fabric found for SKU ${item.sku}` },
          { status: 404 }
        );
      }

      const currentQty = fabric.current_quantity;
      if (currentQty == null) {
        return NextResponse.json(
          { success: false, error: `${item.sku} has no current quantity set.` },
          { status: 400 }
        );
      }
      if (item.yards > Number(currentQty)) {
        return NextResponse.json(
          { success: false, error: `${item.sku}: not enough inventory for that many yards.` },
          { status: 400 }
        );
      }

      const newQty = Number(currentQty) - item.yards;
      const { data: updatedRows, error: updateError } = await supabase
        .from('fabric')
        .update({ current_quantity: newQty })
        .eq('sku', item.sku)
        .gte('current_quantity', item.yards)
        .select('sku,current_quantity')
        .limit(1);

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        return NextResponse.json(
          { success: false, error: `${item.sku}: inventory changed. Re-scan and try again.` },
          { status: 409 }
        );
      }

      const unitPrice = fabric.sell_price != null ? Number(fabric.sell_price) : 0;
      lines.push({
        sku: fabric.sku,
        name: fabric.name,
        yards: item.yards,
        unitPrice,
        lineTotal: unitPrice * item.yards,
        inventoryBefore: Number(currentQty),
        inventoryAfter: newQty,
      });
    }

    const totalYards = lines.reduce((sum, line) => sum + line.yards, 0);
    const totalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const avgUnitPrice = totalYards > 0 ? totalAmount / totalYards : 0;
    const inventoryBeforeSum = lines.reduce((sum, line) => sum + line.inventoryBefore, 0);
    const inventoryAfterSum = lines.reduce((sum, line) => sum + line.inventoryAfter, 0);
    const summarySku = lines[0].sku;
    const summaryName =
      lines.length === 1 ? lines[0].name : `${lines[0].name || lines[0].sku} + ${lines.length - 1} more`;

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

        const title =
          lines.length === 1
            ? lines[0].name || lines[0].sku
            : `Fabric sale (${lines.length} items)`;
        const subject = `Receipt: ${title}`;
        const lineRowsHtml = lines
          .map(
            line => `
            <tr>
              <td style="padding:6px 0; color:#444;">${line.name || line.sku} <span style="color:#777;">(${line.sku})</span></td>
              <td style="padding:6px 0; text-align:right;">${line.yards}</td>
              <td style="padding:6px 0; text-align:right;">${formatMoney(line.unitPrice)}</td>
              <td style="padding:6px 0; text-align:right;">${formatMoney(line.lineTotal)}</td>
            </tr>`
          )
          .join('');

        const html = `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#f6f6f6; margin:0; padding:24px;">
    <table role="presentation" style="max-width:640px; width:100%; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e8e8e8;">
      <tr>
        <td style="padding:20px 24px; border-bottom:1px solid #eee;">
          <div style="font-size:18px; font-weight:700;">${COMPANY_INFO.name}</div>
          <div style="color:#666; font-size:13px;">Fabric sale receipt</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 0; color:#666; font-weight:600;">Item</td>
              <td style="padding:6px 0; color:#666; text-align:right; font-weight:600;">Yards</td>
              <td style="padding:6px 0; color:#666; text-align:right; font-weight:600;">Unit</td>
              <td style="padding:6px 0; color:#666; text-align:right; font-weight:600;">Line total</td>
            </tr>
            ${lineRowsHtml}
            <tr>
              <td style="padding:10px 0; border-top:1px solid #eee; font-weight:700;">Total</td>
              <td style="padding:10px 0; border-top:1px solid #eee; text-align:right; font-weight:700;">${totalYards}</td>
              <td style="padding:10px 0; border-top:1px solid #eee;"></td>
              <td style="padding:10px 0; border-top:1px solid #eee; text-align:right; font-weight:800;">${formatMoney(totalAmount)}</td>
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

        const lineRowsText = lines
          .map(
            line =>
              `- ${line.name || line.sku} (${line.sku}): ${line.yards} yd x ${formatMoney(line.unitPrice)} = ${formatMoney(line.lineTotal)}`
          )
          .join('\n');
        const text =
          `${COMPANY_INFO.name} - Fabric sale receipt\n\n` +
          `${lineRowsText}\n\n` +
          `Total yards: ${totalYards}\n` +
          `Total: ${formatMoney(totalAmount)}\n`;

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
          sku: summarySku,
          name: summaryName,
          quantity: totalYards,
          unit_price: avgUnitPrice,
          total_amount: totalAmount,
          sale_lines: lines.map(line => ({
            sku: line.sku,
            name: line.name,
            yards: line.yards,
            unit_price: line.unitPrice,
            line_total: line.lineTotal,
            inventory_before: line.inventoryBefore,
            inventory_after: line.inventoryAfter,
          })),
          receipt_email: receiptEmail,
          payment_method: paymentMethod,
          processed_by: user.id,
          inventory_before: inventoryBeforeSum,
          inventory_after: inventoryAfterSum,
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
      items: lines.map(line => ({ sku: line.sku, newYards: line.inventoryAfter })),
      sku: lines[0].sku,
      newYards: lines[0].inventoryAfter,
      // Backward compatible keys
      newQuantity: lines[0].inventoryAfter,
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
