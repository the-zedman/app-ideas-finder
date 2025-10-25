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
    avatar_url: '',
    email_notifications: true,
    dark_mode: false,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  const supabase = createClient();

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'security', name: 'Security' },
    { id: 'preferences', name: 'Preferences' }
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
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
        console.log('Avatar URL from database:', profile?.avatar_url);

        setFormData({
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          email: user.email || '',
          username: profile?.username || user.email?.split('@')[0] || '',
          bio: profile?.bio || '',
          website: profile?.website || '',
          location: profile?.location || '',
          timezone: profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          avatar_url: profile?.avatar_url || '',
          email_notifications: profile?.email_notifications ?? true,
          dark_mode: profile?.dark_mode ?? false,
        });
        setAvatarPreview(profile?.avatar_url || '');
      }
      setLoading(false);
    };

    getUser();
  }, [supabase.auth]);

  const handleAvatarUpload = async (file: File) => {
    // In development bypass mode, just show preview without uploading
    const isDevelopmentBypass = process.env.NODE_ENV === 'development' && 
                                process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    if (!user && isDevelopmentBypass) {
      setMessage('Avatar updated successfully! (Development mode - not saved)');
      setMessageType('success');
      return;
    }

    if (!user) return;

    try {
      // Delete old avatar if it exists
      if (formData.avatar_url) {
        try {
          const oldFileName = formData.avatar_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('avatars')
              .remove([`avatars/${oldFileName}`]);
            console.log('Deleted old avatar:', oldFileName);
          }
        } catch (deleteError) {
          console.log('No old avatar to delete or delete failed:', deleteError);
        }
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        setMessage(`Failed to upload avatar: ${uploadError.message}`);
        setMessageType('error');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profiles table - try update first, then insert if needed
      console.log('Updating profile with avatar_url:', publicUrl);
      let { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select();

      console.log('Update result:', { updateData, updateError });
      console.log('Updated data:', updateData);
      
      // Check if the update actually worked by fetching the profile again
      const { data: checkProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      console.log('Avatar URL after update:', checkProfile?.avatar_url);

      // If update failed (no existing profile), create one
      if (updateError && updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            avatar_url: publicUrl,
            email_notifications: true,
            dark_mode: false
          });

        if (insertError) {
          console.error('Profile insert error:', insertError);
          setMessage(`Failed to create profile with avatar: ${insertError.message}`);
          setMessageType('error');
          return;
        }
      } else if (updateError) {
        console.error('Profile update error:', updateError);
        setMessage(`Failed to update avatar: ${updateError.message}`);
        setMessageType('error');
        return;
      }

      setFormData({...formData, avatar_url: publicUrl});
      setAvatarPreview(publicUrl);
      setMessage('Avatar updated successfully!');
      setMessageType('success');
      
      // Force refresh the profile data from database
      const { data: refreshedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (refreshedProfile) {
        setFormData({
          ...formData,
          avatar_url: refreshedProfile.avatar_url || publicUrl
        });
        setAvatarPreview(refreshedProfile.avatar_url || publicUrl);
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please select an image file');
        setMessageType('error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB');
        setMessageType('error');
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // In development bypass mode, show success message without database operations
    const isDevelopmentBypass = process.env.NODE_ENV === 'development' && 
                                process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    if (!user && isDevelopmentBypass) {
      setMessage('Profile updated successfully! (Development mode - changes not saved)');
      setMessageType('success');
      setIsEditing(false);
      setAvatarFile(null);
      return;
    }

    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // Upload avatar if new file selected
      if (avatarFile) {
        await handleAvatarUpload(avatarFile);
        if (messageType === 'error') return;
      }

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
          avatar_url: formData.avatar_url,
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
            avatar_url: formData.avatar_url,
            email_notifications: formData.email_notifications,
            dark_mode: formData.dark_mode,
          })
          .select();

        if (insertError) {
          error = insertError;
        } else {
          data = insertData;
        }
      }

      if (error) {
        console.error('Profile update error:', error);
        setMessage(`Error: ${error.message} (Code: ${error.code})`);
        setMessageType('error');
      } else {
        console.log('Profile updated successfully:', data);
        setMessage('Profile updated successfully!');
        setMessageType('success');
        setIsEditing(false);
        setAvatarFile(null);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <Image
                src="/App Ideas Finder - logo - 200x200.png"
                alt="App Ideas Finder Logo"
                width={32}
                height={32}
                className="rounded-md"
              />
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>
          <button
            onClick={() => router.push('/homezone')}
            className="px-4 py-2 bg-[#E07A5F] text-white rounded-lg font-medium hover:bg-[#E07A5F]/90 transition-colors"
          >
            Back to HomeZone
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
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
              {/* Avatar Upload Section */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                      {getInitials()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#E07A5F] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#E07A5F]/90 transition-colors">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
                  <p className="text-sm text-gray-600">Click the + button to upload a new photo</p>
                  <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 5MB.</p>
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
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
                <h2 className="text-lg font-semibold text-gray-900">Password & Security</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Change Password</h4>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="px-4 py-2 bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    Change
                  </button>
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
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      Request to delete account
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E07A5F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Dark Mode</h4>
                    <p className="text-sm text-gray-600">Switch to dark theme <span className="text-[#E07A5F] font-medium">(Coming Soon)</span></p>
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
    </div>
  );
}