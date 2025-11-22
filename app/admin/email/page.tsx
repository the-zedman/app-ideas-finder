'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

type RecipientType = 'waitlist' | 'all_users' | 'subscribers' | 'adhoc';

export default function AdminEmailPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('waitlist');
  const [adhocEmails, setAdhocEmails] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('info@appideasfinder.com');
  const [recipientCount, setRecipientCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [defaultReplyTo, setDefaultReplyTo] = useState('info@appideasfinder.com');

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/check-admin');
        const data = await response.json();
        
        if (!data.isAdmin) {
          router.push('/admin');
          return;
        }
        
        setIsAdmin(true);
        
        // Load email settings
        const settingsResponse = await fetch('/api/admin/email/settings');
        const settingsData = await settingsResponse.json();
        if (settingsData.settings?.reply_to_email) {
          setDefaultReplyTo(settingsData.settings.reply_to_email);
          setReplyToEmail(settingsData.settings.reply_to_email);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin:', error);
        router.push('/admin');
      }
    };

    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (recipientType !== 'adhoc') {
      fetchRecipientCount();
    }
  }, [recipientType]);

  const fetchRecipientCount = async () => {
    try {
      const response = await fetch(`/api/admin/email/recipients?type=${recipientType}`);
      const data = await response.json();
      setRecipientCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
    }
  };

  const handleSaveReplyTo = async () => {
    try {
      const response = await fetch('/api/admin/email/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyToEmail: defaultReplyTo }),
      });

      const data = await response.json();
      if (data.success) {
        setReplyToEmail(defaultReplyTo);
        setShowSettings(false);
        setMessage({ type: 'success', text: 'Reply-to email updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update reply-to email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update reply-to email' });
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setMessage({ type: 'error', text: 'Subject is required' });
      return;
    }

    if (!htmlContent.trim()) {
      setMessage({ type: 'error', text: 'Email content is required' });
      return;
    }

    if (recipientType === 'adhoc' && !adhocEmails.trim()) {
      setMessage({ type: 'error', text: 'Please enter at least one email address' });
      return;
    }

    if (!confirm(`Send email to ${recipientType === 'adhoc' ? adhocEmails.split(',').length : recipientCount} recipient(s)?`)) {
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const adhocEmailsArray = recipientType === 'adhoc' 
        ? adhocEmails.split(',').map(e => e.trim()).filter(Boolean)
        : undefined;

      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          htmlContent,
          textContent: htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          recipientType,
          adhocEmails: adhocEmailsArray,
          replyTo: replyToEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Email sent successfully! Sent: ${data.sent}, Failed: ${data.failed}` 
        });
        // Reset form
        setSubject('');
        setHtmlContent('');
        setAdhocEmails('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin" className="flex items-center gap-2">
                <img 
                  src="/App Ideas Finder - logo - 200x200.png" 
                  alt="App Ideas Finder" 
                  className="h-8 w-8 rounded-lg"
                />
                <span className="text-xl font-bold text-gray-900">Admin Dashboard</span>
              </a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600 font-medium">Email Tool</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                ⚙️ Settings
              </button>
              <a
                href="/homezone"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Back to HomeZone
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Reply-To Email
                </label>
                <input
                  type="email"
                  value={defaultReplyTo}
                  onChange={(e) => setDefaultReplyTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                  placeholder="info@appideasfinder.com"
                />
              </div>
              <button
                onClick={handleSaveReplyTo}
                className="px-6 py-2 bg-[#88D18A] text-white rounded-lg font-semibold hover:bg-[#6bc070] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Compose Email</h2>

          {/* Subject */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
              placeholder="Email subject line"
            />
          </div>

          {/* Recipient Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To *
            </label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as RecipientType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
            >
              <option value="waitlist">Waitlist (All waitlist members)</option>
              <option value="all_users">All Users</option>
              <option value="subscribers">Subscribers (Active subscriptions only)</option>
              <option value="adhoc">Adhoc (Custom email addresses)</option>
            </select>
            {recipientType !== 'adhoc' && (
              <p className="mt-2 text-sm text-gray-500">
                {recipientCount} recipient(s) will receive this email
              </p>
            )}
          </div>

          {/* Adhoc Emails */}
          {recipientType === 'adhoc' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Addresses (comma-separated) *
              </label>
              <textarea
                value={adhocEmails}
                onChange={(e) => setAdhocEmails(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                rows={4}
                placeholder="email1@example.com, email2@example.com, email3@example.com"
              />
              <p className="mt-2 text-sm text-gray-500">
                {adhocEmails.split(',').filter(e => e.trim()).length} email(s) entered
              </p>
            </div>
          )}

          {/* Reply-To */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reply-To Email
            </label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
              placeholder="info@appideasfinder.com"
            />
            <p className="mt-2 text-sm text-gray-500">
              Default: {defaultReplyTo} (change in settings)
            </p>
          </div>

          {/* Email Content Editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content *
            </label>
            <div className="border border-gray-300 rounded-lg">
              {typeof window !== 'undefined' && (
                <ReactQuill
                  theme="snow"
                  value={htmlContent}
                  onChange={setHtmlContent}
                  placeholder="Write your email content here..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                  style={{ minHeight: '300px' }}
                />
              )}
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setSubject('');
                setHtmlContent('');
                setAdhocEmails('');
                setMessage(null);
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={sending}
            >
              Clear
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !htmlContent.trim()}
              className="px-8 py-2 bg-[#88D18A] text-white rounded-lg font-semibold hover:bg-[#6bc070] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : `Send Email${recipientType !== 'adhoc' ? ` (${recipientCount})` : ''}`}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📧 Email Features</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Emails include header with logo (used for open tracking) and footer</li>
            <li>• Open tracking: Logo pixel tracks when emails are opened</li>
            <li>• Unsubscribed emails are automatically excluded</li>
            <li>• Emails are sent in batches to avoid rate limiting</li>
            <li>• All sent emails are tracked in the database</li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}

