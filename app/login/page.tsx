'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [authMode, setAuthMode] = useState<'password' | 'magic'>('password');
  
  const supabase = createClient();
  const redirectTo = searchParams.get('redirectTo') || '/homezone';

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth_failed') {
      setMessage('Authentication failed. Please try again.');
      setMessageType('error');
    }
  }, [searchParams]);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/homezone`,
        },
      });

      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else {
        setMessage('Check your email for a magic link!');
        setMessageType('success');
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('Please enter your email address first');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else {
        setMessage('Password reset email sent! Check your inbox.');
        setMessageType('success');
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
        },
      });

      if (error) {
        setMessage(error.message);
        setMessageType('error');
        setLoading(false);
      }
      // Don't set loading to false here as the redirect will happen
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 border-b border-grey/30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-[#E07A5F] font-medium active:scale-95 transition-transform"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold text-[#3D405B]">App Ideas Finder</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {/* Welcome */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#3D405B] mb-2">Welcome Back</h1>
            <p className="text-[#3D405B]/70">Sign in to continue to your Home Zone</p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#24292e] hover:bg-[#24292e]/90 font-medium rounded-xl flex items-center justify-center gap-3 active:scale-98 transition-all disabled:opacity-50"
              style={{ color: 'white' }}
            >
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Continue with GitHub
            </button>

            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-black/5 text-[#3D405B] font-medium rounded-xl flex items-center justify-center gap-3 border-2 border-grey/40 active:scale-98 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-grey/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[#3D405B]/50">or</span>
            </div>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex rounded-xl bg-black/5 p-1 mb-6">
            <button
              onClick={() => setAuthMode('password')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                authMode === 'password'
                  ? 'bg-white text-[#3D405B] shadow-sm'
                  : 'text-[#3D405B]/50'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setAuthMode('magic')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                authMode === 'magic'
                  ? 'bg-white text-[#3D405B] shadow-sm'
                  : 'text-[#3D405B]/50'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Email/Password or Magic Link Form */}
          <form onSubmit={authMode === 'password' ? handleEmailPasswordLogin : handleMagicLink} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#3D405B] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] placeholder-[#3D405B]/40 focus:outline-none focus:border-[#E07A5F] transition-colors"
              />
            </div>

            {authMode === 'password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#3D405B] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] placeholder-[#3D405B]/40 focus:outline-none focus:border-[#E07A5F] transition-colors"
                />
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-xl ${
                messageType === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  messageType === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#E07A5F] hover:bg-[#E07A5F]/90 active:scale-98 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : authMode === 'password' ? 'Sign In' : 'Send Magic Link'}
            </button>
          </form>

          {/* Forgot Password Link - Only show for password mode */}
          {authMode === 'password' && (
            <div className="text-center mt-4">
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[#E07A5F] text-sm font-medium hover:underline disabled:opacity-50"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-[#3D405B]/70">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/signup')}
                className="text-[#E07A5F] font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

