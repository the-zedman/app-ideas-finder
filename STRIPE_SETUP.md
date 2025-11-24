# Stripe Integration Setup Guide

Complete guide for setting up Stripe payment processing for App Ideas Finder.

## Step 1: Add Environment Variables

Add these to your `.env.local` file and Vercel environment variables:

```bash
# Stripe Configuration
# Get these from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret
# Get this from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create products/prices in Stripe Dashboard first)
STRIPE_PRICE_TRIAL=price_...
STRIPE_PRICE_CORE_MONTHLY=price_...
STRIPE_PRICE_CORE_ANNUAL=price_...
STRIPE_PRICE_PRIME_MONTHLY=price_...
STRIPE_PRICE_PRIME_ANNUAL=price_...
STRIPE_PRICE_SEARCH_PACK=price_...
```

## Step 2: Create Products in Stripe Dashboard

Go to https://dashboard.stripe.com/products and create:

### 1. Trial Product
- **Name**: Trial (3-day trial)
- **Description**: 3-day trial with 10 searches
- **Price**: $1.00 USD (one-time payment)
- Copy the Price ID to `STRIPE_PRICE_TRIAL`

### 2. Core Plan
- **Name**: Core Plan
- **Description**: 75 searches per month
- **Prices**:
  - Monthly: $39.00/month (recurring)
  - Annual: $399.00/year (recurring) - saves $69/year
- Copy Price IDs to `STRIPE_PRICE_CORE_MONTHLY` and `STRIPE_PRICE_CORE_ANNUAL`

### 3. Prime Plan
- **Name**: Prime Plan
- **Description**: 225 searches per month
- **Prices**:
  - Monthly: $79.00/month (recurring)
  - Annual: $799.00/year (recurring) - saves $149/year
- Copy Price IDs to `STRIPE_PRICE_PRIME_MONTHLY` and `STRIPE_PRICE_PRIME_ANNUAL`

### 4. Search Pack
- **Name**: Search Pack
- **Description**: 53 additional searches (never expires)
- **Price**: $29.00 USD (one-time payment)
- Copy the Price ID to `STRIPE_PRICE_SEARCH_PACK`

## Step 3: Set Up Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://www.appideasfinder.com/api/webhooks/stripe`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the Signing Secret to `STRIPE_WEBHOOK_SECRET`

## Step 4: Test with Stripe CLI (Optional - for local development)

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Pricing Summary

- **Trial**: $1 (3 days, 10 searches) → expires after 3 days, requires manual subscription
- **Core Monthly**: $39/month (73 searches)
- **Core Annual**: $399/year (73 searches, save $69)
- **Prime Monthly**: $79/month (227 searches)
- **Prime Annual**: $799/year (227 searches, save $149)
- **Search Pack**: $29 (53 searches, never expires)

