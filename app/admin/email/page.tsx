'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-[300px] border border-gray-300 rounded-lg flex items-center justify-center text-gray-500">Loading editor...</div>
});
import 'react-quill/dist/quill.snow.css';

type RecipientType = 'waitlist' | 'all_users' | 'subscribers' | 'adhoc';
type TabType = 'compose' | 'campaigns' | 'templates' | 'analytics';

interface Campaign {
  id: string;
  subject: string;
  status: string;
  sent_at?: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: string;
    clickRate: string;
  };
}

interface Template {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('compose');
  
  // Form state
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('waitlist');
  const [adhocEmails, setAdhocEmails] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('info@appideasfinder.com');
  const [recipientCount, setRecipientCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [defaultReplyTo, setDefaultReplyTo] = useState('info@appideasfinder.com');

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    // Set mounted to true after component mounts (client-side only)
    // Add a small delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
        
        // Load templates
        loadTemplates();
        
        // Load campaigns
        loadCampaigns();
        
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

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await fetch('/api/admin/email/campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

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

  const handleLoadTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
      setMessage({ type: 'success', text: 'Template loaded successfully' });
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !subject.trim() || !htmlContent.trim()) {
      setMessage({ type: 'error', text: 'Template name, subject, and content are required' });
      return;
    }

    setSavingTemplate(true);
    try {
      const response = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          subject,
          htmlContent,
          textContent: htmlContent.replace(/<[^>]*>/g, ''),
        }),
      });

      const data = await response.json();
      if (data.template) {
        setMessage({ type: 'success', text: 'Template saved successfully' });
        setTemplateName('');
        loadTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save template' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save template' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!htmlContent.trim()) {
      setMessage({ type: 'error', text: 'Please add content to preview' });
      return;
    }

    try {
      const response = await fetch('/api/admin/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent }),
      });

      const data = await response.json();
      if (data.previewHTML) {
        setPreviewHTML(data.previewHTML);
        setShowPreview(true);
      } else {
        setMessage({ type: 'error', text: 'Failed to generate preview' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate preview' });
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

    const recipientCountText = recipientType === 'adhoc' 
      ? adhocEmails.split(',').filter(e => e.trim()).length 
      : recipientCount;
    
    if (!confirm(`Send email to ${recipientCountText} recipient(s)?`)) {
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
            textContent: htmlContent.replace(/<[^>]*>/g, ''),
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
        loadCampaigns();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const handleViewCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/email/campaigns?id=${campaignId}`);
      const data = await response.json();
      if (data.campaign) {
        setSelectedCampaign({ ...data.campaign, stats: data.stats });
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'compose'
                  ? 'text-[#88D18A] border-b-2 border-[#88D18A]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Compose
            </button>
            <button
              onClick={() => {
                setActiveTab('campaigns');
                loadCampaigns();
              }}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'text-[#88D18A] border-b-2 border-[#88D18A]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => {
                setActiveTab('templates');
                loadTemplates();
              }}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'text-[#88D18A] border-b-2 border-[#88D18A]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => {
                setActiveTab('analytics');
                loadCampaigns();
              }}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-[#88D18A] border-b-2 border-[#88D18A]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

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

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Compose Email</h2>

            {/* Template Loader */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Load Template
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLoadTemplate}
                  disabled={!selectedTemplate}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Load
                </button>
              </div>
            </div>

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
                {mounted && typeof window !== 'undefined' ? (
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
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 border border-gray-200 rounded-lg">
                    <div>Loading editor...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={handlePreview}
                  disabled={!htmlContent.trim()}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Preview
                </button>
                <button
                  onClick={() => {
                    setSubject('');
                    setHtmlContent('');
                    setAdhocEmails('');
                    setMessage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !htmlContent.trim()}
                  className="px-8 py-2 bg-[#88D18A] text-white rounded-lg font-semibold hover:bg-[#6bc070] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : `Send Email${recipientType !== 'adhoc' ? ` (${recipientCount})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Campaigns</h2>
            
            {loadingCampaigns ? (
              <div className="text-center py-8 text-gray-600">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No campaigns yet</div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewCampaign(campaign.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{campaign.subject}</h3>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Status: <span className={`font-semibold ${
                            campaign.status === 'sent' ? 'text-green-600' :
                            campaign.status === 'scheduled' ? 'text-blue-600' :
                            campaign.status === 'sending' ? 'text-yellow-600' :
                            campaign.status === 'failed' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>{campaign.status}</span></span>
                          {campaign.sent_at && (
                            <span>Sent: {new Date(campaign.sent_at).toLocaleString()}</span>
                          )}
                        </div>
                        {campaign.stats && (
                          <div className="mt-2 flex gap-4 text-sm">
                            <span>Sent: {campaign.stats.sent}</span>
                            <span>Opened: {campaign.stats.opened} ({campaign.stats.openRate}%)</span>
                            <span>Clicked: {campaign.stats.clicked} ({campaign.stats.clickRate}%)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Templates</h2>
            
            {/* Save Template Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Save Current Email as Template</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !templateName.trim() || !subject.trim() || !htmlContent.trim()}
                  className="px-6 py-2 bg-[#88D18A] text-white rounded-lg font-semibold hover:bg-[#6bc070] transition-colors disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Make sure you have subject and content in the Compose tab before saving.
              </p>
            </div>

            {/* Templates List */}
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No templates yet</div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">Subject: {template.subject}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(template.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            setSubject(template.subject);
                            setHtmlContent(template.html_content);
                            setActiveTab('compose');
                            setMessage({ type: 'success', text: 'Template loaded' });
                          }}
                          className="px-4 py-2 bg-[#88D18A] text-white rounded-lg font-semibold hover:bg-[#6bc070] transition-colors text-sm"
                        >
                          Use
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this template?')) {
                              try {
                                const response = await fetch(`/api/admin/email/templates?id=${template.id}`, {
                                  method: 'DELETE',
                                });
                                if (response.ok) {
                                  loadTemplates();
                                  setMessage({ type: 'success', text: 'Template deleted' });
                                }
                              } catch (error) {
                                setMessage({ type: 'error', text: 'Failed to delete template' });
                              }
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Campaign Analytics</h2>
            
            {loadingCampaigns ? (
              <div className="text-center py-8 text-gray-600">Loading analytics...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No campaigns to analyze</div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-900">{campaigns.length}</div>
                    <div className="text-sm text-blue-700">Total Campaigns</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-900">
                      {campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0)}
                    </div>
                    <div className="text-sm text-green-700">Total Sent</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-900">
                      {campaigns.reduce((sum, c) => sum + (c.stats?.opened || 0), 0)}
                    </div>
                    <div className="text-sm text-purple-700">Total Opens</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-900">
                      {campaigns.reduce((sum, c) => sum + (c.stats?.clicked || 0), 0)}
                    </div>
                    <div className="text-sm text-orange-700">Total Clicks</div>
                  </div>
                </div>

                {/* Campaign Details */}
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <h3 className="font-semibold text-gray-900 mb-3">{campaign.subject}</h3>
                      {campaign.stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="font-semibold text-gray-700">Sent</div>
                            <div className="text-gray-600">{campaign.stats.sent}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-700">Opened</div>
                            <div className="text-gray-600">{campaign.stats.opened} ({campaign.stats.openRate}%)</div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-700">Clicked</div>
                            <div className="text-gray-600">{campaign.stats.clicked} ({campaign.stats.clickRate}%)</div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-700">Status</div>
                            <div className={`font-semibold ${
                              campaign.status === 'sent' ? 'text-green-600' :
                              campaign.status === 'scheduled' ? 'text-blue-600' :
                              campaign.status === 'sending' ? 'text-yellow-600' :
                              campaign.status === 'failed' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>{campaign.status}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-700">Date</div>
                            <div className="text-gray-600">
                              {campaign.sent_at 
                                ? new Date(campaign.sent_at).toLocaleDateString()
                                : 'N/A'
                              }
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setShowPreview(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div 
                className="p-6"
                dangerouslySetInnerHTML={{ __html: previewHTML }}
              />
            </div>
          </div>
        )}

        {/* Info Box */}
        {activeTab === 'compose' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📧 Email Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Emails include header with logo (used for open tracking) and footer</li>
              <li>• Open tracking: Logo pixel tracks when emails are opened</li>
              <li>• Save and reuse email templates</li>
              <li>• Preview emails before sending</li>
              <li>• Unsubscribed emails are automatically excluded</li>
              <li>• Emails are sent in batches to avoid rate limiting</li>
              <li>• All sent emails are tracked in the database</li>
            </ul>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
