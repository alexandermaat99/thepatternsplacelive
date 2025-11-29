import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();

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
    if (!product.files || product.files.length === 0) {
      // No files to deliver, but we can still send a confirmation email
      console.warn(`Product ${product.id} (${product.title}) has no files to deliver. Order ${order.id} will not receive an email.`);
      console.warn('To fix: Add files to the product using the product-files storage bucket.');
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

    for (const filePath of product.files) {
      try {
        console.log(`Attempting to download file: ${filePath} from product-files bucket`);
        
        // Download file from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('product-files')
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(`Error downloading file ${filePath} from product-files bucket:`, downloadError);
          console.error('Make sure:');
          console.error('1. The product-files storage bucket exists');
          console.error('2. The file path is correct');
          console.error('3. The file was uploaded to the product-files bucket (not product-images)');
          continue; // Skip this file but continue with others
        }
        
        console.log(`Successfully downloaded file: ${filePath}`);

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

    if (attachments.length === 0) {
      console.error(`No files could be processed for delivery. Product ${product.id} has ${product.files?.length || 0} files listed, but none could be downloaded.`);
      console.error('Check:');
      console.error('1. Files exist in the product-files storage bucket');
      console.error('2. File paths in the product.files array are correct');
      console.error('3. Storage bucket permissions allow access');
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
      console.warn(`Order ${order.id} has no buyer_email - skipping delivery`);
    }
  }

  // Process each buyer's orders
  for (const [buyerEmail, buyerOrders] of ordersByEmail.entries()) {
    // Get all product IDs for this buyer
    const productIds = buyerOrders.map((o) => o.product_id);

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, description, files, user_id')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Error fetching products for delivery:', productsError);
      continue;
    }

    // Create a map for quick product lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Deliver each product
    for (const order of buyerOrders) {
      const product = productMap.get(order.product_id);
      if (!product) {
        console.error(`Product ${order.product_id} not found`);
        continue;
      }

      // Use buyer_email from order (should be set from Stripe session)
      const email = order.buyer_email;
      if (!email) {
        console.error(`No email found for order ${order.id} - buyer_email is required`);
        continue;
      }

      // Deliver product (non-blocking - errors are logged but don't stop other deliveries)
      await deliverProductToCustomer(order, product, email);
    }
  }
}

