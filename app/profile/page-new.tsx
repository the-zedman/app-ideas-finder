'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';
import Footer from '@/components/Footer';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
  
  const supabase = createClient();

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'security', name: 'Security' },
    { id: 'preferences', name: 'Preferences' }
  ];

  // Get Gravatar URL from email
  const getGravatarUrl = (email: string, size: number = 200) => {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  };

  // Get user initials
  const getUserInitials = () => {
    if (formData.customInitials) return formData.customInitials.toUpperCase();
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get user display name
  const getDisplayName = () => {
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName} ${formData.lastName}`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // Get user email
  const getEmail = () => {
    return user?.email || '';
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch profile data
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setFormData({
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            username: profileData.username || '',
            bio: profileData.bio || '',
            website: profileData.website || '',
            location: profileData.location || '',
            timezone: profileData.timezone || '',
            customInitials: profileData.custom_initials || '',
            email_notifications: profileData.email_notifications ?? true,
            dark_mode: profileData.dark_mode ?? false,
          });
        }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E07A5F] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Profile Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-8">
            <div className="flex items-center space-x-6">
              {/* Avatar/Initials */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-[#E07A5F] flex items-center justify-center text-white text-2xl font-semibold">
                  {getUserInitials()}
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h2>
                <p className="text-gray-600">{getEmail()}</p>
                <p className="text-sm text-gray-500 mt-1">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#E07A5F] text-[#E07A5F]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-[#E07A5F] text-white rounded-md hover:bg-[#D06A4F] transition-colors"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-6">
                    {/* Custom Initials */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Initials
                      </label>
                      <input
                        type="text"
                        value={formData.customInitials}
                        onChange={(e) => setFormData({...formData, customInitials: e.target.value})}
                        placeholder="e.g., JR"
                        maxLength={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Set custom initials to display instead of your name initials (max 3 characters)
                      </p>
                    </div>

                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Username appears as a display name throughout this app
                      </p>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">First Name</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.firstName || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Last Name</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.lastName || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Username</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.username || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Custom Initials</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.customInitials || 'Not set'}</p>
                      </div>
                    </div>
                    {formData.bio && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Bio</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.bio}</p>
                      </div>
                    )}
                    {formData.website && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Website</label>
                        <a href={formData.website} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-[#E07A5F] hover:underline">
                          {formData.website}
                        </a>
                      </div>
                    )}
                    {formData.location && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Location</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.location}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Security features coming soon</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>Password changes, two-factor authentication, and account deletion will be available in a future update.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-500">Receive updates about your account and new features</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.email_notifications}
                        onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E07A5F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E07A5F]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Dark Mode</h4>
                      <p className="text-sm text-gray-500">Coming soon - Dark theme for the app</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
                      <input
                        type="checkbox"
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E07A5F]"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-[#E07A5F] text-white rounded-md hover:bg-[#D06A4F] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Logout Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="px-6 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
