'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';
import Footer from '@/components/Footer';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    bio: '',
    website: '',
    location: '',
    timezone: '',
    customInitials: '',
    email_notifications: true,
    dark_mode: false,
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [deleteRequest, setDeleteRequest] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const supabase = createClient();

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'security', name: 'Security' },
    { id: 'preferences', name: 'Preferences' }
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch profile data from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }
        
        console.log('Profile data from database:', profile);

        setFormData({
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          email: user.email || '',
          username: profile?.username || user.email?.split('@')[0] || '',
          bio: profile?.bio || '',
          website: profile?.website || '',
          location: profile?.location || '',
          timezone: profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          customInitials: profile?.custom_initials || '',
          email_notifications: profile?.email_notifications ?? true,
          dark_mode: profile?.dark_mode ?? false,
        });
      }
      
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    fetchDeleteRequestStatus();
  }, []);

  const handleSaveProfile = async () => {
    // In development bypass mode, show success message without database operations
    const isDevelopmentBypass = process.env.NODE_ENV === 'development' && 
                                process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    if (!user && isDevelopmentBypass) {
      setMessage('Profile updated successfully! (Development mode - changes not saved)');
      setMessageType('success');
      setIsEditing(false);
      return;
    }

    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // First, try to update existing profile
      let { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username,
          bio: formData.bio,
          website: formData.website,
          location: formData.location,
          timezone: formData.timezone,
          custom_initials: formData.customInitials,
          email_notifications: formData.email_notifications,
          dark_mode: formData.dark_mode,
        })
        .eq('id', user.id)
        .select();

      // If no rows were updated, create a new profile
      if (!error && (!data || data.length === 0)) {
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formData.username,
            bio: formData.bio,
            website: formData.website,
            location: formData.location,
            timezone: formData.timezone,
            custom_initials: formData.customInitials,
            email_notifications: formData.email_notifications,
            dark_mode: formData.dark_mode,
          })
          .select();

        if (insertError) {
          console.error('Profile insert error:', insertError);
          setMessage(`Failed to save profile: ${insertError.message}`);
          setMessageType('error');
          return;
        }
      } else if (error) {
        console.error('Profile update error:', error);
        setMessage(`Failed to save profile: ${error.message}`);
        setMessageType('error');
        return;
      }

      setMessage('Profile updated successfully!');
      setMessageType('success');
      setIsEditing(false);
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

const fetchDeleteRequestStatus = async () => {
  try {
    const response = await fetch('/api/account/delete-request');
    const data = await response.json();

    if (response.ok) {
      setDeleteRequest(data.request);
    }
  } catch (error) {
    console.error('Failed to fetch delete request status:', error);
  }
};


  const handleDeleteAccount = async () => {
    if (deleteRequest?.status === 'pending') {
      setMessage('You already have a pending deletion request.');
      setMessageType('error');
      return;
    }

    if (!confirm('Submit an account deletion request? Our team will review and process it.')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setDeleteRequest(data.request);
      setDeleteReason('');
      setMessage('Request submitted. We will email you once it is processed.');
      setMessageType('success');
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while requesting deletion'
      );
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Developer';
  };

  // Get Gravatar URL from email
  const getGravatarUrl = (email: string, size: number = 200) => {
    const hash = CryptoJS.MD5(email.toLowerCase().trim()).toString();
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  };

  const getInitials = () => {
    if (formData.customInitials) return formData.customInitials.toUpperCase();
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase();
    }
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

  const getProviderLabel = () => {
    const provider = user?.app_metadata?.provider;
    if (provider === 'github') return 'GitHub';
    if (provider === 'google') return 'Google';
    if (provider === 'email') return 'Magic Link';
    return 'OAuth';
  };

  const getEmail = () => {
    return user?.email || 'dev@localhost.com';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Loading...</div>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8 rounded-lg"
              />
              <a href="/homezone" className="text-xl font-bold text-[#3D405B] hover:text-gray-700">
                App Ideas Finder
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">Back to Dashboard</a>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Avatar/Initials Display */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#88D18A] flex items-center justify-center text-2xl font-bold text-white overflow-hidden relative">
                    <img 
                      src={getGravatarUrl(getEmail(), 80)} 
                      alt="Profile" 
                      className="w-full h-full object-cover absolute inset-0"
                      onLoad={() => {
                        // Hide initials when Gravatar loads
                        const initialsDiv = document.querySelector('.gravatar-initials') as HTMLElement;
                        if (initialsDiv) initialsDiv.style.display = 'none';
                      }}
                      onError={(e) => {
                        // If Gravatar fails to load, hide the image to show initials
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="gravatar-initials absolute inset-0 flex items-center justify-center bg-[#88D18A] text-white text-2xl font-bold">
                      {getInitials()}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">Profile Display</h3>
                  <p className="text-sm text-gray-600">Shows your Gravatar if available, otherwise your initials</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Set up your Gravatar at <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-[#88D18A] hover:underline">gravatar.com</a>
                  </p>
                  
                  {/* Custom Initials Setting */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Initials
                    </label>
                    <input
                      type="text"
                      value={formData.customInitials}
                      onChange={(e) => setFormData({...formData, customInitials: e.target.value})}
                      placeholder="e.g., JR"
                      maxLength={3}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Set custom initials to display instead of your name initials (max 3 characters)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First name
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                      placeholder="Enter first name"
                    />
                    <button className="ml-2 p-2 text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="flex">
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <button className="ml-2 p-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Email is used for account notifications.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                    placeholder="Enter username"
                  />
                  <button className="ml-2 p-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Username appears as a display name throughout this app.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Account Security</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Login Method Display */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getProviderIcon()}
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Login Method</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-blue-700">
                          You're signed in with {getProviderLabel()}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-blue-700 border border-blue-200">
                          Last used
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Your account is secured through {getProviderLabel()} authentication
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Add an extra layer of security</p>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-200 text-gray-500 font-medium rounded-md cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-red-200">
              <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                <h2 className="text-lg font-semibold text-red-900">DANGER ZONE</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">Request for account deletion</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Deleting your account is permanent and cannot be undone. Your data will be deleted within 30 days, 
                      except we may retain some metadata and logs for longer where required or permitted by law.
                    </p>
                    {deleteRequest?.status === 'pending' && (
                      <div className="mt-3 rounded-md border border-red-200 bg-white/70 p-3 text-sm text-red-700">
                        <p className="font-semibold">Pending review</p>
                        <p className="text-red-600">
                          Requested {new Date(deleteRequest.requested_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <label className="block mt-4 text-sm font-medium text-red-900">
                      Reason (optional)
                    </label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Tell us why you're leaving..."
                      maxLength={2000}
                      className="mt-2 w-full border border-red-200 rounded-md p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-transparent bg-white"
                      rows={3}
                    />
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading || deleteRequest?.status === 'pending'}
                      className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteRequest?.status === 'pending' ? 'Request Pending' : 'Request to delete account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">App Preferences</h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
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

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive updates about new features</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.email_notifications}
                      onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#88D18A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Dark Mode</h4>
                    <p className="text-sm text-gray-600">Switch to dark theme <span className="text-[#88D18A] font-medium">(Coming Soon)</span></p>
                  </div>
                  <label className="relative inline-flex items-center cursor-not-allowed">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      disabled 
                      checked={formData.dark_mode}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full cursor-not-allowed"></div>
                  </label>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
