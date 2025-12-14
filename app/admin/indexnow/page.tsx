'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { checkAdminStatus, type AdminCheck } from '@/lib/is-admin';

export default function IndexNowPage() {
  const [user, setUser] = useState<any>(null);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
      
      try {
        const response = await fetch('/api/check-admin');
        const data = await response.json();
        
        if (!data.isAdmin) {
          router.push('/homezone');
          return;
        }
        
        const role = data.role || 'admin';
        const adminStatus = {
          isAdmin: data.isAdmin,
          role: role as 'super_admin' | 'admin' | 'support',
          isSuperAdmin: role === 'super_admin',
          isSupport: role === 'support',
        };
        
        setAdminCheck(adminStatus);
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/homezone');
      } finally {
        setLoading(false);
      }
    };

    init();
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/indexnow', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.message || data.error || 'Failed to submit to IndexNow');
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return null;
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode === 200 || statusCode === 202) return 'text-green-600 bg-green-50 border-green-200';
    if (statusCode >= 400 && statusCode < 500) return 'text-red-600 bg-red-50 border-red-200';
    if (statusCode === 429) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">
                ← Back to Admin
              </a>
              <h1 className="text-xl font-bold text-gray-900">🔍 IndexNow Tool</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">
                Back to App
              </a>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Submit URLs to IndexNow</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This tool submits all URLs from your sitemap to IndexNow for faster search engine indexing.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Configuration:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Host:</strong> www.appideasfinder.com</li>
                <li><strong>Key:</strong> b91d671dd6fd44a58894892453c33cd9</li>
                <li><strong>Key Location:</strong> https://www.appideasfinder.com/b91d671dd6fd44a58894892453c33cd9.txt</li>
                <li><strong>URLs:</strong> All URLs from sitemap.xml</li>
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit to IndexNow'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className={`mt-6 rounded-lg border p-6 ${getStatusColor(result.statusCode)}`}>
              <h3 className="font-bold text-lg mb-3">Response:</h3>
              
              <div className="space-y-2 mb-4">
                <div>
                  <strong>Status Code:</strong> {result.statusCode} {result.statusText}
                </div>
                <div>
                  <strong>Message:</strong> {result.message}
                </div>
                {result.urlsSubmitted && (
                  <div>
                    <strong>URLs Submitted:</strong> {result.urlsSubmitted}
                  </div>
                )}
              </div>

              {result.urlList && result.urlList.length > 0 && (
                <div className="mt-4">
                  <strong className="block mb-2">Submitted URLs:</strong>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.urlList.map((url: string, idx: number) => (
                      <li key={idx} className="break-all">{url}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.responseBody && (
                <div className="mt-4">
                  <strong className="block mb-2">Response Body:</strong>
                  <pre className="bg-white/50 rounded p-2 text-xs overflow-auto">
                    {JSON.stringify(result.responseBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-red-600">
              <h3 className="font-bold text-lg mb-2">Error:</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Status Code Reference */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Status Code Reference:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-mono font-semibold text-green-600">200</span>
                <span className="text-gray-600">OK - URLs submitted successfully</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-semibold text-green-600">202</span>
                <span className="text-gray-600">Accepted - URLs accepted for processing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-semibold text-red-600">400</span>
                <span className="text-gray-600">Bad Request - Invalid format</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-semibold text-red-600">403</span>
                <span className="text-gray-600">Forbidden - Key not valid (e.g. key not found, file found but key not in the file)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-semibold text-red-600">422</span>
                <span className="text-gray-600">Unprocessable Entity - URLs don't belong to the host or the key is not matching the schema</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-semibold text-yellow-600">429</span>
                <span className="text-gray-600">Too Many Requests - Too Many Requests (potential Spam)</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

