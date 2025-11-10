# Stripe Environment Variables Setup

## Required Environment Variables for Vercel

You need to set these environment variables in your Vercel project settings:

### 1. Stripe API Keys (TEST MODE)

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Where to find these:**
- Go to https://dashboard.stripe.com/test/apikeys
- Copy your **Publishable key** (starts with `pk_test_`)
- Copy your **Secret key** (starts with `sk_test_`)
- For webhook secret, go to https://dashboard.stripe.com/test/webhooks and get the signing secret from your webhook endpoint

---

### 2. Stripe Product Price IDs (TEST MODE)

After creating your products in Stripe Dashboard, you'll get Price IDs for each. Add these to Vercel:

```
NEXT_PUBLIC_STRIPE_PRICE_CORE_MONTHLY=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_CORE_ANNUAL=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRIME_MONTHLY=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PRIME_ANNUAL=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_SEARCH_PACK=price_xxxxxxxxxxxxx
STRIPE_PRICE_TRIAL=price_xxxxxxxxxxxxx (optional - for trial product)
```

**Where to find these:**
1. Go to https://dashboard.stripe.com/test/products
2. Click on each product you created
3. Copy the Price ID (starts with `price_`)
4. Paste into Vercel environment variables

---

## Product Setup in Stripe

Make sure you've created these products in Stripe Test Mode:

1. **Core Monthly** - $39/month recurring subscription
2. **Core Annual** - $399/year recurring subscription  
3. **Prime Monthly** - $79/month recurring subscription
4. **Prime Annual** - $799/year recurring subscription
5. **Search Pack** - $29 one-time payment
6. **Trial** (optional) - $1 one-time payment

---

## How to Set Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project (app-ideas-finder)
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Make sure to select **Production**, **Preview**, and **Development** for each
6. Click **Save**
7. Redeploy your site (Vercel will prompt you, or go to Deployments and click "Redeploy")

---

## Testing the Setup

After setting environment variables and redeploying:

1. Login to your site
2. Go to `/billing`
3. You should see a yellow banner: **"Stripe Test Mode Active"**
4. Click any plan button
5. You should be redirected to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
7. Complete the checkout

---

## Common Issues

**❌ 500 error on checkout:**
- Check that `STRIPE_SECRET_KEY` is set correctly
- Check that the price IDs match your actual Stripe products
- Check Vercel deployment logs for the exact error

**❌ "Price ID required" error:**
- Make sure you've set all the `NEXT_PUBLIC_STRIPE_PRICE_*` variables
- Redeploy after adding them

**❌ Webhook not firing:**
- Make sure `STRIPE_WEBHOOK_SECRET` is set
- Check your webhook endpoint is: `https://www.appideasfinder.com/api/webhooks/stripe`
- Check webhook logs in Stripe Dashboard

---

## Note About Environment Variable Prefixes

- `NEXT_PUBLIC_*` variables are **exposed to the browser** (safe for public use)
- Variables without `NEXT_PUBLIC_` are **server-side only** (keep secret!)

That's why API keys are split:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Safe for browser
- `STRIPE_SECRET_KEY` → Server-side only (never exposed)

