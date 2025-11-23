'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function AdminAffiliatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'signups' | 'commissions' | 'payouts'>('overview');
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
        .select('*')
        .order('total_commission_earned', { ascending: false });

      if (!affiliatesError && affiliatesData) {
        // Fetch user emails via API for each affiliate
        const enrichedAffiliates = await Promise.all(affiliatesData.map(async (affiliate: any) => {
          try {
            const userRes = await fetch(`/api/admin/user/${affiliate.user_id}`);
            const userData = userRes.ok ? await userRes.json() : null;
            return {
              ...affiliate,
              owner: {
                id: affiliate.user_id,
                email: userData?.email || 'N/A'
              }
            };
          } catch (err) {
            console.error(`Error fetching user ${affiliate.user_id}:`, err);
            return {
              ...affiliate,
              owner: {
                id: affiliate.user_id,
                email: 'N/A'
              }
            };
          }
        }));
        setAffiliates(enrichedAffiliates);
      } else if (affiliatesError) {
        console.error('Error fetching affiliates:', affiliatesError);
      }

      // Fetch all conversions with full details
      const { data: conversionsData, error: conversionsError } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!conversionsError && conversionsData) {
        // Fetch user details and affiliate owner details via API
        const enriched = await Promise.all(conversionsData.map(async (conv: any) => {
          // Get referred user details via API
          const referredRes = await fetch(`/api/admin/user/${conv.referred_user_id}`);
          const referredData = referredRes.ok ? await referredRes.json() : null;
          
          // Get affiliate owner
          const { data: affiliateData } = await supabase
            .from('user_affiliates')
            .select('user_id')
            .eq('affiliate_code', conv.affiliate_code)
            .single();
          
          let ownerEmail = 'N/A';
          if (affiliateData) {
            const ownerRes = await fetch(`/api/admin/user/${affiliateData.user_id}`);
            const ownerData = ownerRes.ok ? await ownerRes.json() : null;
            ownerEmail = ownerData?.email || 'N/A';
          }

          return {
            ...conv,
            referred_user_email: referredData?.email || 'N/A',
            referred_user_id: conv.referred_user_id,
            signup_date: referredData?.created_at || conv.created_at,
            owner_email: ownerEmail,
            owner_id: affiliateData?.user_id
          };
        }));
        setConversions(enriched);
      }

      // Fetch all commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!commissionsError && commissionsData) {
        // Fetch user emails and subscription details via API
        const enrichedCommissions = await Promise.all(commissionsData.map(async (commission: any) => {
          try {
            // Fetch affiliate user email
            const affiliateRes = await fetch(`/api/admin/user/${commission.affiliate_user_id}`);
            const affiliateData = affiliateRes.ok ? await affiliateRes.json() : null;
            
            // Fetch referred user email
            const referredRes = commission.referred_user_id 
              ? await fetch(`/api/admin/user/${commission.referred_user_id}`)
              : null;
            const referredData = referredRes?.ok ? await referredRes.json() : null;
            
            // Fetch subscription details
            const { data: subscriptionData } = await supabase
              .from('user_subscriptions')
              .select('plan_id, status, current_period_start, current_period_end')
              .eq('user_id', commission.referred_user_id)
              .maybeSingle();
            
            return {
              ...commission,
              affiliate: {
                id: commission.affiliate_user_id,
                email: affiliateData?.email || 'N/A'
              },
              referred: {
                id: commission.referred_user_id,
                email: referredData?.email || 'N/A'
              },
              subscription: subscriptionData ? [subscriptionData] : []
            };
          } catch (err) {
            console.error(`Error enriching commission ${commission.id}:`, err);
            return {
              ...commission,
              affiliate: { id: commission.affiliate_user_id, email: 'N/A' },
              referred: { id: commission.referred_user_id, email: 'N/A' },
              subscription: []
            };
          }
        }));
        setCommissions(enrichedCommissions);
      } else if (commissionsError) {
        console.error('Error fetching commissions:', commissionsError);
      }

      // Calculate overall stats
      const totalPending = commissionsData?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount || 0), 0) || 0;
      const totalApproved = commissionsData?.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount || 0), 0) || 0;
      const totalPaid = commissionsData?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount || 0), 0) || 0;

      setStats({
        totalAffiliates: affiliatesData?.length || 0,
        totalConversions: conversionsData?.length || 0,
        totalPending,
        totalApproved,
        totalPaid,
        totalCommissions: totalPending + totalApproved + totalPaid
      });

    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    }
  };

  const getPlanName = (planId: string) => {
    const planMap: { [key: string]: string } = {
      'trial': 'Trial ($1)',
      'core_monthly': 'Core Monthly ($37)',
      'core_annual': 'Core Annual ($399)',
      'prime_monthly': 'Prime Monthly ($79)',
      'prime_annual': 'Prime Annual ($799)',
      'search_pack': 'Search Pack ($29)'
    };
    return planMap[planId] || planId;
  };

  const calculateCommission = (planId: string, amountPaid: number) => {
    const commissionRate = 0.25; // 25%
    return (amountPaid * commissionRate).toFixed(2);
  };

  const getPaymentDueDate = (subscriptionStart: string) => {
    if (!subscriptionStart) return 'N/A';
    const start = new Date(subscriptionStart);
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days after subscription starts
    return dueDate.toLocaleDateString();
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
          <p className="text-gray-600">Track signups, commissions, and manage payouts</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Affiliates</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAffiliates}</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Signups</div>
              <div className="text-3xl font-bold text-blue-600">{stats.totalConversions}</div>
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
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-[#88D18A] text-[#88D18A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('signups')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 ${
                  activeTab === 'signups'
                    ? 'border-[#88D18A] text-[#88D18A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Signups ({conversions.length})
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 ${
                  activeTab === 'commissions'
                    ? 'border-[#88D18A] text-[#88D18A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Commissions ({commissions.length})
              </button>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 ${
                  activeTab === 'payouts'
                    ? 'border-[#88D18A] text-[#88D18A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Payouts
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Top Affiliates</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referrals</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Earned</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pending</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {affiliates.slice(0, 20).map((affiliate: any) => (
                        <tr key={affiliate.user_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{affiliate.owner?.email || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-700">{affiliate.affiliate_code}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{affiliate.total_referrals}</td>
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
            )}

            {activeTab === 'signups' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">All Affiliate Signups</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Signup Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Affiliate Code</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Signed Up User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan Purchased</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment Due</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {conversions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            No signups found
                          </td>
                        </tr>
                      ) : (
                        conversions.map((conv: any) => {
                          // Find corresponding commission if exists
                          const commission = commissions.find((c: any) => c.referred_user_id === conv.referred_user_id);
                          const subscription = commission?.subscription?.[0];
                          const planId = subscription?.plan_id || 'N/A';
                          const amountPaid = commission?.amount_paid || 0;
                          const commissionAmount = commission ? parseFloat(commission.commission_amount) : 0;
                          const paymentDue = commission?.pending_until 
                            ? new Date(commission.pending_until).toLocaleDateString()
                            : subscription?.current_period_start 
                              ? getPaymentDueDate(subscription.current_period_start)
                              : 'N/A';

                          return (
                            <tr key={conv.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(conv.signup_date || conv.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-mono text-gray-700">{conv.affiliate_code}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{conv.owner_email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{conv.referred_user_email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm">
                                {planId !== 'N/A' ? getPlanName(planId) : 'Not purchased yet'}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-[#88D18A]">
                                {commissionAmount > 0 ? `$${commissionAmount.toFixed(2)}` : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{paymentDue}</td>
                              <td className="px-6 py-4 text-sm">
                                {commission ? (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                    commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {commission.status.toUpperCase()}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                                    NO PURCHASE
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'commissions' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Commission Transactions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Affiliate</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referred User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment Due</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {commissions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                            No commissions found
                          </td>
                        </tr>
                      ) : (
                        commissions.map((commission: any) => {
                          const subscription = commission.subscription?.[0];
                          const paymentDue = commission.pending_until 
                            ? new Date(commission.pending_until).toLocaleDateString()
                            : subscription?.current_period_start 
                              ? getPaymentDueDate(subscription.current_period_start)
                              : 'N/A';

                          return (
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
                                {getPlanName(commission.plan_id || 'N/A')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                                ${parseFloat(commission.amount_paid || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-[#88D18A]">
                                ${parseFloat(commission.commission_amount || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{paymentDue}</td>
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
                                {commission.status === 'pending' && new Date(commission.pending_until || 0) <= new Date() && (
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
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'payouts' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payout Management</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">How to Pay Affiliates</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-4">
                    <li>Review approved commissions in the Commissions tab</li>
                    <li>Process payment via Stripe Connect or PayPal (manual process)</li>
                    <li>Mark commissions as "Paid" and enter the payment reference ID</li>
                    <li>The system will automatically update affiliate totals</li>
                  </ol>
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> Commissions become payable 30 days after the referred customer's subscription starts, 
                    assuming they remain active. You can manually approve eligible commissions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
