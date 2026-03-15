import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, Plus, ChevronRight, Clock, CheckCircle2, Truck, AlertCircle, Briefcase, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DentalCase } from "../types";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

export default function Cases() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases");
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error("Failed to fetch cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    setUpdatingId(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchCases();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredCases = cases.filter((c: any) => {
    const matchesSearch = 
      (c.patient_name || "").toLowerCase().includes(search.toLowerCase()) || 
      (c.patient_id || "").toLowerCase().includes(search.toLowerCase()) ||
      c.doctor_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusColors = {
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Trial': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Delivered': 'bg-purple-100 text-purple-700 border-purple-200',
    'Returned': 'bg-rose-100 text-rose-700 border-rose-200'
  };

  const statusIcons = {
    'Pending': Clock,
    'In Progress': AlertCircle,
    'Trial': Briefcase,
    'Completed': CheckCircle2,
    'Delivered': Truck,
    'Returned': AlertCircle
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dental Cases</h1>
          <p className="text-zinc-500 mt-1">Track all active and completed restoration jobs.</p>
        </div>
        <Link 
          to="/new-case"
          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} className="mr-2" /> New Case
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder="Search patient or doctor..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <select 
            className="w-full pl-12 pr-10 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none font-bold text-zinc-700"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {['All', 'Pending', 'In Progress', 'Trial', 'Completed', 'Delivered', 'Returned'].map((f) => (
              <option key={f} value={f}>{f} Status</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-5 font-bold">Patient</th>
                <th className="px-6 py-5 font-bold">Doctor</th>
                <th className="px-6 py-5 font-bold">Type/Material</th>
                <th className="px-6 py-5 font-bold">Status</th>
                <th className="px-6 py-5 font-bold">Due Date</th>
                <th className="px-6 py-5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCases.map((c, i) => {
                const StatusIcon = statusIcons[c.status as keyof typeof statusIcons] || Clock;
                return (
                  <motion.tr 
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/cases/${c.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold mr-3">
                          {(c.patient_name || "P").charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{c.patient_name || "No Name"}</p>
                          <p className="text-xs text-zinc-400">
                            {c.patient_id ? `PID: ${c.patient_id}` : `ID: #${String(c.id).padStart(4, '0')}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-medium text-zinc-700">{c.doctor_name}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{c.case_type}</span>
                        <span className="text-xs text-zinc-500">{c.material} • Shade {c.shade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="relative group/status">
                        <select
                          disabled={updatingId === c.id}
                          value={c.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          className={`appearance-none pl-8 pr-8 py-1.5 rounded-full text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${statusColors[c.status as keyof typeof statusColors]} ${updatingId === c.id ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {['Pending', 'In Progress', 'Trial', 'Completed', 'Delivered', 'Returned'].map(status => (
                            <option key={status} value={status} className="bg-white text-zinc-900">{status}</option>
                          ))}
                        </select>
                        <StatusIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-zinc-600">
                        {c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 text-zinc-400 group-hover:text-emerald-500 transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
              {!loading && filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <Briefcase size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">No cases found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
