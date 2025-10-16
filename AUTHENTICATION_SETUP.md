# Authentication Setup Guide

This guide will help you configure Supabase authentication with Email/Password, Magic Links, GitHub OAuth, and Google OAuth.

## Prerequisites

- Supabase project created
- Environment variables configured in `.env.local`

## Step 1: Enable Authentication Providers in Supabase

### 1.1 Access Authentication Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**

### 1.2 Enable Email Provider

1. Find **Email** in the providers list
2. Toggle it **ON**
3. Configure settings:
   - **Enable Email Confirmations**: ON (recommended)
   - **Secure Email Change**: ON (recommended)
   - **Enable Email OTP**: ON (for magic links)

### 1.3 Configure GitHub OAuth

1. **Create GitHub OAuth App**:
   - Go to https://github.com/settings/developers
   - Click **New OAuth App**
   - Fill in:
     - **Application name**: App Ideas Finder
     - **Homepage URL**: `http://localhost:3001` (development) or `https://appideasfinder.com` (production)
     - **Authorization callback URL**: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
   - Click **Register application**
   - Copy **Client ID** and generate a **Client Secret**

2. **Configure in Supabase**:
   - In Supabase dashboard, find **GitHub** provider
   - Toggle it **ON**
   - Paste your **Client ID**
   - Paste your **Client Secret**
   - Click **Save**

### 1.4 Configure Google OAuth

1. **Create Google OAuth App**:
   - Go to https://console.cloud.google.com
   - Create a new project or select existing
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Configure OAuth consent screen if not done
   - Select **Web application**
   - Add Authorized redirect URIs:
     - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
   - Click **Create**
   - Copy **Client ID** and **Client Secret**

2. **Configure in Supabase**:
   - In Supabase dashboard, find **Google** provider
   - Toggle it **ON**
   - Paste your **Client ID**
   - Paste your **Client Secret**
   - Click **Save**

## Step 2: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the following templates:
   - **Confirm signup**: Sent when users register
   - **Magic Link**: Sent for passwordless login
   - **Change Email Address**: Sent when users change email
   - **Reset Password**: Sent for password resets

### Recommended Email Template Variables:

```html
<h2>Welcome to App Ideas Finder!</h2>
<p>Click the link below to confirm your email:</p>
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
```

## Step 3: Configure URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: 
   - Development: `http://localhost:3001`
   - Production: `https://appideasfinder.com`
3. Add **Redirect URLs**:
   - `http://localhost:3001/auth/callback`
   - `https://appideasfinder.com/auth/callback`

## Step 4: Test Authentication

### Test Email/Password

1. Navigate to `http://localhost:3001/signup`
2. Sign up with an email and password
3. Check your email for confirmation link
4. Click the link to verify
5. Try logging in at `http://localhost:3001/login`

### Test Magic Link

1. Navigate to `http://localhost:3001/login`
2. Toggle to "Magic Link" mode
3. Enter your email
4. Check your email for the magic link
5. Click the link to log in

### Test GitHub OAuth

1. Navigate to `http://localhost:3001/login`
2. Click **Continue with GitHub**
3. Authorize the app
4. You should be redirected to `/homezone`

### Test Google OAuth

1. Navigate to `http://localhost:3001/login`
2. Click **Continue with Google**
3. Select your Google account
4. You should be redirected to `/homezone`

## Step 5: Production Deployment

### Update OAuth Callback URLs

When deploying to production:

1. **GitHub OAuth**:
   - Go to your GitHub OAuth app settings
   - Update **Homepage URL**: `https://appideasfinder.com`
   - Keep callback URL as Supabase URL

2. **Google OAuth**:
   - Go to Google Cloud Console
   - Update Authorized redirect URIs
   - Keep Supabase callback URL

3. **Supabase**:
   - Update **Site URL** to production domain
   - Add production redirect URL

## Troubleshooting

### "Email not confirmed" error
- Check your email for confirmation link
- Ensure email confirmations are enabled in Supabase
- Check spam folder

### OAuth redirect fails
- Verify callback URLs match exactly
- Check that provider is enabled in Supabase
- Ensure Site URL is configured correctly

### Magic link not working
- Verify "Enable Email OTP" is turned on
- Check email templates are configured
- Ensure redirect URL is in allowed list

### Session not persisting
- Check middleware is configured correctly
- Verify cookies are working (not blocked)
- Check browser console for errors

## Security Best Practices

1. **Enable Email Confirmation**: Prevents spam signups
2. **Use Strong Password Policies**: Set minimum length and complexity
3. **Enable MFA**: Consider adding multi-factor authentication
4. **Rate Limiting**: Supabase provides built-in rate limiting
5. **Monitor Auth Logs**: Check Supabase logs regularly

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Files Created

- `/lib/supabase-client.ts` - Browser client
- `/lib/supabase-server.ts` - Server client
- `/middleware.ts` - Route protection
- `/app/auth/callback/route.ts` - OAuth callback handler
- `/app/login/page.tsx` - Login page
- `/app/signup/page.tsx` - Signup page
- `/app/homezone/page.tsx` - Protected dashboard (updated)

## Protected Routes

The following routes require authentication:
- `/homezone` - Main dashboard

Unauthenticated users will be redirected to `/login`.

## Next Steps

1. Customise email templates with your branding
2. Add password reset functionality
3. Implement profile settings page
4. Add multi-factor authentication
5. Set up Row Level Security (RLS) policies for user data

