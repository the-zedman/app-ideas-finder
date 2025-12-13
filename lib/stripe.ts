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
  CORE_MONTHLY: process.env.STRIPE_PRICE_CORE_MONTHLY || '', // $12.50/month
  CORE_ANNUAL: process.env.STRIPE_PRICE_CORE_ANNUAL || '', // $100/year
  PRIME_MONTHLY: process.env.STRIPE_PRICE_PRIME_MONTHLY || '', // $25/month
  PRIME_ANNUAL: process.env.STRIPE_PRICE_PRIME_ANNUAL || '', // $200/year
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
    searches: 25,
    price: 12.50,
    interval: 'month',
    priceId: STRIPE_PRICES.CORE_MONTHLY,
  },
  core_annual: {
    name: 'Core (Annual)',
    searches: 25,
    price: 100.00,
    interval: 'year',
    savings: 50,
    priceId: STRIPE_PRICES.CORE_ANNUAL,
  },
  prime_monthly: {
    name: 'Prime (Monthly)',
    searches: 100,
    price: 25.00,
    interval: 'month',
    priceId: STRIPE_PRICES.PRIME_MONTHLY,
  },
  prime_annual: {
    name: 'Prime (Annual)',
    searches: 100,
    price: 200.00,
    interval: 'year',
    savings: 100,
    priceId: STRIPE_PRICES.PRIME_ANNUAL,
  },
  search_pack: {
    name: 'Search Pack',
    searches: 29,
    price: 29.00, // Suggested pricing
    priceId: STRIPE_PRICES.SEARCH_PACK,
  },
};

