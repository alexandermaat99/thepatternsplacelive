import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { watermarkPDF, isPDF } from '@/lib/watermark';
import { sendProductDeliveryEmail } from '@/lib/email';

interface DeliveryProduct {
  id: string;
  title: string;
  description?: string | null;
  files?: string[] | null;
  user_id: string;
}

interface DeliveryOrder {
  id: string;
  product_id: string;
  buyer_id?: string | null;
  buyer_email?: string | null;
  seller_id: string;
}

/**
 * Processes product delivery for a completed order
 * Downloads files, watermarks PDFs with customer email, and sends email
 */
export async function deliverProductToCustomer(
  order: DeliveryOrder,
  product: DeliveryProduct,
  buyerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use regular client for database queries (needs user context for profiles)
    const supabase = await createClient();
    // Use service role client for storage downloads (bypasses RLS)
    const supabaseAdmin = createServiceRoleClient();

    // Get buyer profile for name
    let buyerName: string | undefined;
    if (order.buyer_id) {
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', order.buyer_id)
        .single();
      
      buyerName = buyerProfile?.full_name || undefined;
    }

    // Get seller profile for name
    let sellerName: string | undefined;
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', product.user_id)
      .single();
    
    sellerName = sellerProfile?.full_name || sellerProfile?.username || undefined;

    // Check if product has files
    console.log(`📁 Checking files for product ${product.id} (${product.title})`);
    console.log(`Files array:`, product.files);
    console.log(`Files count:`, product.files?.length || 0);
    
    if (!product.files || product.files.length === 0) {
      // No files to deliver, but we can still send a confirmation email
      console.error(`❌ Product ${product.id} (${product.title}) has no files to deliver. Order ${order.id} will not receive an email.`);
      console.error('To fix: Add files to the product using the product-files storage bucket.');
      return { 
        success: false, 
        error: 'Product has no files attached. Please add files to the product.' 
      };
    }

    // Download and process files
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];

    console.log(`📥 Attempting to download ${product.files.length} file(s) for delivery...`);
    
    for (let i = 0; i < product.files.length; i++) {
      const filePath = product.files[i];
      try {
        console.log(`[${i + 1}/${product.files.length}] Attempting to download file: ${filePath}`);
        console.log(`   Full path: product-files/${filePath}`);
        
        // Download file from Supabase storage using service role client (bypasses RLS)
        console.log('   Using service role client to bypass RLS policies...');
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from('product-files')
          .download(filePath);

        if (downloadError) {
          console.error(`❌ Error downloading file ${filePath}:`, downloadError);
          console.error(`   Error code:`, downloadError.statusCode);
          console.error(`   Error message:`, downloadError.message);
          console.error(`   Error details:`, JSON.stringify(downloadError, null, 2));
          console.error('Troubleshooting:');
          console.error('1. Check if the product-files storage bucket exists');
          console.error('2. Verify the file path is correct:', filePath);
          console.error('3. Ensure the file exists at: product-files/' + filePath);
          console.error('4. Check storage bucket permissions (should be private)');
          console.error('5. Verify the server-side Supabase client has service role access');
          continue; // Skip this file but continue with others
        }
        
        if (!fileData) {
          console.error(`❌ File download returned null/undefined for: ${filePath}`);
          console.error('   The download succeeded but no file data was returned');
          continue;
        }
        
        console.log(`✅ Successfully downloaded file: ${filePath} (${fileData.size} bytes)`);

        // Convert blob to ArrayBuffer then to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        let fileBuffer = Buffer.from(arrayBuffer);

        // Get original filename
        const fileName = filePath.split('/').pop() || 'file';
        
        // Determine content type based on file extension
        let contentType = 'application/octet-stream';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const contentTypeMap: Record<string, string> = {
          pdf: 'application/pdf',
          zip: 'application/zip',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          txt: 'text/plain',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        contentType = contentTypeMap[extension || ''] || contentType;

        // Watermark PDFs
        if (isPDF(filePath, contentType)) {
          try {
            const watermarkedPDF = await watermarkPDF(
              new Uint8Array(fileBuffer),
              buyerEmail
            );
            fileBuffer = Buffer.from(watermarkedPDF);
            console.log(`Successfully watermarked PDF: ${fileName}`);
          } catch (watermarkError) {
            console.error(`Error watermarking PDF ${fileName}:`, watermarkError);
            // Continue with original file if watermarking fails
          }
        }

        attachments.push({
          filename: fileName,
          content: fileBuffer,
          contentType,
        });
      } catch (fileError) {
        console.error(`Error processing file ${filePath}:`, fileError);
        // Continue with other files even if one fails
      }
    }

    console.log(`📊 File processing summary: ${attachments.length}/${product.files.length} files successfully processed`);
    
    if (attachments.length === 0) {
      console.error(`❌ CRITICAL: No files could be processed for delivery!`);
      console.error(`   Product ID: ${product.id}`);
      console.error(`   Product Title: ${product.title}`);
      console.error(`   Order ID: ${order.id}`);
      console.error(`   Files listed in product: ${product.files?.length || 0}`);
      console.error(`   Files that failed: ${product.files?.length || 0}`);
      console.error(`   File paths:`, product.files);
      console.error('');
      console.error('🔍 Possible causes:');
      console.error('1. Files don\'t exist in the product-files storage bucket');
      console.error('2. File paths in the product.files array are incorrect');
      console.error('3. Storage bucket permissions block server-side access');
      console.error('4. Server-side Supabase client doesn\'t have service role permissions');
      console.error('5. Files were uploaded to a different bucket (e.g., product-images)');
      console.error('');
      console.error('💡 To fix:');
      console.error('1. Check the Supabase Storage dashboard for the product-files bucket');
      console.error('2. Verify files exist at the paths listed in product.files');
      console.error('3. Check that the server-side Supabase client uses the service role key');
      console.error('4. Re-upload files to the product if paths are incorrect');
      return {
        success: false,
        error: 'No files could be processed for delivery',
      };
    }
    
    console.log(`Successfully processed ${attachments.length} file(s) for delivery to ${buyerEmail}`);

    // Send email with attachments
    console.log(`Sending email to ${buyerEmail} with ${attachments.length} attachment(s)...`);
    const emailResult = await sendProductDeliveryEmail({
      customerEmail: buyerEmail,
      customerName: buyerName,
      productTitle: product.title,
      productDescription: product.description || undefined,
      sellerName,
      orderId: order.id,
      attachments,
    });

    if (!emailResult.success) {
      console.error(`Failed to send email to ${buyerEmail}:`, emailResult.error);
      console.error('Check:');
      console.error('1. RESEND_API_KEY is set in environment variables');
      console.error('2. RESEND_FROM_EMAIL is configured (or using default)');
      console.error('3. Resend account is active and has credits');
      return {
        success: false,
        error: emailResult.error || 'Failed to send delivery email',
      };
    }

    console.log(`✅ Successfully delivered product ${product.id} (${product.title}) to ${buyerEmail}. Email ID: ${emailResult.messageId || 'N/A'}`);
    return { success: true };
  } catch (error) {
    console.error('Error delivering product to customer:', error);
    console.error('Order ID:', order.id);
    console.error('Product ID:', product.id);
    console.error('Buyer Email:', buyerEmail);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Processes delivery for multiple orders (cart checkout)
 */
export async function deliverProductsForOrders(
  orders: DeliveryOrder[]
): Promise<void> {
  console.log('📦 deliverProductsForOrders called with', orders.length, 'order(s)');
  console.log('Orders:', orders.map(o => ({
    id: o.id,
    product_id: o.product_id,
    buyer_email: o.buyer_email || 'MISSING',
    buyer_id: o.buyer_id || 'N/A'
  })));
  
  const supabase = await createClient();

  // Group orders by buyer email
  const ordersByEmail = new Map<string, DeliveryOrder[]>();
  
  for (const order of orders) {
    const email = order.buyer_email;
    if (email) {
      if (!ordersByEmail.has(email)) {
        ordersByEmail.set(email, []);
      }
      ordersByEmail.get(email)!.push(order);
    } else {
      console.error(`❌ Order ${order.id} has no buyer_email - SKIPPING DELIVERY`);
      console.error('Order details:', JSON.stringify(order, null, 2));
      console.error('This order will NOT receive an email!');
    }
  }
  
  if (ordersByEmail.size === 0) {
    console.error('❌ CRITICAL: No orders have buyer_email. Email delivery cannot proceed.');
    console.error('All orders:', JSON.stringify(orders, null, 2));
    return;
  }
  
  console.log(`📧 Processing delivery for ${ordersByEmail.size} unique buyer email(s)`);

  // Process each buyer's orders
  for (const [buyerEmail, buyerOrders] of ordersByEmail.entries()) {
    console.log(`📬 Processing ${buyerOrders.length} order(s) for ${buyerEmail}`);
    
    // Get all product IDs for this buyer
    const productIds = buyerOrders.map((o) => o.product_id);

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, description, files, user_id')
      .in('id', productIds);

    if (productsError || !products) {
      console.error(`❌ Error fetching products for delivery to ${buyerEmail}:`, productsError);
      console.error('Product IDs requested:', productIds);
      continue;
    }

    console.log(`✅ Fetched ${products.length} product(s) for ${buyerEmail}`);

    // Create a map for quick product lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Deliver each product
    for (const order of buyerOrders) {
      const product = productMap.get(order.product_id);
      if (!product) {
        console.error(`❌ Product ${order.product_id} not found for order ${order.id}`);
        continue;
      }

      // Use buyer_email from order (should be set from Stripe session)
      const email = order.buyer_email;
      if (!email) {
        console.error(`❌ No email found for order ${order.id} - buyer_email is required`);
        continue;
      }

      console.log(`🚀 Starting delivery for order ${order.id}, product: ${product.title}, email: ${email}`);
      
      // Deliver product (errors are logged but don't stop other deliveries)
      const deliveryResult = await deliverProductToCustomer(order, product, email);
      
      if (!deliveryResult.success) {
        console.error(`❌ Delivery failed for order ${order.id}:`, deliveryResult.error);
      } else {
        console.log(`✅ Delivery completed successfully for order ${order.id}`);
      }
    }
  }
  
  console.log('📦 deliverProductsForOrders completed');
}


