import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Briefcase, Clock, CheckCircle2, AlertCircle, 
  ChevronRight, User, Plus, LogOut, Lock, Wallet, 
  Calendar, Filter, ArrowDownCircle, ArrowUpCircle
} from "lucide-react";
import { DentalCase, Payment } from "../types";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function DoctorPortal() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loggedInDoctor, setLoggedInDoctor] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'payments'>('dashboard');
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [caseSearch, setCaseSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalData, setPortalData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("doctor_user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setLoggedInDoctor(user);
      
      // Verify session with server
      fetch("/api/me").then(res => {
        if (!res.ok) {
          handleLogout();
        }
      }).catch(() => {
        // If server is down, we can keep the local state for now or handle it
      });
    }
  }, []);

  const fetchPortalData = async () => {
    if (!loggedInDoctor?.doctor_id) return;
    setDataLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter.start) queryParams.append("startDate", dateFilter.start);
      if (dateFilter.end) queryParams.append("endDate", dateFilter.end);
      
      const response = await fetch(`/api/doctors/${loggedInDoctor.doctor_id}/portal-data?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
      } else {
        toast.error("Failed to load portal data");
      }
    } catch (err) {
      console.error("Portal data fetch error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInDoctor) {
      fetchPortalData();
    }
  }, [loggedInDoctor, dateFilter]);

  const cases = portalData?.cases || [];
  const payments = portalData?.payments || [];
  const balance = portalData?.balance || { total_invoiced: 0, total_paid: 0, outstanding_balance: 0 };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (response.ok) {
        const user = await response.json();
        if (user.role === 'Doctor' && user.doctor_id) {
          localStorage.setItem("doctor_user", JSON.stringify(user));
          localStorage.setItem("user", JSON.stringify(user));
          setLoggedInDoctor(user);
          toast.success("Welcome back, Doctor!");
        } else {
          toast.error("This portal is for doctors only.");
        }
      } else {
        toast.error("Invalid username or password");
      }
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    localStorage.removeItem("doctor_user");
    setLoggedInDoctor(null);
    setPortalData(null);
    setCredentials({ username: "", password: "" });
    // If we are using the unified App.tsx session, we should also clear 'user'
    localStorage.removeItem("user");
  };

  const handleUpdateStatus = async (caseId: any, status: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment: "Status updated by doctor via portal" }),
      });
      
      if (response.ok) {
        toast.success("Case status updated");
        fetchPortalData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const statusColors = {
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Trial': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Delivered': 'bg-purple-100 text-purple-700 border-purple-200',
    'Returned': 'bg-rose-100 text-rose-700 border-rose-200'
  };

  const filteredCases = cases.filter((c: any) => 
    c.patient_name.toLowerCase().includes(caseSearch.toLowerCase()) ||
    c.case_type.toLowerCase().includes(caseSearch.toLowerCase()) ||
    c.id.toString().includes(caseSearch)
  );

  const filteredPayments = payments.filter((p: any) => 
    p.reference_no.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.payment_method.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 mb-4">
            <User size={32} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Doctor's Portal</h1>
          <p className="text-zinc-500">
            {loggedInDoctor ? `Logged in as Dr. ${loggedInDoctor.username}` : "Secure access for registered doctors."}
          </p>
          {loggedInDoctor ? (
            <div className="flex justify-center gap-6">
              <button 
                onClick={handleLogout}
                className="inline-flex items-center text-xs font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
              >
                <LogOut size={14} className="mr-1.5" /> Sign Out
              </button>
              <a 
                href="/"
                className="inline-flex items-center text-xs font-bold text-zinc-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
              >
                <ChevronRight size={14} className="mr-1.5 rotate-180" /> Main Portal
              </a>
            </div>
          ) : (
            <div className="flex justify-center">
              <a 
                href="/"
                className="inline-flex items-center text-xs font-bold text-zinc-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
              >
                <ChevronRight size={14} className="mr-1.5 rotate-180" /> Back to Main Portal
              </a>
            </div>
          )}
        </header>

        {!loggedInDoctor ? (
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-zinc-100 max-w-md mx-auto">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <div className="text-xs">Dr. </div>
                  <input 
                    required
                    type="text"
                    placeholder="Your portal username"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xl shadow-zinc-900/20"
              >
                {loading ? "Authenticating..." : "Sign In to Portal"}
              </button>
            </form>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dataLoading && !portalData ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm animate-pulse">
                    <div className="h-3 w-24 bg-zinc-100 rounded mb-4" />
                    <div className="h-8 w-32 bg-zinc-100 rounded" />
                  </div>
                ))
              ) : (
                <>
                  <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Invoiced</p>
                    <p className="text-2xl font-black text-zinc-900">Rs {balance.total_invoiced.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Paid</p>
                    <p className="text-2xl font-black text-emerald-600">Rs {balance.total_paid.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm bg-rose-50/30">
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Outstanding Balance</p>
                    <p className="text-2xl font-black text-rose-600">Rs {balance.outstanding_balance.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-zinc-100 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'dashboard' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('cases')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'cases' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Cases
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'payments' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Payments
              </button>
            </div>

            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pending</p>
                    <p className="text-xl font-black text-amber-500">{cases.filter((c: any) => c.status === 'Pending').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">In Progress</p>
                    <p className="text-xl font-black text-blue-500">{cases.filter((c: any) => c.status === 'In Progress').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Trial</p>
                    <p className="text-xl font-black text-indigo-500">{cases.filter((c: any) => c.status === 'Trial').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Completed</p>
                    <p className="text-xl font-black text-emerald-500">{cases.filter((c: any) => c.status === 'Completed').length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} className="text-emerald-500" /> Recent Activity
                    </h3>
                    <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
                      {cases.slice(0, 5).map((c: any) => (
                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", 
                              c.status === 'Pending' ? 'bg-amber-400' : 
                              c.status === 'Completed' ? 'bg-emerald-400' : 'bg-blue-400'
                            )} />
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{c.patient_name}</p>
                              <p className="text-[10px] text-zinc-400">{c.case_type} • {format(new Date(c.created_at), 'MMM dd')}</p>
                            </div>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", statusColors[c.status as keyof typeof statusColors])}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                      {cases.length === 0 && (
                        <div className="p-8 text-center text-zinc-400 text-sm italic">No recent activity</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" /> Upcoming Due Dates
                    </h3>
                    <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
                      {cases
                        .filter((c: any) => c.status !== 'Completed' && c.status !== 'Delivered')
                        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .slice(0, 5)
                        .map((c: any) => (
                          <div key={c.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{c.patient_name}</p>
                              <p className="text-[10px] text-zinc-400">{c.case_type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-rose-500">{format(new Date(c.due_date), 'MMM dd')}</p>
                              <p className="text-[10px] text-zinc-400">Due in {Math.ceil((new Date(c.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</p>
                            </div>
                          </div>
                        ))}
                      {cases.filter((c: any) => c.status !== 'Completed' && c.status !== 'Delivered').length === 0 && (
                        <div className="p-8 text-center text-zinc-400 text-sm italic">No upcoming deadlines</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cases' ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-zinc-900">Your Cases ({filteredCases.length})</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search patient or case type..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={caseSearch}
                        onChange={(e) => setCaseSearch(e.target.value)}
                      />
                    </div>
                    <Link 
                      to="/new-case" 
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                    >
                      <Plus size={16} /> Submit New Case
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dataLoading && cases.length === 0 ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm animate-pulse">
                        <div className="flex justify-between mb-6">
                          <div className="space-y-2">
                            <div className="h-3 w-16 bg-zinc-100 rounded" />
                            <div className="h-5 w-32 bg-zinc-100 rounded" />
                          </div>
                          <div className="h-6 w-20 bg-zinc-100 rounded-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="h-12 bg-zinc-50 rounded-xl" />
                          <div className="h-12 bg-zinc-50 rounded-xl" />
                        </div>
                        <div className="h-4 w-full bg-zinc-50 rounded mt-4" />
                      </div>
                    ))
                  ) : (
                    filteredCases.map((c: any) => (
                      <motion.div 
                        key={c.id}
                        layoutId={c.id.toString()}
                        className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Case #{c.id.toString().substring(0, 4).toUpperCase()}</p>
                            <h3 className="text-lg font-bold text-zinc-900">{c.patient_name}</h3>
                          </div>
                          <select 
                            value={c.status}
                            onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold border focus:outline-none transition-all cursor-pointer",
                              statusColors[c.status as keyof typeof statusColors]
                            )}
                          >
                            {Object.keys(statusColors).map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Type</p>
                            <p className="text-sm font-bold text-zinc-700">{c.case_type}</p>
                          </div>
                          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Due Date</p>
                            <p className="text-sm font-bold text-emerald-600">{format(new Date(c.due_date), 'MMM dd')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                          <div className="flex items-center text-zinc-400 text-xs">
                            <Clock size={14} className="mr-1.5" />
                            Received {format(new Date(c.receiving_date), 'MMM dd')}
                          </div>
                          <ChevronRight size={18} className="text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {!dataLoading && cases.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-zinc-100 border-dashed">
                    <Briefcase size={48} className="mx-auto text-zinc-200 mb-4" />
                    <p className="text-zinc-500 font-medium">No active cases found.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Search Payments</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                        <input 
                          type="text"
                          placeholder="Ref # or method..."
                          className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={paymentSearch}
                          onChange={(e) => setPaymentSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Start Date</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">End Date</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={fetchPortalData}
                    className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center gap-2"
                  >
                    <Filter size={16} /> Filter
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredPayments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                            {format(new Date(p.payment_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500">
                            {p.reference_no}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-600">
                            Rs {p.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPayments.length === 0 && (
                    <div className="p-12 text-center">
                      <Wallet size={32} className="mx-auto text-zinc-200 mb-2" />
                      <p className="text-zinc-500 text-sm">No payment history found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
