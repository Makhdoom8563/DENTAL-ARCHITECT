import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Banknote, Plus, Search, Calendar, 
  TrendingUp, TrendingDown, Wallet, 
  ArrowUpRight, ArrowDownRight, Filter,
  CreditCard, Receipt, X,
  ChevronUp, ChevronDown, ChevronsUpDown
} from "lucide-react";
import { Payment, Expense, Doctor } from "../types";
import { format, startOfMonth, eachDayOfInterval, subDays, isSameDay } from "date-fns";
import { toast } from "react-hot-toast";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

import { useNavigate } from "react-router-dom";

export default function Financials() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [summary, setSummary] = useState({ 
    total_revenue: 0, 
    gross_revenue: 0,
    total_discounts: 0,
    total_taxes: 0,
    total_payments: 0, 
    total_expenses: 0, 
    net_profit: 0,
    pending_receivables: 0
  });
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    doctor_id: "",
    invoice_id: "",
    amount: "",
    payment_method: "Cash",
    reference_no: "",
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "Materials",
    amount: "",
    description: "",
    expense_date: format(new Date(), 'yyyy-MM-dd')
  });

  const [doctorInvoices, setDoctorInvoices] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const endpoints = [
        { key: 'payments', url: "/api/payments", setter: setPayments },
        { key: 'expenses', url: "/api/expenses", setter: setExpenses },
        { key: 'doctors', url: "/api/doctors", setter: setDoctors },
        { key: 'summary', url: "/api/reports/financial-summary", setter: setSummary }
      ];

      await Promise.all(endpoints.map(async (endpoint) => {
        try {
          const res = await fetch(endpoint.url);
          if (res.ok) {
            const data = await res.json();
            endpoint.setter(data);
          } else {
            console.warn(`Financials fetch failed for ${endpoint.key}: ${res.status} ${res.statusText}`);
          }
        } catch (err) {
          console.error(`Financials fetch error for ${endpoint.key}:`, err);
        }
      }));
    } catch (err) {
      console.error("Failed to fetch financials data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (paymentForm.doctor_id) {
      fetch(`/api/invoices?doctor_id=${paymentForm.doctor_id}`)
        .then(res => res.json())
        .then(data => setDoctorInvoices(data.filter((inv: any) => inv.status !== 'Paid')))
        .catch(err => console.error("Failed to fetch doctor invoices", err));
    } else {
      setDoctorInvoices([]);
    }
  }, [paymentForm.doctor_id]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: paymentForm.doctor_id,
          invoice_id: paymentForm.invoice_id || undefined,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          reference_no: paymentForm.reference_no,
          payment_date: paymentForm.payment_date,
          notes: paymentForm.notes
        })
      });

      if (!res.ok) throw new Error("Failed to record payment");

      toast.success("Payment recorded");
      setIsModalOpen(false);
      setPaymentForm({
        doctor_id: "",
        invoice_id: "",
        amount: "",
        payment_method: "Cash",
        reference_no: "",
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ""
      });
      fetchData();
    } catch (err) {
      toast.error("Failed to record payment");
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseForm.category,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          expense_date: expenseForm.expense_date
        })
      });

      if (!res.ok) throw new Error("Failed to record expense");

      toast.success("Expense recorded");
      setIsModalOpen(false);
      setExpenseForm({
        category: "Materials",
        amount: "",
        description: "",
        expense_date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchData();
    } catch (err) {
      toast.error("Failed to record expense");
    }
  };

  const [paymentSort, setPaymentSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'payment_date', direction: 'desc' });
  const [expenseSort, setExpenseSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'expense_date', direction: 'desc' });

  const handlePaymentSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (paymentSort.key === key && paymentSort.direction === 'asc') {
      direction = 'desc';
    }
    setPaymentSort({ key, direction });
  };

  const handleExpenseSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (expenseSort.key === key && expenseSort.direction === 'asc') {
      direction = 'desc';
    }
    setExpenseSort({ key, direction });
  };

  const sortedPayments = [...payments].sort((a, b) => {
    let aVal = a[paymentSort.key];
    let bVal = b[paymentSort.key];
    
    if (paymentSort.key === 'amount') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return paymentSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return paymentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedExpenses = [...expenses].sort((a, b) => {
    let aVal = a[expenseSort.key];
    let bVal = b[expenseSort.key];
    
    if (expenseSort.key === 'amount') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return expenseSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return expenseSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ sortKey, currentSort }: { sortKey: string, currentSort: { key: string, direction: string } }) => {
    if (currentSort.key !== sortKey) return <ChevronsUpDown size={12} className="ml-1 opacity-20" />;
    return currentSort.direction === 'asc' ? <ChevronUp size={12} className="ml-1 text-emerald-500" /> : <ChevronDown size={12} className="ml-1 text-emerald-500" />;
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  // Prepare Daily Trend Data (Last 14 days)
  const last14Days = eachDayOfInterval({
    start: subDays(new Date(), 13),
    end: new Date()
  });

  const dailyTrendData = last14Days.map(day => {
    const dayPayments = payments.filter(p => isSameDay(new Date(p.payment_date), day));
    const dayExpenses = expenses.filter(e => isSameDay(new Date(e.expense_date), day));
    
    return {
      date: format(day, 'MMM d'),
      revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      expenses: dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  });

  // Prepare Monthly Trend Data (Last 6 months)
  const monthlyTrendData = Array.from({ length: 6 }).map((_, i) => {
    const monthDate = subDays(new Date(), i * 30);
    const monthStart = startOfMonth(monthDate);
    const monthPayments = payments.filter(p => {
      const pDate = new Date(p.payment_date);
      return pDate.getMonth() === monthStart.getMonth() && pDate.getFullYear() === monthStart.getFullYear();
    });
    
    return {
      month: format(monthStart, 'MMM yyyy'),
      revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    };
  }).reverse();

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Financial Management</h1>
          <p className="text-zinc-500 mt-1">Track payments, expenses, and overall lab profitability.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setActiveTab('payments');
              setIsModalOpen(true);
            }}
            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} className="mr-2" /> Record Payment
          </button>
          <button 
            onClick={() => {
              setActiveTab('expenses');
              setIsModalOpen(true);
            }}
            className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
          >
            <Plus size={20} className="mr-2" /> Record Expense
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">Net Revenue</span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">Rs {(summary.total_revenue || 0).toLocaleString()}</h3>
          <p className="text-xs text-zinc-400 mt-1">Gross: Rs {summary.gross_revenue?.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Payments Received</span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">Rs {(summary.total_payments || 0).toLocaleString()}</h3>
          <p className="text-xs text-zinc-400 mt-1">Cash flow into lab</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full uppercase tracking-wider">Total Expenses</span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">Rs {(summary.total_expenses || 0).toLocaleString()}</h3>
          <p className="text-xs text-zinc-400 mt-1">Materials, rent, salaries</p>
        </div>

        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-zinc-900/10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Net Profit</span>
          </div>
          <h3 className="text-2xl font-bold text-white">Rs {(summary.net_profit || 0).toLocaleString()}</h3>
          <p className="text-xs text-zinc-500 mt-1">Revenue minus expenses</p>
        </div>
      </div>

      {/* Tax & Discount Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Discounts Given</p>
              <h4 className="text-xl font-bold text-zinc-900">Rs {(summary.total_discounts || 0).toLocaleString()}</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Tax Collected</p>
            <h4 className="text-xl font-bold text-emerald-600">Rs {(summary.total_taxes || 0).toLocaleString()}</h4>
          </div>
        </div>
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Pending Receivables</p>
              <h4 className="text-xl font-bold text-amber-900">Rs {(summary.pending_receivables || 0).toLocaleString()}</h4>
            </div>
          </div>
          <button 
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors"
          >
            View Invoices
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Revenue vs Expenses</h2>
              <p className="text-sm text-zinc-500">Daily trend for the last 14 days</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-zinc-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-zinc-500">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(value) => `Rs ${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorExp)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Monthly Revenue</h2>
              <p className="text-sm text-zinc-500">Performance over the last 6 months</p>
            </div>
            <div className="w-10 h-10 bg-zinc-100 text-zinc-400 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(value) => `Rs ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {monthlyTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === monthlyTrendData.length - 1 ? '#10b981' : '#e4e4e7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs and Tables */}
      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-zinc-100">
          <button 
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'payments' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Payments History
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'expenses' ? 'text-rose-600 border-b-2 border-rose-500 bg-rose-50/30' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Expenses Breakdown
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'payments' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-50">
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handlePaymentSort('payment_date')}>
                      <div className="flex items-center">Date <SortIcon sortKey="payment_date" currentSort={paymentSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handlePaymentSort('doctor_name')}>
                      <div className="flex items-center">Doctor <SortIcon sortKey="doctor_name" currentSort={paymentSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handlePaymentSort('amount')}>
                      <div className="flex items-center justify-end">Amount <SortIcon sortKey="amount" currentSort={paymentSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handlePaymentSort('payment_method')}>
                      <div className="flex items-center">Payment Method <SortIcon sortKey="payment_method" currentSort={paymentSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handlePaymentSort('reference_no')}>
                      <div className="flex items-center">Reference Number <SortIcon sortKey="reference_no" currentSort={paymentSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handlePaymentSort('notes')}>
                      <div className="flex items-center">Notes <SortIcon sortKey="notes" currentSort={paymentSort} /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                    {sortedPayments.map((p: any) => (
                      <tr key={p.id} className="group hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 text-sm font-medium text-zinc-600">{format(new Date(p.payment_date), 'MMM d, yyyy')}</td>
                        <td className="py-4 text-sm font-bold text-zinc-900">{p.doctor_name}</td>
                        <td className="py-4 text-sm font-bold text-emerald-600 text-right">Rs {(p.amount || 0).toLocaleString()}</td>
                        <td className="py-4">
                          <span className="text-[10px] font-bold px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md uppercase">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-zinc-500 font-mono">{p.reference_no || "-"}</td>
                        <td className="py-4 text-sm text-zinc-500">{p.notes || "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-50">
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handleExpenseSort('expense_date')}>
                      <div className="flex items-center">Expense Date <SortIcon sortKey="expense_date" currentSort={expenseSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handleExpenseSort('category')}>
                      <div className="flex items-center">Category <SortIcon sortKey="category" currentSort={expenseSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handleExpenseSort('description')}>
                      <div className="flex items-center">Description <SortIcon sortKey="description" currentSort={expenseSort} /></div>
                    </th>
                    <th className="pb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => handleExpenseSort('amount')}>
                      <div className="flex items-center justify-end">Amount <SortIcon sortKey="amount" currentSort={expenseSort} /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {sortedExpenses.map((e: any) => (
                    <tr key={e.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 text-sm font-medium text-zinc-600">{format(new Date(e.expense_date), 'MMM d, yyyy')}</td>
                      <td className="py-4">
                        <span className="text-[10px] font-bold px-2 py-1 bg-rose-50 text-rose-600 rounded-md uppercase border border-rose-100">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-zinc-500">{e.description}</td>
                      <td className="py-4 text-sm font-bold text-rose-600 text-right">Rs {(e.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">
                  {activeTab === 'payments' ? "Record Doctor Payment" : "Record Lab Expense"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              {activeTab === 'payments' ? (
                <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Select Doctor</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={paymentForm.doctor_id}
                      onChange={(e) => setPaymentForm({...paymentForm, doctor_id: e.target.value})}
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.clinic_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Link to Invoice (Optional)</label>
                    <select 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={paymentForm.invoice_id}
                      onChange={(e) => {
                        const invId = e.target.value;
                        const selectedInv = doctorInvoices.find(i => i.id === invId);
                        setPaymentForm({
                          ...paymentForm, 
                          invoice_id: invId,
                          amount: selectedInv ? (selectedInv.amount - (selectedInv.total_paid || 0)).toString() : paymentForm.amount
                        });
                      }}
                    >
                      <option value="">No link</option>
                      {doctorInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          INV-{inv.invoice_no} (Rs {(inv.amount - (inv.total_paid || 0)).toLocaleString()} remaining)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Amount (Rs)</label>
                      <input 
                        required
                        type="number" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Date</label>
                      <input 
                        required
                        type="date" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Method</label>
                      <select 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                      >
                        <option>Cash</option>
                        <option>Bank Transfer</option>
                        <option>Check</option>
                        <option>Online</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Ref No</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={paymentForm.reference_no}
                        onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
                        placeholder="Check # or TXN ID"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">Save Payment</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Category</label>
                    <select 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    >
                      <option>Materials</option>
                      <option>Salaries</option>
                      <option>Rent</option>
                      <option>Utilities</option>
                      <option>Maintenance</option>
                      <option>Marketing</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Amount (Rs)</label>
                      <input 
                        required
                        type="number" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Date</label>
                      <input 
                        required
                        type="date" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={expenseForm.expense_date}
                        onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Description</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-24 resize-none"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                      placeholder="What was this expense for?"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20">Save Expense</button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
