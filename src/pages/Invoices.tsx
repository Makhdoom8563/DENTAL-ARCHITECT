import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Plus, Search, Filter, Download, Printer, CheckCircle, Clock, AlertCircle, ChevronRight, MoreVertical, X, MessageCircle, Receipt, Mail, ChevronUp, ChevronDown } from "lucide-react";
import { Invoice, Doctor, DentalCase } from "../types";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoiceNoFilter, setInvoiceNoFilter] = useState("");
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRemindConfirmModal, setShowRemindConfirmModal] = useState(false);
  const [remindType, setRemindType] = useState<'email' | 'whatsapp' | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<{ id: any, status: string } | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<any>(null);
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [availableCases, setAvailableCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'due_date', direction: 'desc' });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: "Cash",
    reference_no: "",
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });
  const [newInvoice, setNewInvoice] = useState({
    doctor_id: "" as any,
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(), 'yyyy-MM-dd'),
    items: [] as any[]
  });
  const [manualItem, setManualItem] = useState({ description: "", amount: 0 });

  const fetchData = async () => {
    try {
      const [invRes, docRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/doctors")
      ]);
      if (invRes.ok) setInvoices(await invRes.ok ? await invRes.json() : []);
      if (docRes.ok) setDoctors(await docRes.ok ? await docRes.json() : []);
    } catch (err) {
      console.error("Failed to fetch invoices data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check for doctor_id in URL to trigger new invoice modal
    const doctorId = searchParams.get('doctor_id');
    if (doctorId) {
      setNewInvoice(prev => ({ ...prev, doctor_id: doctorId }));
      setShowNewModal(true);
      // Clear the param so it doesn't re-open on refresh
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (selectedInvoiceId) {
      fetch(`/api/invoices/${selectedInvoiceId}`)
        .then(res => res.json())
        .then(data => setSelectedInvoice(data))
        .catch(err => console.error("Failed to fetch invoice details", err));
    } else {
      setSelectedInvoice(null);
    }
  }, [selectedInvoiceId]);

  useEffect(() => {
    if (newInvoice.doctor_id) {
      fetch(`/api/cases?doctor_id=${newInvoice.doctor_id}&uninvoiced=true`)
        .then(res => res.json())
        .then(data => setAvailableCases(data))
        .catch(err => console.error("Failed to fetch available cases", err));
    } else {
      setAvailableCases([]);
    }
  }, [newInvoice.doctor_id]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.doctor_id || newInvoice.items.length === 0) {
      toast.error("Please select a doctor and at least one case");
      return;
    }

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: newInvoice.doctor_id,
          invoice_date: newInvoice.invoice_date,
          due_date: newInvoice.due_date,
          items: newInvoice.items
        })
      });

      if (!res.ok) throw new Error("Failed to create invoice");

      toast.success("Invoice created successfully");
      setShowNewModal(false);
      setNewInvoice({
        doctor_id: "",
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(), 'yyyy-MM-dd'),
        items: []
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to create invoice");
    }
  };

  const handleUpdateStatus = async (id: any, status: string) => {
    setStatusToUpdate({ id, status });
    setShowConfirmModal(true);
  };

  const confirmUpdateStatus = async () => {
    if (!statusToUpdate) return;
    try {
      const res = await fetch(`/api/invoices/${statusToUpdate.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusToUpdate.status })
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success("Status updated");
      setShowConfirmModal(false);
      setStatusToUpdate(null);
      fetchData();
      if (selectedInvoiceId === statusToUpdate.id) {
        // Refresh details
        fetch(`/api/invoices/${selectedInvoiceId}`)
          .then(res => res.json())
          .then(data => setSelectedInvoice(data));
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/invoices/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status })
      });

      if (!res.ok) throw new Error("Bulk update failed");

      toast.success(`Updated ${selectedIds.length} invoices`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      toast.error("Bulk update failed");
    }
  };

  const handleBulkRemind = (type: 'email' | 'whatsapp') => {
    if (selectedIds.length === 0 && !selectedInvoiceId) return;
    
    const ids = selectedIds.length > 0 ? selectedIds : [selectedInvoiceId];
    setRemindType(type);
    setShowRemindConfirmModal(true);
  };

  const confirmBulkRemind = async () => {
    const ids = selectedIds.length > 0 ? selectedIds : [selectedInvoiceId];
    if (ids.length === 0 || !remindType) return;
    try {
      const res = await fetch("/api/invoices/bulk-remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });

      if (!res.ok) throw new Error("Failed to send reminders");

      toast.success(`${remindType === 'email' ? 'Email' : 'WhatsApp'} reminders sent to ${ids.length} doctors`);
      setSelectedIds([]);
      setShowRemindConfirmModal(false);
      setRemindType(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to send reminders");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentData,
          doctor_id: selectedInvoice.doctor_id,
          invoice_id: selectedInvoice.id
        })
      });

      if (!res.ok) throw new Error("Failed to record payment");

      toast.success("Payment recorded successfully");
      setShowPaymentModal(false);
      setPaymentData({
        amount: 0,
        payment_method: "Cash",
        reference_no: "",
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ""
      });
      fetchData();
      if (selectedInvoiceId) {
        fetch(`/api/invoices/${selectedInvoiceId}`)
          .then(res => res.json())
          .then(data => setSelectedInvoice(data));
      }
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleSendInvoice = async (inv: any, type: 'whatsapp' | 'email') => {
    const message = `Hello Dr. ${inv.doctor_name},\n\nThis is a reminder for Invoice #INV-${inv.invoice_no} for the amount of Rs ${inv.amount.toLocaleString()}.\n\nStatus: ${inv.status}\nDue Date: ${inv.due_date ? format(new Date(inv.due_date), 'MMM dd, yyyy') : 'N/A'}\n\nThank you!`;
    
    if (type === 'whatsapp') {
      const phone = inv.doctor_phone ? inv.doctor_phone.replace(/\D/g, '') : '';
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (type === 'email') {
      const subject = `Invoice INV-${inv.invoice_no} from Dental Architect`;
      const url = `mailto:${inv.doctor_email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }

    // Update reminder timestamp
    try {
      await fetch("/api/invoices/bulk-remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [inv.id] })
      });
      fetchData();
      if (selectedInvoiceId === inv.id) {
         fetch(`/api/invoices/${selectedInvoiceId}`)
          .then(res => res.json())
          .then(data => setSelectedInvoice(data));
      }
    } catch (err) {
      console.error("Failed to update reminder timestamp", err);
    }
    setOpenMenuId(null);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(inv => inv.id));
    }
  };

  const toggleSelect = (id: any) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const fetchInvoiceDetails = (id: any) => {
    setSelectedInvoiceId(id);
    setShowDetailsModal(true);
  };

  const handleSelectAllCases = () => {
    const allItems = availableCases.map((c: any) => ({
      case_id: c.id,
      description: `${c.case_type} - ${c.patient_name}`,
      amount: c.cost
    }));
    setNewInvoice({ ...newInvoice, items: allItems });
  };

  const handleDeselectAllCases = () => {
    setNewInvoice({ ...newInvoice, items: [] });
  };

  const filteredInvoices = invoices.filter((inv: any) => {
    const matchesSearch = inv.invoice_no.toString().includes(searchQuery) || 
                         inv.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    const matchesDoctor = doctorFilter === "All" || inv.doctor_id === doctorFilter;
    const matchesInvoiceNo = invoiceNoFilter === "" || inv.invoice_no.toString().includes(invoiceNoFilter);
    const matchesUnpaid = !showUnpaidOnly || inv.status !== "Paid";
    
    // Date range filtering
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(inv.created_at).getTime() >= new Date(startDate).getTime();
    }
    if (endDate) {
      // Add one day to end date to include the whole day
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(inv.created_at).getTime() <= endDateTime.getTime();
    }
    
    return matchesSearch && matchesStatus && matchesDoctor && matchesInvoiceNo && matchesUnpaid && matchesDate;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    let valA = a[key];
    let valB = b[key];

    if (key === 'due_date' || key === 'invoice_date') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const isPastDue = (dueDate: string, status: string) => {
    if (status === 'Paid') return false;
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  };

  const getStatusColor = (status: string, dueDate?: string) => {
    if (dueDate && isPastDue(dueDate, status)) {
      return 'bg-rose-100 text-rose-700 border-rose-200';
    }
    switch (status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <>
      <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Invoices</h1>
          <p className="text-zinc-500 mt-1">Manage billing and payments for doctors.</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} className="mr-2" /> Create Invoice
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-sm font-medium">Total Outstanding</span>
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            Rs {invoices.reduce((acc, inv) => inv.status !== 'Paid' ? acc + inv.amount : acc, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-sm font-medium">Paid This Month</span>
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            Rs {invoices.reduce((acc, inv) => inv.status === 'Paid' ? acc + inv.amount : acc, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-sm font-medium">Pending Invoices</span>
            <Clock size={20} className="text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {invoices.filter(inv => inv.status !== 'Paid').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text"
                placeholder="Search by invoice # or doctor..."
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['All', 'Unpaid', 'Partial', 'Paid'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                    statusFilter === status 
                      ? "bg-zinc-900 text-white border-zinc-900" 
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  {status}
                </button>
              ))}
              <button
                onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2",
                  showUnpaidOnly 
                    ? "bg-rose-50 text-rose-600 border-rose-200" 
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                <AlertCircle size={14} />
                Unpaid Only
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full flex gap-4">
              <select 
                className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm font-medium"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="All">All Doctors</option>
                {doctors.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input 
                  type="text"
                  placeholder="Inv #"
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                  value={invoiceNoFilter}
                  onChange={(e) => setInvoiceNoFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="date"
                className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
              />
              <span className="text-zinc-400 text-xs font-bold uppercase">to</span>
              <input 
                type="date"
                className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
              />
              {(startDate || endDate || doctorFilter !== "All" || statusFilter !== "All") && (
                <button 
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setDoctorFilter("All");
                    setStatusFilter("All");
                  }}
                  className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
                  title="Clear Filters"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="p-4 bg-zinc-900 text-white flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">{selectedIds.length} selected</span>
              <div className="h-4 w-px bg-zinc-700" />
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkStatus('Paid')}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-bold transition-colors"
                >
                  Mark as Paid
                </button>
                <button 
                  onClick={() => handleBulkRemind('email')}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Send Email Reminder
                </button>
                <button 
                  onClick={() => handleBulkRemind('whatsapp')}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Send WhatsApp Reminder
                </button>
              </div>
            </div>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors group"
                  onClick={() => handleSort('invoice_no')}
                >
                  <div className="flex items-center gap-1">
                    Invoice #
                    <div className="flex flex-col">
                      <ChevronUp size={10} className={cn(sortConfig?.key === 'invoice_no' && sortConfig.direction === 'asc' ? "text-emerald-500" : "text-zinc-300")} />
                      <ChevronDown size={10} className={cn(sortConfig?.key === 'invoice_no' && sortConfig.direction === 'desc' ? "text-emerald-500" : "text-zinc-300")} />
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4">Doctor</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors group"
                  onClick={() => handleSort('invoice_date')}
                >
                  <div className="flex items-center gap-1">
                    Invoice Date
                    <div className="flex flex-col">
                      <ChevronUp size={10} className={cn(sortConfig?.key === 'invoice_date' && sortConfig.direction === 'asc' ? "text-emerald-500" : "text-zinc-300")} />
                      <ChevronDown size={10} className={cn(sortConfig?.key === 'invoice_date' && sortConfig.direction === 'desc' ? "text-emerald-500" : "text-zinc-300")} />
                    </div>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors group"
                  onClick={() => handleSort('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Due Date
                    <div className="flex flex-col">
                      <ChevronUp size={10} className={cn(sortConfig?.key === 'due_date' && sortConfig.direction === 'asc' ? "text-emerald-500" : "text-zinc-300")} />
                      <ChevronDown size={10} className={cn(sortConfig?.key === 'due_date' && sortConfig.direction === 'desc' ? "text-emerald-500" : "text-zinc-300")} />
                    </div>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors group"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    <div className="flex flex-col">
                      <ChevronUp size={10} className={cn(sortConfig?.key === 'amount' && sortConfig.direction === 'asc' ? "text-emerald-500" : "text-zinc-300")} />
                      <ChevronDown size={10} className={cn(sortConfig?.key === 'amount' && sortConfig.direction === 'desc' ? "text-emerald-500" : "text-zinc-300")} />
                    </div>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors group"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <div className="flex flex-col">
                      <ChevronUp size={10} className={cn(sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? "text-emerald-500" : "text-zinc-300")} />
                      <ChevronDown size={10} className={cn(sortConfig?.key === 'status' && sortConfig.direction === 'desc' ? "text-emerald-500" : "text-zinc-300")} />
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4">Last Reminder</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredInvoices.map((inv: any) => (
                <tr key={inv.id} className={cn(
                  "hover:bg-zinc-50/50 transition-colors group",
                  selectedIds.includes(inv.id) && "bg-emerald-50/30"
                )}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                      checked={selectedIds.includes(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center font-bold text-zinc-900">
                      <FileText size={16} className="mr-2 text-zinc-400" />
                      {`INV-${inv.invoice_no}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 font-medium">{inv.doctor_name}</td>
                  <td className="px-6 py-4 text-zinc-500 text-sm">{inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM dd, yyyy') : format(new Date(inv.created_at), 'MMM dd, yyyy')}</td>
                  <td className="px-6 py-4 text-zinc-500 text-sm">{inv.due_date ? format(new Date(inv.due_date), 'MMM dd, yyyy') : '-'}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900">Rs {inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold border flex items-center w-fit gap-1", 
                      getStatusColor(inv.status, inv.due_date)
                    )}>
                      {inv.due_date && isPastDue(inv.due_date, inv.status) && <AlertCircle size={10} />}
                      {inv.status}
                      {inv.due_date && isPastDue(inv.due_date, inv.status) && " (Overdue)"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs font-medium">
                    {inv.last_reminder_sent_at ? format(new Date(inv.last_reminder_sent_at), 'MMM dd, h:mm a') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status !== 'Paid' && (
                        <div className="flex gap-1 mr-2">
                          <button 
                            onClick={() => handleSendInvoice(inv, 'whatsapp')}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle size={16} />
                          </button>
                          <button 
                            onClick={() => handleSendInvoice(inv, 'email')}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                            title="Send Email Reminder"
                          >
                            <Mail size={16} />
                          </button>
                        </div>
                      )}
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                          }}
                          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {openMenuId === inv.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenMenuId(null)}
                              />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-2 w-48 bg-white border border-zinc-100 rounded-xl shadow-xl z-20 py-2"
                              >
                                <button 
                                  onClick={() => fetchInvoiceDetails(inv.id)}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                                >
                                  <ChevronRight size={14} /> View Details
                                </button>
                                {inv.status !== 'Paid' && (
                                  <>
                                    <div className="h-px bg-zinc-100 my-1" />
                                    <button 
                                      onClick={() => handleSendInvoice(inv, 'whatsapp')}
                                      className="w-full px-4 py-2 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                    >
                                      <MessageCircle size={14} /> Send WhatsApp Reminder
                                    </button>
                                    <button 
                                      onClick={() => handleSendInvoice(inv, 'email')}
                                      className="w-full px-4 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                      <Mail size={14} /> Send Email Reminder
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <button 
                        onClick={() => fetchInvoiceDetails(inv.id)}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="p-12 text-center">
              <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-zinc-300" />
              </div>
              <p className="text-zinc-500 font-medium">No invoices found.</p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* New Invoice Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl font-bold text-zinc-900">Create New Invoice</h3>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateInvoice} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Select Doctor</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={newInvoice.doctor_id}
                      onChange={(e) => {
                        setNewInvoice({...newInvoice, doctor_id: e.target.value, items: []});
                      }}
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.clinic_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Invoice Date</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={newInvoice.invoice_date}
                      onChange={(e) => setNewInvoice({...newInvoice, invoice_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Due Date</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={newInvoice.due_date}
                      onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                      Select Cases to Invoice
                      <span className="text-[10px] text-zinc-400 font-normal">Only completed/delivered cases are listed</span>
                    </label>
                    {availableCases.length > 0 && (
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={handleSelectAllCases}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                        >
                          Select All
                        </button>
                        <span className="text-zinc-300">|</span>
                        <button 
                          type="button"
                          onClick={handleDeselectAllCases}
                          className="text-[10px] font-bold text-zinc-400 hover:text-zinc-500 uppercase tracking-wider"
                        >
                          Deselect
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {availableCases.length > 0 ? availableCases.map((c: any) => {
                      const isSelected = newInvoice.items.some(item => item.case_id === c.id);
                      return (
                        <div 
                          key={c.id}
                          onClick={() => {
                            if (isSelected) {
                              setNewInvoice({
                                ...newInvoice,
                                items: newInvoice.items.filter(item => item.case_id !== c.id)
                              });
                            } else {
                              setNewInvoice({
                                ...newInvoice,
                                items: [...newInvoice.items, {
                                  case_id: c.id,
                                  description: `${c.case_type} - ${c.patient_name}`,
                                  amount: c.cost
                                }]
                              });
                            }
                          }}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            isSelected ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-100 hover:border-zinc-200"
                          )}
                        >
                          <div>
                            <p className="font-bold text-zinc-900">{c.patient_name}</p>
                            <p className="text-xs text-zinc-500">{c.case_type} • {format(new Date(c.created_at), 'MMM dd')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-900">Rs {c.cost.toLocaleString()}</p>
                            <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                              isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-300"
                            )}>
                              {isSelected && <CheckCircle size={14} />}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                        <p className="text-sm text-zinc-400 italic">No billable cases found for this doctor.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-zinc-700">Manual Items</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Description"
                      className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                      value={manualItem.description}
                      onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })}
                    />
                    <input 
                      type="number"
                      placeholder="Amount"
                      className="w-24 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                      value={manualItem.amount || ""}
                      onChange={(e) => setManualItem({ ...manualItem, amount: parseFloat(e.target.value) })}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (!manualItem.description || manualItem.amount <= 0) return;
                        setNewInvoice({
                          ...newInvoice,
                          items: [...newInvoice.items, {
                            description: manualItem.description,
                            amount: manualItem.amount
                          }]
                        });
                        setManualItem({ description: "", amount: 0 });
                      }}
                      className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  {newInvoice.items.filter(i => !i.case_id).length > 0 && (
                    <div className="space-y-2">
                      {newInvoice.items.filter(i => !i.case_id).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <span className="text-sm font-medium text-zinc-700">{item.description}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-zinc-900">Rs {item.amount.toLocaleString()}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                setNewInvoice({
                                  ...newInvoice,
                                  items: newInvoice.items.filter((_, i) => i !== newInvoice.items.indexOf(item))
                                });
                              }}
                              className="text-rose-500 hover:text-rose-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Amount</p>
                    <p className="text-2xl font-black text-zinc-900">
                      Rs {newInvoice.items.reduce((acc, item) => acc + item.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowNewModal(false)}
                      className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={newInvoice.items.length === 0}
                      className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Invoice
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Invoice {`INV-${selectedInvoice.invoice_no}`}</h3>
                  <p className="text-xs text-zinc-500 mt-1">Created on {format(new Date(selectedInvoice.created_at), 'MMMM dd, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInvoice.status !== 'Paid' && (
                    <>
                      <button 
                        onClick={() => handleSendInvoice(selectedInvoice, 'whatsapp')}
                        className="p-2 hover:bg-green-100 text-green-600 rounded-full transition-colors" 
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleSendInvoice(selectedInvoice, 'email')}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-full transition-colors" 
                        title="Send Email Reminder"
                      >
                        <Mail size={20} />
                      </button>
                    </>
                  )}
                  <button className="p-2 hover:bg-zinc-200 rounded-full transition-colors" title="Print">
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Billed To</p>
                    <p className="font-bold text-zinc-900 text-lg">{selectedInvoice.doctor_name}</p>
                    <p className="text-zinc-600">{selectedInvoice.clinic_name}</p>
                    <p className="text-zinc-500 text-sm mt-1">{selectedInvoice.address}</p>
                    <p className="text-zinc-500 text-sm">{selectedInvoice.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Invoice Status</p>
                    <div className="flex justify-end mb-4">
                      <select 
                        value={selectedInvoice.status}
                        onChange={(e) => handleUpdateStatus(selectedInvoice.id, e.target.value)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold border focus:outline-none transition-all",
                          getStatusColor(selectedInvoice.status, selectedInvoice.due_date)
                        )}
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Due Date</p>
                    <p className="font-bold text-zinc-900 mb-4">{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'MMM dd, yyyy') : '-'}</p>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Last Reminder</p>
                    <p className="font-bold text-zinc-900">{selectedInvoice.last_reminder_sent_at ? format(new Date(selectedInvoice.last_reminder_sent_at), 'MMM dd, yyyy h:mm a') : 'Never'}</p>
                  </div>
                </div>

                <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {selectedInvoice.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4">
                            <p className="font-bold text-zinc-900">{item.description}</p>
                            <p className="text-[10px] text-zinc-400">Case ID: #{item.case_id?.toString().substring(0, 4).toUpperCase()}</p>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-zinc-900">
                            Rs {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-50/50">
                        <td className="px-6 py-4 font-bold text-zinc-900">Total</td>
                        <td className="px-6 py-4 text-right text-xl font-black text-emerald-600">
                          Rs {selectedInvoice.amount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-2">
                  {selectedInvoice.status !== 'Paid' && (
                    <>
                      <button 
                        onClick={() => {
                          setPaymentData({
                            ...paymentData,
                            amount: selectedInvoice.amount - (selectedInvoice.total_paid || 0)
                          });
                          setShowPaymentModal(true);
                        }}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                      >
                        <CheckCircle size={18} /> Record Payment
                      </button>
                      <button 
                        onClick={() => handleSendInvoice(selectedInvoice, 'whatsapp')}
                        className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center gap-2"
                      >
                        <MessageCircle size={18} /> WhatsApp
                      </button>
                      <button 
                        onClick={() => handleSendInvoice(selectedInvoice, 'email')}
                        className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
                      >
                        <Mail size={18} /> Email
                      </button>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6"
            >
              <div className="flex items-center gap-4 mb-4 text-amber-500">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">Confirm Status Change</h3>
              </div>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to change the status of this invoice to <span className="font-bold text-zinc-900">{statusToUpdate?.status}</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setStatusToUpdate(null);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUpdateStatus}
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl font-bold text-zinc-900">Record Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Amount Received</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">Rs</span>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      className="w-full pl-20 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">Remaining balance: Rs {(selectedInvoice.amount - (selectedInvoice.total_paid || 0)).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Method</label>
                    <select 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Date</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Reference #</label>
                  <input 
                    type="text"
                    placeholder="Check # or Transaction ID"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={paymentData.reference_no}
                    onChange={(e) => setPaymentData({...paymentData, reference_no: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Notes</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none h-20"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Save Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reminder Confirmation Modal */}
      <AnimatePresence>
        {showRemindConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6"
            >
              <div className="flex items-center gap-4 mb-4 text-emerald-500">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <MessageCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">Send Reminders</h3>
              </div>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to send {remindType === 'email' ? 'Email' : 'WhatsApp'} reminders to <span className="font-bold text-zinc-900">{selectedIds.length}</span> selected doctor(s)?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowRemindConfirmModal(false);
                    setRemindType(null);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmBulkRemind}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
