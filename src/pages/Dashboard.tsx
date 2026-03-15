import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Briefcase, Users, Clock, CheckCircle2, 
  TrendingUp, ChevronRight, Banknote, 
  Wallet, TrendingDown, AlertCircle, FileText
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DentalCase, Doctor } from "../types";
import { format } from "date-fns";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [financials, setFinancials] = useState({ total_revenue: 0, total_payments: 0, total_expenses: 0, net_profit: 0 });
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endpoints = [
          { key: 'cases', url: "/api/cases", setter: setCases },
          { key: 'doctors', url: "/api/doctors", setter: setDoctors },
          { key: 'financials', url: "/api/reports/financial-summary", setter: setFinancials },
          { key: 'stats', url: "/api/reports/daily-stats", setter: setDailyStats }
        ];

        await Promise.all(endpoints.map(async (endpoint) => {
          try {
            const res = await fetch(endpoint.url);
            if (res.ok) {
              const data = await res.json();
              endpoint.setter(data);
            } else {
              console.warn(`Dashboard fetch failed for ${endpoint.key}: ${res.status} ${res.statusText}`);
            }
          } catch (err) {
            console.error(`Dashboard fetch error for ${endpoint.key}:`, err);
          }
        }));
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { 
      label: "Active Cases", 
      value: cases.filter(c => c.status !== 'Completed' && c.status !== 'Delivered' && c.status !== 'Returned').length, 
      icon: Briefcase, 
      color: "text-blue-500", 
      bg: "bg-blue-50" 
    },
    { 
      label: "Total Doctors", 
      value: doctors.length, 
      icon: Users, 
      color: "text-emerald-500", 
      bg: "bg-emerald-50" 
    },
    { 
      label: "Monthly Profit", 
      value: `Rs ${(financials.net_profit || 0).toLocaleString()}`, 
      icon: Banknote, 
      color: "text-purple-500", 
      bg: "bg-purple-50" 
    },
    { 
      label: "Pending", 
      value: cases.filter(c => c.status === 'Pending').length, 
      icon: Clock, 
      color: "text-amber-500", 
      bg: "bg-amber-50" 
    },
  ];

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Lab Overview</h1>
        <p className="text-zinc-500 mt-1">Welcome back. Here's what's happening in your lab today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center space-x-4"
          >
            <div className={`${stat.bg} p-3 rounded-xl`}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Case Trends</h2>
              <p className="text-sm text-zinc-500 mt-1">Daily case volume for the last 30 days.</p>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">New Cases</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#a1a1aa', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#a1a1aa', fontSize: 12}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-8">Financial Health</h2>
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Gross Revenue</span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">Rs {(financials.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Total Expenses</span>
                <TrendingDown size={16} className="text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-700">Rs {(financials.total_expenses || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Net Profit</span>
                <Banknote size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">Rs {(financials.net_profit || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900">Recent Cases</h2>
            <Link to="/cases" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Patient</th>
                  <th className="px-6 py-4 font-semibold">Doctor</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cases.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900">{c.patient_name}</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">{c.doctor_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md text-xs font-medium">{c.case_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        c.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 text-sm">
                      {c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/new-case" className="flex items-center p-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors group">
              <div className="bg-white/20 p-2 rounded-lg mr-4">
                <Briefcase size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">New Dental Case</p>
                <p className="text-xs text-emerald-100">Add a new restoration job</p>
              </div>
              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link to="/doctors" className="flex items-center p-4 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors group">
              <div className="bg-white/10 p-2 rounded-lg mr-4">
                <Users size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Add Doctor</p>
                <p className="text-xs text-zinc-400">Register a new client</p>
              </div>
              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link to="/invoices" className="flex items-center p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors group">
              <div className="bg-white/20 p-2 rounded-lg mr-4">
                <FileText size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Create Invoice</p>
                <p className="text-xs text-blue-100">Bill a doctor for cases</p>
              </div>
              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link to="/financials" className="flex items-center p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors group">
              <div className="bg-white/20 p-2 rounded-lg mr-4">
                <Banknote size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Record Payment</p>
                <p className="text-xs text-purple-100">Log incoming funds</p>
              </div>
              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
