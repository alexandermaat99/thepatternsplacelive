# How to View Detailed Logs in Vercel

## Option 1: Vercel Dashboard (Limited)

1. Go to your Vercel dashboard
2. Click on your project
3. Go to "Logs" tab
4. Find the webhook request (e.g., `POST /api/webhooks/stripe`)
5. **Click on the request** to see detailed function logs
6. Look for logs with emojis: 📦, 📁, 📥, 🎨, 📧

## Option 2: Vercel CLI (Recommended)

Install Vercel CLI if you haven't:
```bash
npm i -g vercel
```

View logs in real-time:
```bash
vercel logs thepatternsplacelive --follow
```

View logs from last hour:
```bash
vercel logs thepatternsplacelive --since 1h
```

View logs for specific function:
```bash
vercel logs thepatternsplacelive --follow | grep "webhooks/stripe"
```

## Option 3: Filter in Dashboard

In Vercel dashboard logs:
1. Use the search box
2. Search for: `📦` or `deliverProductsForOrders`
3. This will filter to show only email delivery logs

## What Logs to Look For

After a purchase, you should see these logs in sequence:

1. **Webhook received:**
   ```
   🔔 Webhook received: checkout.session.completed
   ✅ Processing checkout.session.completed: [session-id]
   ```

2. **Email delivery started:**
   ```
   📦 deliverProductsForOrders called with 1 order(s)
   📬 Processing 1 order(s) for [email]
   ```

3. **File processing:**
   ```
   📁 Checking files for product [id]
   📥 Attempting to download [N] file(s)...
   ✅ Downloaded [filename] ([size]KB) in [time]ms
   ```

4. **PDF watermarking:**
   ```
   🎨 Watermarking PDF: [filename]...
   ✅ Watermarked PDF: [filename] in [time]ms
   ```

5. **Email sending:**
   ```
   📧 Sending email to [email] with [N] attachment(s)...
   📧 Email send completed in [time]ms
   ```

6. **Completion:**
   ```
   ✅ Successfully delivered product [id] to [email] in [time]ms
   ```

## Troubleshooting

If you don't see logs:
- Check that the function actually executed (look for HTTP 200 status)
- Email delivery is async - logs might appear slightly after webhook completes
- Check Vercel function execution limits/timeouts
- Verify environment variables are set correctly

