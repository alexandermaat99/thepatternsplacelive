# ThePatternsPlace Production Launch Checklist

**Print this checklist and check off items as you complete them.**

---

## 1. DOMAIN & DNS

```
[ ] Purchase/configure domain (thepatternsplace.com)
[ ] Point DNS to Vercel (add CNAME/A records)
[ ] Verify HTTPS is enabled (automatic with Vercel)
```

---

## 2. STRIPE PRODUCTION SETUP

### Switch to Live Mode

```
[ ] Toggle Stripe Dashboard from "Test" to "Live" mode
[ ] Complete Stripe account verification
[ ] Add bank account for payouts
```

### Create Production Webhook

```
[ ] Go to: Stripe Dashboard → Developers → Webhooks
[ ] Add endpoint URL: https://thepatternsplace.com/api/webhooks/stripe
[ ] Select these events:
    [ ] checkout.session.completed
    [ ] checkout.session.expired
    [ ] charge.succeeded
[ ] Copy webhook signing secret (starts with whsec_)
```

### Connect Settings

```
[ ] Go to: Settings (gear icon) → Connect
[ ] Or direct URL: dashboard.stripe.com/settings/connect
[ ] Set platform branding (Settings → Connect → Branding)
[ ] Verify Express account settings (Settings → Connect → Account types)
```

**Write down your Stripe keys:**

| Key                                | Value                                              |
| ---------------------------------- | -------------------------------------------------- |
| Live Secret Key (sk*live*...)      | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |
| Live Publishable Key (pk*live*...) | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |
| Webhook Secret (whsec\_...)        | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |

---

## 3. RESEND EMAIL SETUP

### Domain Verification

```
[ ] Go to: resend.com/domains
[ ] Add domain: thepatternsplace.com
[ ] Add DNS records (provided by Resend):
    [ ] SPF record (TXT)
    [ ] DKIM record (TXT)
    [ ] DMARC record (optional)
[ ] Wait for verification (green checkmark)
```

**Write down your Resend settings:**

| Setting           | Value                                              |
| ----------------- | -------------------------------------------------- |
| API Key (re\_...) | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |
| From Email        | noreply@thepatternsplace.com                       |
| From Name         | The Patterns Place                                 |

---

## 4. SUPABASE PRODUCTION SETTINGS

### API Keys

```
[ ] Go to: Supabase Dashboard → Project Settings → API
[ ] Copy production URL and keys
```

### Auth Configuration

```
[ ] Go to: Supabase → Auth → URL Configuration
[ ] Set Site URL: https://thepatternsplace.com
[ ] Add Redirect URL: https://thepatternsplace.com/**
```

### Security

```
[ ] Verify RLS (Row Level Security) enabled on all tables
[ ] Test RLS policies
[ ] Enable database backups (requires Pro plan)
```

**Write down your Supabase keys:**

| Key              | Value                                              |
| ---------------- | -------------------------------------------------- |
| Project URL      | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |
| Anon Key         | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |
| Service Role Key | **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\*** |

---

## 5. VERCEL ENVIRONMENT VARIABLES

**Add ALL of these to Vercel → Project Settings → Environment Variables:**

### Supabase Variables

```
[ ] NEXT_PUBLIC_SUPABASE_URL = (your Supabase URL)
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY = (your anon key)
[ ] SUPABASE_SERVICE_ROLE_KEY = (your service role key)
```

### Stripe Variables (USE LIVE KEYS!)

```
[ ] STRIPE_SECRET_KEY = sk_live_...
[ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
[ ] STRIPE_WEBHOOK_SECRET = whsec_...
```

### Resend Variables

```
[ ] RESEND_API_KEY = re_...
[ ] RESEND_FROM_EMAIL = noreply@thepatternsplace.com
[ ] RESEND_FROM_NAME = The Patterns Place
```

---

## 6. SECURITY CHECKLIST

```
[ ] Remove /test-email route or protect it
[ ] Remove /test-db route or protect it
[ ] Remove any console.log with sensitive data
[ ] Verify no API keys in client-side code
[ ] Review all RLS policies one more time
```

---

## 7. LEGAL & CONTENT

```
[ ] Review Privacy Policy (/privacy)
[ ] Review Terms of Service (/terms)
[ ] Verify cookie consent is working
[ ] Update contact information
[ ] Update metadata (title, description) in app/layout.tsx
```

---

## 8. PRE-LAUNCH TESTING

### Full Purchase Flow

```
[ ] Create a test product as a seller
[ ] Purchase the product with a real card
[ ] Verify order appears in database
[ ] Verify email is received with files attached
[ ] Verify seller earnings appear in dashboard
```

### Seller Onboarding

```
[ ] Test new seller signup
[ ] Complete Stripe Express onboarding
[ ] Verify seller can list products
```

### General Testing

```
[ ] Test on mobile (iPhone & Android)
[ ] Test signup flow
[ ] Test login flow
[ ] Test password reset
[ ] Test file uploads
[ ] Check all pages load correctly
```

---

## 9. POST-LAUNCH MONITORING

**Bookmark these dashboards:**

| Service  | URL                    | Check Daily |
| -------- | ---------------------- | ----------- |
| Vercel   | vercel.com/dashboard   | [ ]         |
| Stripe   | dashboard.stripe.com   | [ ]         |
| Supabase | supabase.com/dashboard | [ ]         |
| Resend   | resend.com/emails      | [ ]         |

### Set Up Monitoring (Optional but Recommended)

```
[ ] Error tracking (Sentry or similar)
[ ] Uptime monitoring (Better Uptime, Pingdom)
[ ] Enable Vercel Analytics
```

---

## 10. FINAL DEPLOYMENT

```
[ ] Push final code to main branch
[ ] Verify Vercel deployment succeeds
[ ] Test live site one more time
[ ] Announce launch! 🎉
```

---

## QUICK REFERENCE

### Your Production URLs

| Purpose        | URL                                              |
| -------------- | ------------------------------------------------ |
| Live Site      | https://thepatternsplace.com                     |
| Stripe Webhook | https://thepatternsplace.com/api/webhooks/stripe |

### Emergency Contacts

| Service  | Support              |
| -------- | -------------------- |
| Stripe   | support.stripe.com   |
| Supabase | supabase.com/support |
| Resend   | resend.com/support   |
| Vercel   | vercel.com/support   |

---

**Date Completed: **\*\*\***\*\_\_\_\_\*\***\*\*\*\*\*\*

**Launched By: **\*\*\***\*\_\_\_\_\*\***\*\*\*\*\*\*
