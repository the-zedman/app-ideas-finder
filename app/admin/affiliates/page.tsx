'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';

export default function AdminAffiliatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const adminResponse = await fetch('/api/check-admin');
      const adminData = await adminResponse.json();
      
      if (!adminData.isAdmin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await fetchAffiliateData();
    } catch (error) {
      console.error('Error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliateData = async () => {
    try {
      // Fetch all affiliates with their stats
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('user_affiliates')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .order('total_commission_earned', { ascending: false });

      if (!affiliatesError && affiliatesData) {
        setAffiliates(affiliatesData);
      }

      // Fetch all commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          affiliate:affiliate_user_id (email),
          referred:referred_user_id (email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!commissionsError && commissionsData) {
        setCommissions(commissionsData);
      }

      // Calculate overall stats
      const totalPending = commissionsData?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount), 0) || 0;
      const totalApproved = commissionsData?.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount), 0) || 0;
      const totalPaid = commissionsData?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount), 0) || 0;

      setStats({
        totalAffiliates: affiliatesData?.length || 0,
        totalPending,
        totalApproved,
        totalPaid,
        totalCommissions: totalPending + totalApproved + totalPaid
      });

    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    }
  };

  const approveCommission = async (commissionId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_commissions')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (!error) {
        await fetchAffiliateData();
        alert('Commission approved!');
      }
    } catch (error) {
      console.error('Error approving commission:', error);
      alert('Failed to approve commission');
    }
  };

  const markAsPaid = async (commissionId: string, paymentRef: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_commissions')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
          payment_reference: paymentRef,
          updated_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (!error) {
        await fetchAffiliateData();
        alert('Commission marked as paid!');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Failed to mark as paid');
    }
  };

  const filteredCommissions = commissions.filter(c => 
    filter === 'all' || c.status === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2">
                <img 
                  src="/App Ideas Finder - logo - 200x200.png" 
                  alt="App Ideas Finder" 
                  className="h-8 w-8 rounded-lg"
                />
                <span className="text-xl font-bold text-gray-900">ADMIN</span>
              </Link>
              <nav className="hidden md:flex gap-4">
                <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">Users</Link>
                <Link href="/admin/subscriptions" className="text-gray-600 hover:text-gray-900">Subscriptions</Link>
                <Link href="/admin/affiliates" className="text-gray-900 font-semibold">Affiliates</Link>
                <Link href="/admin/analyses" className="text-gray-600 hover:text-gray-900">Analyses</Link>
                <Link href="/admin/waitlist" className="text-gray-600 hover:text-gray-900">Waitlist</Link>
              </nav>
            </div>
            <Link href="/homezone" className="text-gray-600 hover:text-gray-900">
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Management</h1>
          <p className="text-gray-600">Manage affiliates, commissions, and payouts</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Affiliates</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAffiliates}</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Pending</div>
              <div className="text-3xl font-bold text-yellow-600">${stats.totalPending.toFixed(2)}</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Approved</div>
              <div className="text-3xl font-bold text-blue-600">${stats.totalApproved.toFixed(2)}</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Paid</div>
              <div className="text-3xl font-bold text-green-600">${stats.totalPaid.toFixed(2)}</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total All Time</div>
              <div className="text-3xl font-bold text-[#88D18A]">${stats.totalCommissions.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Top Affiliates */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Top Affiliates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referrals</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paying</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Earned</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pending</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {affiliates.slice(0, 20).map((affiliate: any) => (
                  <tr key={affiliate.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{affiliate.profiles?.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">{affiliate.affiliate_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{affiliate.total_referrals}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{affiliate.paying_referrals}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#88D18A]">
                      ${(affiliate.total_commission_earned || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-yellow-600">
                      ${(affiliate.pending_commission || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      ${(affiliate.paid_commission || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commission Transactions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Recent Commissions</h2>
            
            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm font-semibold ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded text-sm font-semibold ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1 rounded text-sm font-semibold ${filter === 'approved' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('paid')}
                className={`px-3 py-1 rounded text-sm font-semibold ${filter === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Paid
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Affiliate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referred User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No commissions found
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((commission: any) => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {commission.affiliate?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {commission.referred?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          commission.transaction_type === 'subscription' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {commission.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        ${parseFloat(commission.amount_paid).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#88D18A]">
                        ${parseFloat(commission.commission_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {commission.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {commission.status === 'pending' && new Date(commission.pending_until) <= new Date() && (
                          <button
                            onClick={() => approveCommission(commission.id)}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                          >
                            Approve
                          </button>
                        )}
                        {commission.status === 'approved' && (
                          <button
                            onClick={() => {
                              const ref = prompt('Enter payment reference (Stripe/PayPal ID):');
                              if (ref) markAsPaid(commission.id, ref);
                            }}
                            className="text-green-600 hover:text-green-800 font-semibold text-xs"
                          >
                            Mark Paid
                          </button>
                        )}
                        {commission.status === 'paid' && commission.payment_reference && (
                          <span className="text-xs text-gray-500 font-mono">
                            {commission.payment_reference.substring(0, 12)}...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Actions Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Automated Commission Processing</h3>
          <p className="text-sm text-gray-700 mb-3">
            Commissions are automatically approved 30 days after the referred customer's subscription starts, 
            provided the customer remains active. You can manually approve eligible commissions above.
          </p>
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Run the auto-approval function via cron job: <code className="bg-gray-900 text-green-400 px-2 py-1 rounded text-xs">SELECT auto_approve_commissions();</code>
          </p>
        </div>
      </div>
    </div>
  );
}

