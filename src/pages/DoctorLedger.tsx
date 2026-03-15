import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, Wallet, Receipt, 
  ArrowUpRight, ArrowDownRight, 
  Calendar, FileText, Banknote,
  Briefcase, CheckCircle2, Clock,
  Plus, X, Save, CreditCard,
  TrendingUp, Activity, User, Phone, Mail, MapPin,
  Stethoscope, MessageCircle
} from "lucide-react";
import { Doctor, DentalCase, Payment } from "../types";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DoctorLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const doctorId = id as string;

  const [doctor, setDoctor] = useState<any>(null);
  const [doctorCases, setDoctorCases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_cases: 0, pending_cases: 0, delivered_cases: 0, total_bill: 0, total_paid: 0, outstanding_balance: 0 });
  const [uninvoicedCases, setUninvoicedCases] = useState<any[]>([]);
  const [doctorInvoices, setDoctorInvoices] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedCases, setSelectedCases] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    invoice_id: "",
    payment_method: "Cash",
    reference_no: "",
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });

  const fetchData = async () => {
    try {
      const [docRes, casesRes, payRes, statsRes, uninvRes, invRes, trendRes] = await Promise.all([
        fetch(`/api/doctors/${doctorId}`),
        fetch(`/api/doctors/${doctorId}/cases`),
        fetch(`/api/doctors/${doctorId}/payments`),
        fetch(`/api/reports/doctor-ledger/${doctorId}`),
        fetch(`/api/doctors/${doctorId}/cases?uninvoiced=true`),
        fetch(`/api/invoices?doctor_id=${doctorId}`),
        fetch(`/api/reports/doctor-revenue-trend/${doctorId}`)
      ]);

      if (docRes.ok) setDoctor(await docRes.json());
      if (casesRes.ok) setDoctorCases(await casesRes.json());
      if (payRes.ok) setPayments(await payRes.json());
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          ...statsData,
          outstanding_balance: (statsData.total_bill || 0) - (statsData.total_paid || 0)
        });
      }
      if (uninvRes.ok) setUninvoicedCases(await uninvRes.json());
      if (invRes.ok) {
        const invoices = await invRes.json();
        setDoctorInvoices(invoices.filter((inv: any) => inv.status !== 'Paid'));
      }
      if (trendRes.ok) setRevenueTrend(await trendRes.json());
    } catch (err) {
      console.error("Failed to fetch ledger data", err);
      toast.error("Failed to load ledger data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [doctorId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          doctor_id: doctorId,
          invoice_id: paymentForm.invoice_id || undefined,
          amount: Number(paymentForm.amount)
        })
      });

      if (!res.ok) throw new Error("Failed to record payment");

      toast.success("Payment recorded successfully");
      setPaymentForm({
        amount: "",
        invoice_id: "",
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

  const handleGenerateInvoice = async () => {
    if (selectedCases.length === 0) {
      toast.error("Please select at least one case");
      return;
    }

    const items = uninvoicedCases
      .filter((c: any) => selectedCases.includes(c.id))
      .map((c: any) => ({
        case_id: c.id,
        description: `${c.case_type} - ${c.patient_name}`,
        amount: c.cost
      }));

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          amount: totalAmount,
          due_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 7 days from now
          items
        })
      });

      if (!res.ok) throw new Error("Failed to generate invoice");

      toast.success("Invoice generated successfully");
      setIsInvoiceModalOpen(false);
      setSelectedCases([]);
      fetchData();
    } catch (err) {
      toast.error("Failed to generate invoice");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 rounded-full mr-4 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">{doctor.name}</h1>
            <p className="text-zinc-500 mt-1">Financial Ledger & Case History • {doctor.clinic_name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-all shadow-sm"
          >
            <Receipt size={18} className="mr-2" /> Generate Invoice
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Total Billed</span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">Rs {(stats.total_bill || 0).toLocaleString()}</h3>
          <p className="text-xs text-zinc-400 mt-1">From {stats.total_cases} total cases</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">Total Paid</span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">Rs {(stats.total_paid || 0).toLocaleString()}</h3>
          <p className="text-xs text-zinc-400 mt-1">Payments received to date</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-full uppercase tracking-wider">Outstanding</span>
          </div>
          <h3 className="text-2xl font-bold text-rose-700">Rs {(stats.outstanding_balance || 0).toLocaleString()}</h3>
          <p className="text-xs text-rose-400 mt-1">Remaining balance due</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Activity size={20} />
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">Case Stats</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold text-zinc-900">{stats.delivered_cases}</h3>
              <p className="text-xs text-zinc-400 mt-1">Delivered</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-zinc-900">{stats.pending_cases}</h3>
              <p className="text-xs text-zinc-400 mt-1">In Progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Revenue Trend Chart */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <TrendingUp size={20} className="mr-2 text-emerald-500" /> Revenue Trend
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                <span className="text-xs font-bold text-zinc-500 uppercase">Monthly Revenue</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(value) => `Rs ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`Rs ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Recent Cases */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <Briefcase size={20} className="mr-2 text-emerald-500" /> Recent Cases
              </h2>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Case ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {doctorCases.slice(0, 10).map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                        <td className="px-6 py-4 text-sm font-mono text-zinc-400">#{c.id.substring(0, 4).toUpperCase()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-zinc-900">{c.patient_name}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md uppercase">
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">Rs {(c.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <Banknote size={20} className="mr-2 text-emerald-500" /> Payment History
              </h2>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ref No</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {payments.slice(0, 10).map((p: any) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {format(new Date(p.payment_date), 'MMM d, yyyy')}
                          {p.invoice_no && (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold mt-1 text-[10px]">
                              <Receipt size={10} />
                              INV-{p.invoice_no}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md uppercase border border-emerald-100">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{p.reference_no || "-"}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">Rs {(p.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Record Payment Form & Doctor Info */}
        <div className="space-y-8">
          {/* Doctor Info Card */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <User size={20} className="mr-2 text-emerald-500" /> Doctor Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                {doctor.image_url ? (
                  <img src={doctor.image_url} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <User size={32} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-zinc-900">{doctor.name}</h3>
                  <p className="text-sm text-emerald-600 font-medium">{doctor.clinic_name}</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-zinc-50">
                <div className="flex items-center text-sm text-zinc-600">
                  <Phone size={16} className="mr-3 text-zinc-400" /> {doctor.phone || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-zinc-600">
                  <Mail size={16} className="mr-3 text-zinc-400" /> {doctor.email || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-zinc-600">
                  <Stethoscope size={16} className="mr-3 text-zinc-400" /> {doctor.specialization || 'General'}
                </div>
                {doctor.license_number && (
                  <div className="flex items-center text-sm text-zinc-600">
                    <FileText size={16} className="mr-3 text-zinc-400" /> License: {doctor.license_number}
                  </div>
                )}
                <div className="flex items-center text-sm text-zinc-600">
                  <MessageCircle size={16} className="mr-3 text-zinc-400" /> Prefers: {doctor.preferred_contact_method || 'Phone'}
                </div>
              </div>

              {doctor.notes && (
                <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs text-zinc-500 italic">
                  "{doctor.notes}"
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden sticky top-8">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <CreditCard size={20} className="mr-2 text-emerald-500" /> Record New Payment
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Manually enter a payment to update balance.</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Link to Invoice (Optional)</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-sm"
                    value={paymentForm.invoice_id}
                    onChange={(e) => {
                      const invId = e.target.value;
                      const selectedInv = doctorInvoices.find(i => i.id.toString() === invId);
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <Banknote size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      required
                      type="number" 
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Payment Method</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reference Number</label>
                  <input 
                    type="text" 
                    placeholder="Check # or Transaction ID"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={paymentForm.reference_no}
                    onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                    rows={2}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Optional notes..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full px-6 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center"
                >
                  <Save size={20} className="mr-2" /> Record Payment
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Generate Invoice</h2>
                  <p className="text-sm text-zinc-500 mt-1">Select uninvoiced cases for {doctor.name}</p>
                </div>
                <button onClick={() => setIsInvoiceModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                {uninvoicedCases.length > 0 ? (
                  <>
                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                      {uninvoicedCases.map((c: any) => (
                        <div 
                          key={c.id}
                          onClick={() => {
                            if (selectedCases.includes(c.id)) {
                              setSelectedCases(selectedCases.filter(id => id !== c.id));
                            } else {
                              setSelectedCases([...selectedCases, c.id]);
                            }
                          }}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            selectedCases.includes(c.id) 
                              ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                              : "bg-white border-zinc-100 hover:border-zinc-200"
                          )}
                        >
                          <div className="flex items-center">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center mr-4 transition-colors",
                              selectedCases.includes(c.id) ? "bg-emerald-500 border-emerald-500" : "border-zinc-200"
                            )}>
                              {selectedCases.includes(c.id) && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900">{c.patient_name}</p>
                              <p className="text-xs text-zinc-500">{c.case_type} • {format(new Date(c.created_at), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <p className="font-bold text-zinc-900">Rs {c.cost.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-500">Selected {selectedCases.length} cases</p>
                        <p className="text-xl font-bold text-zinc-900">
                          Total: Rs {uninvoicedCases.filter((c: any) => selectedCases.includes(c.id)).reduce((sum: number, c: any) => sum + c.cost, 0).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={handleGenerateInvoice}
                        disabled={selectedCases.length === 0}
                        className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none"
                      >
                        Generate Invoice
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">No uninvoiced cases</h3>
                    <p className="text-zinc-500 mt-1">All cases for this doctor have already been invoiced.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
