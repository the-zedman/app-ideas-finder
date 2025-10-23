'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    bio: '',
    website: '',
    location: '',
    timezone: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFormData({
          fullName: user.user_metadata?.full_name || '',
          email: user.email || '',
          bio: user.user_metadata?.bio || '',
          website: user.user_metadata?.website || '',
          location: user.user_metadata?.location || '',
          timezone: user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
      setLoading(false);
    };

    getUser();
  }, [supabase.auth]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          bio: formData.bio,
          website: formData.website,
          location: formData.location,
          timezone: formData.timezone,
        }
      });

      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else {
        setMessage('Profile updated successfully!');
        setMessageType('success');
        setIsEditing(false);
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const email = getEmail();
    if (!email || email === 'dev@localhost.com') {
      setMessage('Cannot change password in development mode');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
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

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Note: Supabase doesn't have a direct delete user method
      // You would need to implement this via a database function or API route
      setMessage('Account deletion requires admin assistance. Please contact support.');
      setMessageType('error');
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Developer';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const getProviderIcon = () => {
    const provider = user?.app_metadata?.provider;
    switch (provider) {
      case 'github':
        return '🐙';
      case 'google':
        return '🔍';
      case 'email':
        return '📧';
      default:
        return '👤';
    }
  };

  const getEmail = () => {
    return user?.email || 'dev@localhost.com';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#3D405B]">Loading...</div>
      </div>
    );
  }

  // In development bypass mode, allow access without user
  const isDevelopmentBypass = process.env.NODE_ENV === 'development' && 
                              process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  if (!user && !isDevelopmentBypass) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-grey/30 sticky top-0 z-50 backdrop-blur-lg bg-white/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between h-16">
          <button
            onClick={() => router.push('/homezone')}
            className="text-[#E07A5F] font-medium active:scale-95 transition-transform"
          >
            ← Back to HomeZone
          </button>
          <div className="flex items-center space-x-2">
            <Image
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder Logo"
              width={32}
              height={32}
              className="rounded-md"
            />
            <h1 className="text-lg font-semibold text-[#3D405B]">
              Profile
            </h1>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Profile Header */}
          <div className="bg-gradient-to-br from-[#E07A5F] to-[#E07A5F]/80 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                {getInitials()}
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{getDisplayName()}</h2>
                <p className="text-white/90 text-sm">{getEmail()}</p>
                <div className="flex items-center mt-2">
                  <span className="text-white/80 text-sm">{getProviderIcon()} {user?.app_metadata?.provider || 'email'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-6 bg-grey/10 rounded-xl p-1">
            <button
              onClick={() => setActiveSection('profile')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeSection === 'profile'
                  ? 'bg-white text-[#E07A5F] shadow-sm'
                  : 'text-[#3D405B]/60 hover:text-[#3D405B]'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeSection === 'security'
                  ? 'bg-white text-[#E07A5F] shadow-sm'
                  : 'text-[#3D405B]/60 hover:text-[#3D405B]'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveSection('preferences')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeSection === 'preferences'
                  ? 'bg-white text-[#E07A5F] shadow-sm'
                  : 'text-[#3D405B]/60 hover:text-[#3D405B]'
              }`}
            >
              Preferences
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-xl mb-6 ${
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

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-grey/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#3D405B]">Personal Information</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[#E07A5F] font-medium text-sm active:scale-95 transition-transform"
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D405B] mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] focus:outline-none focus:border-[#E07A5F] transition-colors disabled:bg-grey/10 disabled:text-[#3D405B]/60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3D405B] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-grey/10 text-[#3D405B]/60"
                    />
                    <p className="text-xs text-[#3D405B]/60 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3D405B] mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] focus:outline-none focus:border-[#E07A5F] transition-colors disabled:bg-grey/10 disabled:text-[#3D405B]/60 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3D405B] mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      disabled={!isEditing}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] focus:outline-none focus:border-[#E07A5F] transition-colors disabled:bg-grey/10 disabled:text-[#3D405B]/60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3D405B] mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      disabled={!isEditing}
                      placeholder="City, Country"
                      className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] focus:outline-none focus:border-[#E07A5F] transition-colors disabled:bg-grey/10 disabled:text-[#3D405B]/60"
                    />
                  </div>

                  {isEditing && (
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex-1 py-3 bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-grey/30">
                <h3 className="text-lg font-semibold text-[#3D405B] mb-4">Password & Security</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-grey/5 rounded-xl">
                    <div>
                      <h4 className="font-medium text-[#3D405B]">Change Password</h4>
                      <p className="text-sm text-[#3D405B]/60">Update your account password</p>
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="px-4 py-2 bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-grey/5 rounded-xl">
                    <div>
                      <h4 className="font-medium text-[#3D405B]">Two-Factor Authentication</h4>
                      <p className="text-sm text-[#3D405B]/60">Add an extra layer of security</p>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 bg-grey/20 text-[#3D405B]/40 font-medium rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                    <div>
                      <h4 className="font-medium text-red-800">Delete Account</h4>
                      <p className="text-sm text-red-600">Permanently delete your account and data</p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-grey/30">
                <h3 className="text-lg font-semibold text-[#3D405B] mb-4">App Preferences</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D405B] mb-2">
                      Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-grey/40 bg-white text-[#3D405B] focus:outline-none focus:border-[#E07A5F] transition-colors"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Australia/Sydney">Sydney</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-grey/5 rounded-xl">
                    <div>
                      <h4 className="font-medium text-[#3D405B]">Email Notifications</h4>
                      <p className="text-sm text-[#3D405B]/60">Receive updates about new features</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-grey/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E07A5F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-grey/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E07A5F]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-grey/5 rounded-xl">
                    <div>
                      <h4 className="font-medium text-[#3D405B]">Dark Mode</h4>
                      <p className="text-sm text-[#3D405B]/60">Switch to dark theme</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-grey/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E07A5F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-grey/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E07A5F]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
