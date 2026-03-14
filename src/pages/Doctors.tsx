import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Search, Mail, Phone, MapPin, Building2, X, Save, 
  Trash2, Edit3, Camera, Upload, User, Stethoscope,
  FileText, Key, MessageCircle, CheckCircle2, Receipt
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Doctor } from "../types";
import { toast } from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

const INITIAL_DOCTOR_STATE = {
  name: "",
  clinic_name: "",
  phone: "",
  email: "",
  address: "",
  specialization: "",
  image_url: "",
  notes: "",
  portal_username: "",
  portal_password: ""
};

export default function Doctors() {
  const navigate = useNavigate();
  
  // Local state for doctors
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [viewingDoctor, setViewingDoctor] = useState<any>(null);
  const [formData, setFormData] = useState(INITIAL_DOCTOR_STATE);
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("All");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<any>(null);

  const fetchDoctors = async () => {
    try {
      const res = await fetch("/api/doctors", { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error("Failed to fetch doctors", err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleOpenModal = (doctor: any | null = null) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setFormData({
        name: doctor.name,
        clinic_name: doctor.clinic_name || "",
        phone: doctor.phone || "",
        email: doctor.email || "",
        address: doctor.address || "",
        specialization: doctor.specialization || "",
        image_url: doctor.image_url || "",
        notes: doctor.notes || "",
        portal_username: doctor.portal_username || "",
        portal_password: ""
      });
    } else {
      setEditingDoctor(null);
      setFormData(INITIAL_DOCTOR_STATE);
    }
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (doctor: any) => {
    setViewingDoctor(doctor);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDoctor) {
        const res = await fetch(`/api/doctors/${editingDoctor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: 'include'
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update doctor");
        }
        toast.success("Doctor updated successfully");
      } else {
        const res = await fetch("/api/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: 'include'
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create doctor");
        }
        toast.success("Doctor added successfully");
      }
      setIsModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      toast.error(err.message || "Failed to save doctor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doctor: any) => {
    setDoctorToDelete(doctor);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!doctorToDelete) return;
    try {
      const res = await fetch(`/api/doctors/${doctorToDelete.id}`, { 
        method: "DELETE",
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete doctor");
      }
      toast.success("Doctor deleted successfully");
      fetchDoctors();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete doctor");
    } finally {
      setDoctorToDelete(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.clinic_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.specialization && d.specialization.toLowerCase().includes(search.toLowerCase()));
    
    const matchesSpecialization = specializationFilter === "All" || d.specialization === specializationFilter;
    
    return matchesSearch && matchesSpecialization;
  });

  const specializations = ["All", ...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 font-sans">Doctor Profiles</h1>
          <p className="text-zinc-500 mt-1">Manage your dentist clients, their specializations, and contact details.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} className="mr-2" /> Add Doctor
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, clinic, or specialization..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans text-sm font-medium min-w-[160px]"
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
          >
            {specializations.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-1 flex">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-600")}
            >
              <Building2 size={20} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-3 rounded-xl transition-all", viewMode === 'table' ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-600")}
            >
              <FileText size={20} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor, i) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 hover:border-emerald-500/30 transition-all group relative overflow-hidden cursor-pointer"
              onClick={() => handleOpenViewModal(doctor)}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  {doctor.image_url ? (
                    <img 
                      src={doctor.image_url} 
                      alt={doctor.name} 
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-50 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 border-2 border-zinc-50">
                      <User size={32} />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                    <Stethoscope size={14} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-zinc-900 truncate">{doctor.name}</h3>
                  <p className="text-emerald-600 font-medium text-sm truncate">{doctor.clinic_name}</p>
                  {doctor.specialization && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                      {doctor.specialization}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-zinc-500 mb-6">
                <div className="flex items-center">
                  <Phone size={16} className="mr-3 text-zinc-400" /> {doctor.phone || 'No phone'}
                </div>
                <div className="flex items-center">
                  <Mail size={16} className="mr-3 text-zinc-400" /> {doctor.email || 'No email'}
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-3 text-zinc-400" /> {doctor.address || 'No address'}
                </div>
              </div>

              {doctor.portal_username && (
                <div className="mb-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Portal Access</p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">Enabled</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <User size={14} className="text-zinc-400" />
                    <span className="font-bold text-zinc-700">{doctor.portal_username}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-50" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => navigate(`/invoices?doctor_id=${doctor.id}`)}
                  className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-2"
                  title="Generate Invoice"
                >
                  <Receipt size={16} /> Invoice
                </button>
                <button 
                  onClick={() => navigate(`/doctors/${doctor.id}/ledger`)}
                  className="p-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors flex items-center gap-2"
                  title="Ledger"
                >
                  <FileText size={16} /> Ledger
                </button>
                <button 
                  onClick={() => handleOpenModal(doctor)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-xs hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10"
                  title="Edit Profile"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button 
                  onClick={() => window.open(`https://wa.me/${doctor.phone?.replace(/\D/g, '')}`, '_blank')}
                  className="p-2.5 bg-green-50 text-green-600 rounded-xl font-bold text-xs hover:bg-green-100 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(doctor)}
                  className="p-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors"
                  title="Delete Doctor"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Clinic</th>
                <th className="px-6 py-4">Specialization</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredDoctors.map((doctor) => (
                <tr 
                  key={doctor.id} 
                  className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                  onClick={() => handleOpenViewModal(doctor)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <User size={16} />
                      </div>
                      <span className="font-bold text-zinc-900">{doctor.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 font-medium">{doctor.clinic_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                      {doctor.specialization || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-500 space-y-1">
                      <p className="flex items-center gap-1.5"><Phone size={12} /> {doctor.phone}</p>
                      <p className="flex items-center gap-1.5"><Mail size={12} /> {doctor.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/doctors/${doctor.id}/ledger`)} 
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                      >
                        <FileText size={14} /> Ledger
                      </button>
                      <button onClick={() => handleOpenModal(doctor)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(doctor)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</h2>
                  <p className="text-sm text-zinc-500 mt-1">Enter the doctor's professional and contact details.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="relative group">
                      <div className={`w-32 h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden relative transition-all ${
                        formData.image_url ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 bg-zinc-50 hover:border-emerald-300'
                      }`}>
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera size={32} className="text-zinc-300 mb-2" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Photo</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleImageUpload}
                        />
                      </div>
                      {formData.image_url && (
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, image_url: ""})}
                          className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 rounded-full shadow-lg border border-zinc-100 hover:bg-red-50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Profile Image</p>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Clinic Name</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                        value={formData.clinic_name}
                        onChange={(e) => setFormData({...formData, clinic_name: e.target.value})}
                        placeholder="Smile Dental Clinic"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Specialization</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                        value={formData.specialization}
                        onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                        placeholder="Orthodontics, Implantology..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="doctor@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Address</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="123 Medical Center St."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans resize-none"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any relevant notes about the doctor..."
                  />
                </div>

                <div className="pt-6 border-t border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Key size={16} className="text-emerald-500" />
                    Portal Access (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                        value={formData.portal_username}
                        onChange={(e) => setFormData({...formData, portal_username: e.target.value})}
                        placeholder="doctor_username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        {editingDoctor && formData.portal_username ? "New Password (leave blank to keep current)" : "Password"}
                      </label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                        value={formData.portal_password}
                        onChange={(e) => setFormData({...formData, portal_password: e.target.value})}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-zinc-100 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-6 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center"
                  >
                    <Save size={20} className="mr-2" /> {editingDoctor ? "Update Doctor" : "Save Doctor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewModalOpen && viewingDoctor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    {viewingDoctor.image_url ? (
                      <img src={viewingDoctor.image_url} alt={viewingDoctor.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">{viewingDoctor.name}</h2>
                    <p className="text-emerald-600 font-medium">{viewingDoctor.clinic_name}</p>
                  </div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-zinc-600">
                          <Phone size={18} className="mr-3 text-zinc-400" /> {viewingDoctor.phone || 'N/A'}
                        </div>
                        <div className="flex items-center text-zinc-600">
                          <Mail size={18} className="mr-3 text-zinc-400" /> {viewingDoctor.email || 'N/A'}
                        </div>
                        <div className="flex items-center text-zinc-600">
                          <MapPin size={18} className="mr-3 text-zinc-400" /> {viewingDoctor.address || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Professional Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-zinc-600">
                          <Stethoscope size={18} className="mr-3 text-zinc-400" /> {viewingDoctor.specialization || 'General Dentistry'}
                        </div>
                        <div className="flex items-center text-zinc-600">
                          <Building2 size={18} className="mr-3 text-zinc-400" /> {viewingDoctor.clinic_name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Notes</h3>
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 min-h-[100px] text-sm text-zinc-600 whitespace-pre-wrap">
                        {viewingDoctor.notes || 'No notes available.'}
                      </div>
                    </div>

                    {viewingDoctor.portal_username && (
                      <div>
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Portal Access</h3>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-emerald-600" />
                            <span className="font-bold text-emerald-900">{viewingDoctor.portal_username}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md">Active</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-zinc-100">
                  <button 
                    onClick={() => {
                      setIsViewModalOpen(false);
                      navigate(`/doctors/${viewingDoctor.id}/ledger`);
                    }}
                    className="flex-1 px-6 py-4 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center"
                  >
                    <FileText size={20} className="mr-2" /> View Ledger
                  </button>
                  <button 
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleOpenModal(viewingDoctor);
                    }}
                    className="flex-1 px-6 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 flex items-center justify-center"
                  >
                    <Edit3 size={20} className="mr-2" /> Edit Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Doctor"
        message={`Are you sure you want to delete ${doctorToDelete?.name}? This action cannot be undone and will remove all associated records.`}
        confirmText="Delete Doctor"
      />
    </div>
  );
}
