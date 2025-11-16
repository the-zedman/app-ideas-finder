'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';

type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_plan';
  discount_value: number | null;
  free_plan_id?: string | null;
  max_uses?: number | null;
  times_used?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean | null;
  description?: string | null;
  stripe_coupon_id?: string | null;
  stripe_promotion_code?: string | null;
};

export default function AdminCouponsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState({
    code: 'WAITLIST25',
    discountType: 'percentage',
    discountValue: 25,
    description: 'Early access waitlist – 25% lifetime discount',
    stripeCouponId: '',
    stripePromotionCode: '',
    maxUses: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/check-admin');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!data.isAdmin) {
          router.push('/homezone');
          return;
        }
        setIsAdmin(true);
        await loadCoupons();
      } catch (err) {
        console.error('Error loading admin status:', err);
        setError('Failed to verify admin status');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [router]);

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons');
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || body.error || 'Failed to load coupons');
      }
      const body = await res.json();
      setCoupons(body.coupons || []);
    } catch (err) {
      console.error('Error loading coupons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load coupons');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        code: form.code,
        discountType: form.discountType,
        discountValue:
          form.discountType === 'percentage' || form.discountType === 'fixed_amount'
            ? Number(form.discountValue) || null
            : null,
        freePlanId: form.discountType === 'free_plan' ? null : undefined,
        description: form.description || null,
        stripeCouponId: form.stripeCouponId || null,
        stripePromotionCode: form.stripePromotionCode || null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || body.error || 'Failed to create coupon');
      }

      setForm((prev) => ({
        ...prev,
        code: 'WAITLIST25',
        discountType: 'percentage',
        discountValue: 25,
        stripeCouponId: '',
        stripePromotionCode: '',
        maxUses: '',
      }));

      await loadCoupons();
    } catch (err) {
      console.error('Error creating coupon:', err);
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Checking admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px  -4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="/App Ideas Finder - logo - 200x200.png"
                alt="App Ideas Finder"
                className="h-8 w-8 rounded-lg"
              />
              <a href="/admin" className="text-xl font-bold text-[#3D405B] hover:text-gray-700">
                Admin Dashboard
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Coupon Management</h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">
                Back to HomeZone
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create coupon form */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Coupon</h2>
            <p className="text-sm text-gray-600 mb-4">
              Use this to register coupons you create in Stripe, like <strong>WAITLIST25</strong>, so you have a clear
              record of what they do.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                  placeholder="WAITLIST25"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  name="discountType"
                  value={form.discountType}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                  <option value="free_plan">Free Plan</option>
                </select>
              </div>

              {(form.discountType === 'percentage' || form.discountType === 'fixed_amount') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
                  </label>
                  <input
                    name="discountValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                    placeholder={form.discountType === 'percentage' ? '25' : '10.00'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                  placeholder="Short internal note for this coupon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Coupon ID (optional)</label>
                <input
                  name="stripeCouponId"
                  value={form.stripeCouponId}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                  placeholder="e.g. coupon_123..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Promotion Code (optional)</label>
                <input
                  name="stripePromotionCode"
                  value={form.stripePromotionCode}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                  placeholder="e.g. promo_123..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (optional)</label>
                <input
                  name="maxUses"
                  type="number"
                  min="0"
                  value={form.maxUses}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#88D18A]"
                  placeholder="Leave blank for unlimited"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-lg bg-[#88D18A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#88D18A]/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Save Coupon'}
              </button>
            </form>
          </div>

          {/* Coupon list */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Existing Coupons</h2>
            {coupons.length === 0 ? (
              <p className="text-sm text-gray-600">No coupons created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray  -700">Code</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Value</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Uses</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Stripe</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td className="px-3 py-2 font-mono text-xs">{coupon.code}</td>
                        <td className="px-3 py-2 capitalize">{coupon.discount_type.replace('_', ' ')}</td>
                        <td className="px-3 py-2">
                          {coupon.discount_type === 'percentage' && coupon.discount_value != null
                            ? `${coupon.discount_value}%`
                            : coupon.discount_type === 'fixed_amount' && coupon.discount_value != null
                            ? `$${coupon.discount_value.toFixed(2)}`
                            : coupon.discount_type === 'free_plan'
                            ? 'Free plan'
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {coupon.times_used ?? 0}
                          {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            {coupon.stripe_coupon_id && (
                              <span className="text-xs text-gray-600 truncate">
                                Coupon: {coupon.stripe_coupon_id}
                              </span>
                            )}
                            {coupon.stripe_promotion_code && (
                              <span className="text-xs text-gray-600 truncate">
                                Promo: {coupon.stripe_promotion_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block max-w-xs truncate text-xs text-gray-600">
                            {coupon.description || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


