# Google Analytics Setup Guide

## ✅ Code Already Implemented

Google Analytics is now integrated into your site and will track all pages automatically through the root layout.

## 🎯 Setup Instructions

### Step 1: Create Google Analytics 4 Property

1. Go to **Google Analytics**: https://analytics.google.com
2. Click **Admin** (bottom left gear icon)
3. Click **+ Create Property**
4. Enter property details:
   - **Property name**: App Ideas Finder
   - **Timezone**: Select your timezone
   - **Currency**: USD
5. Click **Next**
6. Enter business details and click **Create**

### Step 2: Get Your Measurement ID

1. After creating the property, you'll see a **Data Stream** setup
2. Click **Web**
3. Enter website details:
   - **Website URL**: https://www.appideasfinder.com
   - **Stream name**: App Ideas Finder Website
4. Click **Create stream**
5. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 3: Add to Vercel Environment Variables

1. Go to **Vercel Dashboard**: https://vercel.com
2. Select your **app-ideas-finder** project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value**: Your G-XXXXXXXXXX code from Step 2
   - **Environment**: Production, Preview, Development (select all)
5. Click **Save**
6. **Redeploy** your site (Settings → Deployments → click latest → Redeploy)

### Step 4: Verify It's Working

After deployment:

1. Visit your site: https://www.appideasfinder.com
2. In Google Analytics, go to **Reports** → **Realtime**
3. You should see yourself as an active user
4. Click around your site and watch the real-time data update

### Alternative: Test Locally First

1. Add to your local `.env.local` file:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
2. Restart your dev server
3. Visit `http://localhost:3000`
4. Check Google Analytics Realtime to see your local session

## 📊 What Gets Tracked Automatically

With this setup, you automatically track:
- ✅ Page views (all pages)
- ✅ User sessions
- ✅ Traffic sources (organic, direct, referral)
- ✅ Device type (mobile, desktop, tablet)
- ✅ Location (country, city)
- ✅ Browser and OS

## 🎯 Custom Events (Optional - Add Later)

You can add custom event tracking for:
- Waitlist signups
- Contact form submissions
- Button clicks (e.g., "Start Generator")
- Plan selections
- Analysis completions

Example:
```typescript
// Track custom event
gtag('event', 'waitlist_signup', {
  event_category: 'engagement',
  event_label: 'landing_page',
});
```

## ✅ Checklist

- [ ] Created GA4 property
- [ ] Got Measurement ID (G-XXXXXXXXXX)
- [ ] Added to Vercel environment variables
- [ ] Redeployed site
- [ ] Verified in GA4 Realtime
- [ ] Checked data after 24 hours

## 🔍 Notes

- Data takes 24-48 hours to fully populate
- Realtime shows immediate results
- GA4 is privacy-focused and GDPR compliant
- No cookie consent banner required for basic analytics (but recommended for EU users)

## 🚀 Next Steps

Once analytics is running:
1. Set up **Goals/Conversions** for waitlist signups
2. Create **Custom Reports** for key metrics
3. Enable **Enhanced Measurement** (auto-tracks scrolls, downloads, video plays)
4. Link to **Google Search Console** for search data

