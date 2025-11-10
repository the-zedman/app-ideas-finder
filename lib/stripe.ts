import Stripe from 'stripe';

// Initialize Stripe with the secret key (only if available)
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  : null as any as Stripe; // Type assertion for build time

// Stripe Price IDs - these will be created in Stripe Dashboard
export const STRIPE_PRICES = {
  TRIAL: process.env.STRIPE_PRICE_TRIAL || '', // $1 one-time
  CORE_MONTHLY: process.env.STRIPE_PRICE_CORE_MONTHLY || '', // $39/month
  CORE_ANNUAL: process.env.STRIPE_PRICE_CORE_ANNUAL || '', // $399/year
  PRIME_MONTHLY: process.env.STRIPE_PRICE_PRIME_MONTHLY || '', // $79/month
  PRIME_ANNUAL: process.env.STRIPE_PRICE_PRIME_ANNUAL || '', // $799/year
  SEARCH_PACK: process.env.STRIPE_PRICE_SEARCH_PACK || '', // Search pack pricing (to be determined)
};

// Plan details
export const PLAN_DETAILS = {
  trial: {
    name: 'Trial',
    searches: 10,
    duration: 3, // days
    price: 1.00,
    priceId: STRIPE_PRICES.TRIAL,
  },
  core_monthly: {
    name: 'Core (Monthly)',
    searches: 73,
    price: 39.00,
    interval: 'month',
    priceId: STRIPE_PRICES.CORE_MONTHLY,
  },
  core_annual: {
    name: 'Core (Annual)',
    searches: 73,
    price: 399.00,
    interval: 'year',
    savings: 69,
    priceId: STRIPE_PRICES.CORE_ANNUAL,
  },
  prime_monthly: {
    name: 'Prime (Monthly)',
    searches: 227,
    price: 79.00,
    interval: 'month',
    priceId: STRIPE_PRICES.PRIME_MONTHLY,
  },
  prime_annual: {
    name: 'Prime (Annual)',
    searches: 227,
    price: 799.00,
    interval: 'year',
    savings: 149,
    priceId: STRIPE_PRICES.PRIME_ANNUAL,
  },
  search_pack: {
    name: 'Search Pack',
    searches: 50,
    price: 29.00, // Suggested pricing
    priceId: STRIPE_PRICES.SEARCH_PACK,
  },
};

