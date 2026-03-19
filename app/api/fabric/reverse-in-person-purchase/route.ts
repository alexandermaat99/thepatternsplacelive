import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(req: NextRequest) {
  try {
    const { purchaseId } = await req.json();
    if (!purchaseId || typeof purchaseId !== 'string') {
      return NextResponse.json({ error: 'purchaseId is required' }, { status: 400 });
    }

    // Verify admin (using user cookies)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Perform inventory + purchase reversal with service role (bypass RLS)
    const supabaseAdmin = createServiceRoleClient();

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('in_person_purchases')
      .select(
        'id, reversed, sku, quantity, inventory_after, inventory_before'
      )
      .eq('id', purchaseId)
      .maybeSingle();

    if (purchaseError) {
      return NextResponse.json({ error: 'Failed to load purchase' }, { status: 500 });
    }

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    if (purchase.reversed) {
      return NextResponse.json({ error: 'Already reversed' }, { status: 409 });
    }

    const restoreQuantity = Number(purchase.quantity);
    const currentShouldBe = purchase.inventory_after;
    if (!Number.isFinite(restoreQuantity) || currentShouldBe == null) {
      return NextResponse.json({ error: 'Invalid purchase record' }, { status: 500 });
    }

    // Restore inventory only if current quantity still matches what it was after the sale.
    // This prevents double-reversal or reversing after another sale changed the quantity.
    const newQty = Number(currentShouldBe) + restoreQuantity;

    const { error: invUpdateError, data: invUpdateData } = await supabaseAdmin
      .from('fabric')
      .update({ current_quantity: newQty })
      .eq('sku', purchase.sku)
      .eq('current_quantity', currentShouldBe)
      .select('sku,current_quantity')
      .maybeSingle();

    if (invUpdateError || !invUpdateData) {
      return NextResponse.json(
        { error: 'Inventory mismatch; cannot safely reverse this sale' },
        { status: 409 }
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('in_person_purchases')
      .update({
        reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_by: user.id,
      })
      .eq('id', purchaseId)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to mark purchase reversed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reverse in-person purchase error:', error);
    return NextResponse.json(
      { error: 'An error occurred while reversing the sale' },
      { status: 500 }
    );
  }
}

