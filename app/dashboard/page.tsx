'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface WaitlistData {
  email: string;
  created_at: string;
  unsubscribe_token: string;
}

interface UnsubscribeData {
  email: string;
  created_at: string;
  unsubscribe_token: string;
  ip_address?: string;
  user_agent?: string;
}

interface DashboardStats {
  totalSignups: number;
  totalUnsubscribes: number;
  dailySignups: number;
  weeklySignups: number;
  monthlySignups: number;
  dailyUnsubscribes: number;
  weeklyUnsubscribes: number;
  monthlyUnsubscribes: number;
  unsubscribeRate: number;
  recentSignups: WaitlistData[];
  recentUnsubscribes: UnsubscribeData[];
  signupTrends: Array<{
    date: string;
    signups: number;
    unsubscribes: number;
  }>;
  domainBreakdown: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FF8000', '#800080', '#00FFFF', '#FF00FF', '#808000'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Simple password protection (in production, use proper auth)
  const handleLogin = () => {
    if (password === 'AppIdeas2024!') {
      setAuthenticated(true);
    } else {
      setError('Invalid password');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all waitlist data
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (waitlistError) throw waitlistError;

      // Fetch all unsubscribe data
      const { data: unsubscribeData, error: unsubscribeError } = await supabase
        .from('unsubscribes')
        .select('*')
        .order('created_at', { ascending: false });

      if (unsubscribeError) {
        console.warn('Could not fetch unsubscribe data:', unsubscribeError);
        // Continue without unsubscribe data if table doesn't exist yet
      }

      // Calculate stats
      const now = new Date();
      const today = startOfDay(now);
      const weekAgo = startOfDay(subDays(now, 7));
      const monthAgo = startOfDay(subDays(now, 30));

      const totalSignups = waitlistData?.length || 0;
      const totalUnsubscribes = unsubscribeData?.length || 0;
      
      const dailySignups = waitlistData?.filter(item => 
        new Date(item.created_at) >= today
      ).length || 0;
      
      const weeklySignups = waitlistData?.filter(item => 
        new Date(item.created_at) >= weekAgo
      ).length || 0;
      
      const monthlySignups = waitlistData?.filter(item => 
        new Date(item.created_at) >= monthAgo
      ).length || 0;

      const dailyUnsubscribes = unsubscribeData?.filter(item => 
        new Date(item.created_at) >= today
      ).length || 0;
      
      const weeklyUnsubscribes = unsubscribeData?.filter(item => 
        new Date(item.created_at) >= weekAgo
      ).length || 0;
      
      const monthlyUnsubscribes = unsubscribeData?.filter(item => 
        new Date(item.created_at) >= monthAgo
      ).length || 0;

      // Calculate unsubscribe rate
      const unsubscribeRate = totalSignups > 0 ? ((totalUnsubscribes / (totalSignups + totalUnsubscribes)) * 100) : 0;

      // Generate signup trends (last 30 days)
      const signupTrends = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const daySignups = waitlistData?.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= dayStart && itemDate <= dayEnd;
        }).length || 0;

        const dayUnsubscribes = unsubscribeData?.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= dayStart && itemDate <= dayEnd;
        }).length || 0;

        signupTrends.push({
          date: format(date, 'MMM dd'),
          signups: daySignups,
          unsubscribes: dayUnsubscribes
        });
      }

      // Email domain breakdown
      const domainCounts: { [key: string]: number } = {};
      waitlistData?.forEach(item => {
        const domain = item.email.split('@')[1]?.toLowerCase();
        if (domain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
      });

      const domainBreakdown = Object.entries(domainCounts)
        .map(([domain, count]) => ({
          domain,
          count,
          percentage: Number(((count / totalSignups) * 100).toFixed(1))
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalSignups,
        totalUnsubscribes,
        dailySignups,
        weeklySignups,
        monthlySignups,
        dailyUnsubscribes,
        weeklyUnsubscribes,
        monthlyUnsubscribes,
        unsubscribeRate,
        recentSignups: waitlistData?.slice(0, 10) || [],
        recentUnsubscribes: unsubscribeData?.slice(0, 10) || [],
        signupTrends,
        domainBreakdown
      });

    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchDashboardData();
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a3a5f] flex items-center justify-center">
        <div className="bg-cream p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Image
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-navy mb-2">Admin Dashboard</h1>
            <p className="text-navy/70">Enter password to access</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 rounded-lg border-2 border-navy/20 bg-cream text-navy placeholder-navy/60 focus:outline-none focus:border-orange"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-orange hover:bg-[#ff9f5e] text-cream font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              Access Dashboard
            </button>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a3a5f] flex items-center justify-center">
        <div className="text-cream text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a3a5f] flex items-center justify-center">
        <div className="text-cream text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0a3a5f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Image
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              width={60}
              height={60}
            />
            <div>
              <h1 className="text-3xl font-bold text-cream">Waitlist Dashboard</h1>
              <p className="text-cream">Real-time analytics and insights</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-navy hover:bg-[#2a4a6f] text-cream rounded-lg transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setAuthenticated(false)}
              className="px-4 py-2 bg-orange hover:bg-[#ff9f5e] text-cream rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-sm font-medium mb-2">Total Signups</h3>
            <p className="text-3xl font-bold text-cream">{stats.totalSignups.toLocaleString()}</p>
          </div>
          
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-sm font-medium mb-2">Daily Signups</h3>
            <p className="text-3xl font-bold text-cream">{stats.dailySignups}</p>
          </div>
          
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-sm font-medium mb-2">Weekly Signups</h3>
            <p className="text-3xl font-bold text-cream">{stats.weeklySignups}</p>
          </div>
          
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-sm font-medium mb-2">Monthly Signups</h3>
            <p className="text-3xl font-bold text-cream">{stats.monthlySignups}</p>
          </div>
        </div>

        {/* Unsubscribe Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/20">
            <h3 className="text-cream text-sm font-medium mb-2">Total Unsubscribes</h3>
            <p className="text-3xl font-bold text-cream">{stats.totalUnsubscribes.toLocaleString()}</p>
          </div>
          
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/20">
            <h3 className="text-cream text-sm font-medium mb-2">Daily Unsubscribes</h3>
            <p className="text-3xl font-bold text-cream">{stats.dailyUnsubscribes}</p>
          </div>
          
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/20">
            <h3 className="text-cream text-sm font-medium mb-2">Weekly Unsubscribes</h3>
            <p className="text-3xl font-bold text-cream">{stats.weeklyUnsubscribes}</p>
          </div>
          
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/20">
            <h3 className="text-cream text-sm font-medium mb-2">Unsubscribe Rate</h3>
            <p className="text-3xl font-bold text-cream">{stats.unsubscribeRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Signup Trends */}
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-lg font-semibold mb-4">Signup Trends (30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.signupTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffedd4" opacity={0.3} />
                <XAxis dataKey="date" stroke="#ffedd4" fontSize={12} tick={{ fill: '#ffedd4' }} />
                <YAxis stroke="#ffedd4" fontSize={12} tick={{ fill: '#ffedd4' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e3a5f', 
                    border: '1px solid #f78937',
                    borderRadius: '8px',
                    color: '#ffedd4'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="#f78937" 
                  fill="#f78937" 
                  fillOpacity={0.3}
                  name="Signups"
                />
                <Area 
                  type="monotone" 
                  dataKey="unsubscribes" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.3}
                  name="Unsubscribes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Email Domains */}
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-lg font-semibold mb-4">Top Email Domains</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart key={`piechart-v2-${stats.domainBreakdown.length}`}>
                <Pie
                  data={stats.domainBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ domain, percentage }) => `${domain} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  style={{ fontSize: '12px', fill: '#ffedd4', fontWeight: 'bold' }}
                >
                  {stats.domainBreakdown.map((entry, index) => {
                    const color = COLORS[index % COLORS.length];
                    console.log(`Pie chart segment ${index}: ${entry.domain} = ${color}`);
                    return <Cell key={`cell-${index}-${entry.domain}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e3a5f', 
                    border: '1px solid #f78937',
                    borderRadius: '8px',
                    color: '#ffedd4'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Signups */}
          <div className="bg-cream/10 backdrop-blur-sm rounded-lg p-6 border border-cream/20">
            <h3 className="text-cream text-lg font-semibold mb-4">Recent Signups</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-cream">
                <thead>
                  <tr className="border-b border-cream/20">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Domain</th>
                    <th className="text-left py-3 px-4">Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSignups.map((signup, index) => (
                    <tr key={signup.unsubscribe_token} className="border-b border-cream/10">
                      <td className="py-3 px-4">{signup.email}</td>
                      <td className="py-3 px-4 text-cream/70">
                        {signup.email.split('@')[1]}
                      </td>
                      <td className="py-3 px-4 text-cream/70">
                        {format(new Date(signup.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Unsubscribes */}
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/20">
            <h3 className="text-cream text-lg font-semibold mb-4">Recent Unsubscribes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-cream">
                <thead>
                  <tr className="border-b border-red-500/20">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Domain</th>
                    <th className="text-left py-3 px-4">Unsubscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUnsubscribes.length > 0 ? (
                    stats.recentUnsubscribes.map((unsub, index) => (
                      <tr key={unsub.unsubscribe_token} className="border-b border-red-500/10">
                        <td className="py-3 px-4">{unsub.email}</td>
                        <td className="py-3 px-4 text-cream/70">
                          {unsub.email.split('@')[1]}
                        </td>
                        <td className="py-3 px-4 text-cream/70">
                          {format(new Date(unsub.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 px-4 text-center text-cream/70">
                        No unsubscribes yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
