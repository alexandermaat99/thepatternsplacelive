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
  const deliveryStartTime = Date.now();
  console.log(`⏱️ Starting product delivery for order ${order.id}...`);

  try {
    // Use service role client for all operations since this runs async without request context
    // Service role bypasses RLS and works in async contexts
    const supabase = createServiceRoleClient();
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
      console.error(
        `❌ Product ${product.id} (${product.title}) has no files to deliver. Order ${order.id} will not receive an email.`
      );
      console.error('To fix: Add files to the product using the product-files storage bucket.');
      return {
        success: false,
        error: 'Product has no files attached. Please add files to the product.',
      };
    }

    // Store files array after null check to satisfy TypeScript
    const files = product.files;

    // Download and process files
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];

    console.log(`📥 Attempting to download ${files.length} file(s) for delivery...`);
    const downloadStartTime = Date.now();

    // Download files in parallel for better performance
    const fileDownloadPromises = files.map(async (filePath, index) => {
      try {
        console.log(`[${index + 1}/${files.length}] Starting download: ${filePath}`);
        console.log(`   Full storage path: product-files/${filePath}`);
        const fileStartTime = Date.now();

        // Create signed URL and download via HTTP (same approach as test-email page)
        const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
          .from('product-files')
          .createSignedUrl(filePath, 3600);

        if (urlError || !signedUrlData?.signedUrl) {
          console.error(`❌ Error creating signed URL for ${filePath}:`, urlError);
          return null;
        }

        // Download file via HTTP fetch (reliable for server-side)
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          console.error(`❌ HTTP error downloading file ${filePath}: ${response.status} ${response.statusText}`);
          return null;
        }

        const fileData = await response.blob();
        const downloadTime = Date.now() - fileStartTime;

        if (!fileData || fileData.size === 0) {
          console.error(`❌ Downloaded file is empty: ${filePath}`);
          return null;
        }

        console.log(
          `✅ Downloaded ${filePath} (${(fileData.size / 1024).toFixed(1)}KB) in ${downloadTime}ms`
        );
        return { filePath, fileData, downloadTime };
      } catch (fileError) {
        console.error(`❌ Exception downloading file ${filePath}:`, fileError);
        return null;
      }
    });

    // Wait for all downloads to complete
    const downloadResults = await Promise.all(fileDownloadPromises);
    const totalDownloadTime = Date.now() - downloadStartTime;
    console.log(`📥 All file downloads completed in ${totalDownloadTime}ms`);

    // Process downloaded files
    for (let i = 0; i < downloadResults.length; i++) {
      const result = downloadResults[i];
      if (!result) continue; // Skip failed downloads

      const { filePath, fileData } = result;

      try {
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
            const watermarkStartTime = Date.now();
            console.log(
              `🎨 Watermarking PDF: ${fileName} (${(fileBuffer.length / 1024).toFixed(1)}KB)...`
            );
            const watermarkedPDF = await watermarkPDF(new Uint8Array(fileBuffer), buyerEmail);
            fileBuffer = Buffer.from(watermarkedPDF);
            const watermarkTime = Date.now() - watermarkStartTime;
            console.log(
              `✅ Watermarked PDF: ${fileName} in ${watermarkTime}ms (${(fileBuffer.length / 1024).toFixed(1)}KB)`
            );
          } catch (watermarkError) {
            console.error(`❌ Error watermarking PDF ${fileName}:`, watermarkError);
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

    console.log(
      `📊 File processing summary: ${attachments.length}/${files.length} files successfully processed`
    );

    if (attachments.length === 0) {
      console.error(`❌ CRITICAL: No files could be processed for delivery!`);
      console.error(`   Product ID: ${product.id}`);
      console.error(`   Product Title: ${product.title}`);
      console.error(`   Order ID: ${order.id}`);
      console.error(`   Files listed in product: ${files.length}`);
      console.error(`   Files that failed: ${files.length}`);
      console.error(`   File paths:`, files);
      console.error('');
      console.error('🔍 Possible causes:');
      console.error("1. Files don't exist in the product-files storage bucket");
      console.error('2. File paths in the product.files array are incorrect');
      console.error('3. Storage bucket permissions block server-side access');
      console.error("4. Server-side Supabase client doesn't have service role permissions");
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

    const totalAttachmentSize = attachments.reduce((sum, att) => sum + att.content.length, 0);
    console.log(
      `✅ Processed ${attachments.length} file(s) (${(totalAttachmentSize / 1024 / 1024).toFixed(2)}MB total) for delivery to ${buyerEmail}`
    );

    // Send email with attachments
    const emailStartTime = Date.now();
    console.log(
      `📧 Sending email to ${buyerEmail} with ${attachments.length} attachment(s) (${(totalAttachmentSize / 1024 / 1024).toFixed(2)}MB)...`
    );
    const emailResult = await sendProductDeliveryEmail({
      customerEmail: buyerEmail,
      customerName: buyerName,
      productTitle: product.title,
      productDescription: product.description || undefined,
      sellerName,
      orderId: order.id,
      attachments,
    });
    const emailTime = Date.now() - emailStartTime;
    console.log(`📧 Email send completed in ${emailTime}ms`);

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

    const totalDeliveryTime = Date.now() - deliveryStartTime;
    console.log(
      `✅ Successfully delivered product ${product.id} (${product.title}) to ${buyerEmail} in ${totalDeliveryTime}ms (${(totalDeliveryTime / 1000).toFixed(1)}s)`
    );
    console.log(`   Email ID: ${emailResult.messageId || 'N/A'}`);

    if (totalDeliveryTime > 30000) {
      console.warn(
        `⚠️ Delivery took ${(totalDeliveryTime / 1000).toFixed(1)}s - consider optimizing file sizes or watermarking`
      );
    }

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
export async function deliverProductsForOrders(orders: DeliveryOrder[]): Promise<void> {
  console.log('📦 deliverProductsForOrders called with', orders.length, 'order(s)');
  console.log(
    'Orders:',
    orders.map(o => ({
      id: o.id,
      product_id: o.product_id,
      buyer_email: o.buyer_email || 'MISSING',
      buyer_id: o.buyer_id || 'N/A',
    }))
  );

  // Use service role client since this runs async after request context is gone
  // This prevents the query from hanging when cookies/request context is unavailable
  console.log('🔧 Creating Supabase client for async operation...');
  const supabase = createServiceRoleClient();

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

    try {
      // Get all product IDs for this buyer
      const productIds = buyerOrders.map(o => o.product_id);
      console.log(`🔍 Fetching products with IDs:`, productIds);

      // Fetch all products
      const fetchStartTime = Date.now();
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title, description, files, user_id')
        .in('id', productIds);
      const fetchTime = Date.now() - fetchStartTime;

      if (productsError) {
        console.error(`❌ Error fetching products for delivery to ${buyerEmail} (${fetchTime}ms):`, productsError);
        console.error('Error details:', JSON.stringify(productsError, null, 2));
        console.error('Product IDs requested:', productIds);
        continue;
      }

      if (!products) {
        console.error(`❌ Products query returned null for ${buyerEmail} (${fetchTime}ms)`);
        console.error('Product IDs requested:', productIds);
        continue;
      }

      console.log(`✅ Fetched ${products.length} product(s) for ${buyerEmail} in ${fetchTime}ms`);
      console.log('Products:', products.map(p => ({ id: p.id, title: p.title, files_count: p.files?.length || 0 })));

    // Create a map for quick product lookup
    const productMap = new Map(products.map(p => [p.id, p]));

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

      console.log(
        `🚀 Starting delivery for order ${order.id}, product: ${product.title}, email: ${email}`
      );

      // Deliver product (errors are logged but don't stop other deliveries)
      const deliveryResult = await deliverProductToCustomer(order, product, email);

      if (!deliveryResult.success) {
        console.error(`❌ Delivery failed for order ${order.id}:`, deliveryResult.error);
      } else {
        console.log(`✅ Delivery completed successfully for order ${order.id}`);
      }
    }
    } catch (buyerError) {
      console.error(`❌ Exception processing buyer ${buyerEmail}:`, buyerError);
      console.error('Error stack:', buyerError instanceof Error ? buyerError.stack : 'No stack trace');
      // Continue with next buyer
    }
  }

  console.log('📦 deliverProductsForOrders completed');
}
