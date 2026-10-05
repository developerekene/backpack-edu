import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Building2,
  Calculator,
  Percent,
  Check
} from 'lucide-react';
import { formatPriceWithDecimals } from '../../lib/price';

interface ProviderRevenueBreakdownVisualizerProps {
  initialTuition?: number;
  currency?: string;
  subaccountCode?: string;
  bankName?: string;
  accountNumber?: string;
  className?: string;
}

export const ProviderRevenueBreakdownVisualizer: React.FC<ProviderRevenueBreakdownVisualizerProps> = ({
  initialTuition = 100000,
  currency = 'NGN',
  bankName,
  accountNumber,
  className = '',
}) => {
  const [tuitionAmount, setTuitionAmount] = useState<number>(initialTuition);
  const [activeTab, setActiveTab] = useState<'calculator' | 'projections'>('calculator');

  const baseTuition = tuitionAmount > 0 ? tuitionAmount : 0;
  const platformFee15 = Math.round(baseTuition * 0.15 * 100) / 100;
  const totalChargedPayer = Math.round(baseTuition * 1.15 * 100) / 100;

  // Organization receives 100% of their base tuition fee
  const subaccountPayout = baseTuition;
  // Platform receives the 15% platform fee added to the transaction
  const platformShareGross = platformFee15;

  // Donut chart data
  const pieData = [
    {
      name: 'Subaccount Payout (100% Base Fee)',
      value: subaccountPayout,
      percentage: '100% Base',
      color: '#10b981', // emerald-500
    },
    {
      name: 'Platform Fee (+15% Addition)',
      value: platformShareGross,
      percentage: '15% Addition',
      color: '#6366f1', // indigo-500
    },
  ];

  // Multi-tier enrollment projections data
  const tiers = [1, 5, 10, 25, 50, 100];
  const barData = tiers.map((count) => ({
    name: `${count} ${count === 1 ? 'std' : 'stds'}`,
    students: count,
    providerPayout: Math.round(subaccountPayout * count),
    platformFee: Math.round(platformShareGross * count),
    totalCollected: Math.round(totalChargedPayer * count),
  }));

  const quickAmounts = [25000, 50000, 100000, 250000, 500000];

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs ${className}`}
    >
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Revenue Split & Payout Breakdown
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Organizations receive 100% of their base course fee. The 15% platform fee is added to the transaction price for payers to bear.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
              activeTab === 'calculator'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center space-x-1">
              <Calculator className="w-3 h-3" />
              <span>Split Details</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('projections')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
              activeTab === 'projections'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Projections</span>
            </span>
          </button>
        </div>
      </div>

      {/* Tuition Input & Presets Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            Course Tuition:
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-medium text-slate-400">₦</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={tuitionAmount}
              onChange={(e) => setTuitionAmount(Math.max(0, Number(e.target.value)))}
              className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white text-right focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setTuitionAmount(amt)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded transition ${
                tuitionAmount === amt
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              ₦{(amt / 1000).toLocaleString()}k
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'calculator' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-2">
            <div className="w-full h-36 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number | string | undefined) => {
                      const numVal = typeof val === 'number' ? val : Number(val || 0);
                      return [`${currency} ${formatPriceWithDecimals(numVal)}`, 'Amount'];
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] uppercase font-medium text-slate-400">Total Price (Base + 15%)</span>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                  ₦{formatPriceWithDecimals(totalChargedPayer)}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Subaccount (100% Base)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                <span>Main Account (+15% Fee)</span>
              </span>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Subaccount Bank Settlement */}
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-lg flex flex-col justify-between space-y-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Subaccount Direct Payout</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                    100% Base Fee
                  </span>
                </div>
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {currency} {formatPriceWithDecimals(subaccountPayout)}
                </div>
              </div>
              {bankName && accountNumber && (
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium pt-1 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>{bankName} (•••• {accountNumber.slice(-4)})</span>
                </p>
              )}
            </div>

            {/* Platform Main Account Share */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg flex flex-col justify-between space-y-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                    <Percent className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] font-semibold">Platform Fee (+15%)</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                    Paid by Payer
                  </span>
                </div>
                <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {currency} {formatPriceWithDecimals(platformShareGross)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Projections Bar Chart */
        <div className="space-y-2">
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickFormatter={(val) => `₦${(val / 1000).toLocaleString()}k`}
                />
                <RechartsTooltip
                  formatter={(val: number | string | undefined, name: string | undefined) => {
                    const numVal = typeof val === 'number' ? val : Number(val || 0);
                    return [`${currency} ${formatPriceWithDecimals(numVal)}`, name || 'Amount'];
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar
                  dataKey="providerPayout"
                  name="Your Payout (100% Base)"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="platformFee"
                  name="Platform Fee (+15%)"
                  fill="#6366f1"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
