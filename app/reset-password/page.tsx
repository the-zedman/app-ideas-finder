'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isValidSession, setIsValidSession] = useState(false);
  
  const supabase = createClient();

  const checkPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;
    return strength;
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    setPasswordStrength(checkPasswordStrength(pwd));
  };

  useEffect(() => {
    // Listen for auth state changes to detect PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      
      if (event === 'PASSWORD_RECOVERY') {
        // User is in password recovery mode
        setIsValidSession(true);
      } else if (session) {
        // User has a valid session
        setIsValidSession(true);
      } else {
        // Check if we have URL parameters that indicate a password reset
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');
        
        if (token && type === 'recovery') {
          // This is a password reset link, the token is already valid if we got here
          setIsValidSession(true);
        } else {
          setMessage('Invalid or expired password reset link. Please request a new one.');
          setMessageType('error');
        }
      }
    });

    // Also check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validation
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      // Update the password - Supabase handles the session automatically
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else {
        setMessage('Password updated successfully! Redirecting to your dashboard...');
        setMessageType('success');
        
        // Redirect to homezone after successful password update
        setTimeout(() => {
          router.push('/homezone');
        }, 2000);
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  if (!isValidSession && message) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">
            <Image
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-lg"
            />
            <h1 className="text-2xl font-bold text-[#3D405B] mb-4">Invalid Reset Link</h1>
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
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-3 bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-semibold rounded-xl transition-all"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 border-b border-grey/30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/login')}
            className="text-[#E07A5F] font-medium active:scale-95 transition-transform"
          >
            ← Back to Login
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
            <h1 className="text-3xl font-bold text-[#3D405B] mb-2">Reset Your Password</h1>
            <p className="text-[#3D405B]/70">Enter your new password below</p>
          </div>

          {/* Password Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-4 mb-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#3D405B] mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] placeholder-[#3D405B]/40 focus:outline-none focus:border-[#E07A5F] transition-colors"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#3D405B]/60">Password strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength <= 1 ? 'text-red-600' : 
                      passwordStrength <= 3 ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#3D405B] mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] placeholder-[#3D405B]/40 focus:outline-none focus:border-[#E07A5F] transition-colors"
              />
            </div>

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
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>

          {/* Security Note */}
          <div className="text-center">
            <p className="text-xs text-[#3D405B]/60">
              🔒 Your password is encrypted and secure
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
