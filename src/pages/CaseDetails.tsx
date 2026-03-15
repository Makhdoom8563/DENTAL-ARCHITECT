import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, Clock, CheckCircle2, Truck, AlertCircle, 
  History, MessageSquare, Save, Edit3, Wand2, Sparkles, 
  Download, Share2, Trash2, X, Send, Loader2, Camera,
  Copy, Printer, PlusCircle, MessageCircle
} from "lucide-react";
import { DentalCase, CaseHistory, CaseTask, Technician } from "../types";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { GoogleGenAI } from "@google/genai";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [dentalCase, setDentalCase] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskConfirmModal, setShowTaskConfirmModal] = useState(false);
  const [pendingTaskUpdate, setPendingTaskUpdate] = useState<{ id: any, status: string } | null>(null);
  const [newTask, setNewTask] = useState({ task_name: "", technician_id: "" });
  const [updateData, setUpdateData] = useState({ status: "", comment: "" });
  
  // AI Image Editing State
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchData = async () => {
    try {
      const [caseRes, historyRes, tasksRes, techRes] = await Promise.all([
        fetch(`/api/cases/${id}`),
        fetch(`/api/cases/${id}/history`),
        fetch(`/api/cases/${id}/tasks`),
        fetch(`/api/technicians`)
      ]);

      if (caseRes.ok) {
        const data = await caseRes.json();
        
        // Security check for doctors
        const storedDoctor = localStorage.getItem("doctor_user");
        if (storedDoctor) {
          const doctorUser = JSON.parse(storedDoctor);
          if (doctorUser.role === 'Doctor' && String(doctorUser.doctor_id) !== String(data.doctor_id)) {
            toast.error("Access denied");
            navigate("/doctor-portal");
            return;
          }
        }

        setDentalCase(data);
        setUpdateData({ status: data.status, comment: "" });
      }
      if (historyRes.ok) setHistory(await historyRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (techRes.ok) setTechnicians(await techRes.json());
    } catch (err) {
      console.error("Failed to fetch case details", err);
      toast.error("Failed to load case details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.task_name || !newTask.technician_id) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      const res = await fetch(`/api/cases/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technician_id: newTask.technician_id,
          task_name: newTask.task_name,
          status: "Pending"
        })
      });

      if (!res.ok) throw new Error("Failed to add task");
      
      toast.success("Task added");
      setShowTaskModal(false);
      setNewTask({ task_name: "", technician_id: "" });
      fetchData(); // Refresh data
    } catch (err) {
      toast.error("Failed to add task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: any, status: string) => {
    if (status === 'Completed') {
      setPendingTaskUpdate({ id: taskId, status });
      setShowTaskConfirmModal(true);
      return;
    }
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Failed to update task");

      toast.success("Task updated");
      fetchData(); // Refresh data
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const confirmTaskUpdate = async () => {
    if (!pendingTaskUpdate) return;
    try {
      const res = await fetch(`/api/tasks/${pendingTaskUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingTaskUpdate.status })
      });

      if (!res.ok) throw new Error("Failed to update task");

      toast.success("Task completed!");
      setShowTaskConfirmModal(false);
      setPendingTaskUpdate(null);
      fetchData(); // Refresh data
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ status: string, comment: string } | null>(null);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateData.status === 'Completed') {
      setPendingStatusUpdate({ status: updateData.status, comment: updateData.comment });
      setShowStatusConfirmModal(true);
      return;
    }
    await performStatusUpdate(updateData.status, updateData.comment);
  };

  const performStatusUpdate = async (status: string, comment: string) => {
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment })
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success("Status updated");
      setIsUpdating(false);
      setShowStatusConfirmModal(false);
      setPendingStatusUpdate(null);
      fetchData(); // Refresh data
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleAiEdit = async () => {
    if (!aiPrompt || !dentalCase?.image_url) return;
    
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Extract base64 data from data URL
      const base64Data = dentalCase.image_url.split(',')[1];
      const mimeType = dentalCase.image_url.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Please edit this dental restoration image based on this request: ${aiPrompt}. Return the edited image.`,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setEditedImage(newImageUrl);
          foundImage = true;
          toast.success("AI Edit complete!");
          break;
        }
      }
      
      if (!foundImage) {
        toast.error("AI didn't return an image. Try a different prompt.");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI processing failed. Please try again.");
    } finally {
      setIsAiProcessing(false);
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

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Case link copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !dentalCase) return <div className="flex items-center justify-center h-64">Loading...</div>;

  const isDoctor = user?.role === 'Doctor';

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate(isDoctor ? "/doctor-portal" : "/cases")} className="p-2 hover:bg-zinc-100 rounded-full mr-4 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900">{dentalCase.patient_name || "No Name"}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[dentalCase.status as keyof typeof statusColors]}`}>
                {dentalCase.status}
              </span>
            </div>
            <p className="text-zinc-500 mt-1">
              {dentalCase.patient_id ? `PID: ${dentalCase.patient_id}` : `Case #${dentalCase.id.toString().substring(0, 4).toUpperCase()}`} • {dentalCase.doctor_name}
            </p>
          </div>
        </div>
        {!isDoctor && (
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="p-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm"
              title="Print Case"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={handleShare}
              className="p-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm"
              title="Share Case Link"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={() => {
                const text = `Hello Doctor, here is the status for patient ${dentalCase.patient_name}: ${dentalCase.status}. View details here: ${window.location.href}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-xl hover:bg-green-100 transition-colors shadow-sm"
              title="Share via WhatsApp"
            >
              <MessageCircle size={20} />
            </button>
            <button 
              onClick={() => setIsUpdating(true)}
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Edit3 size={20} className="mr-2" /> Update Status
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Case Details Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="p-8 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <AlertCircle size={20} className="mr-2 text-emerald-500" /> Specifications
              </h2>
            </div>
            <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Type</p>
                <p className="font-bold text-zinc-900">{dentalCase.case_type}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Material</p>
                <p className="font-bold text-zinc-900">{dentalCase.material}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Shade</p>
                <p className="font-bold text-zinc-900">{dentalCase.shade}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Prep Type</p>
                <p className="font-bold text-zinc-900">{dentalCase.preparation_type || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Priority</p>
                <p className={cn(
                  "font-bold",
                  dentalCase.priority === 'Urgent' ? 'text-rose-600' : 
                  dentalCase.priority === 'High' ? 'text-amber-600' : 'text-zinc-900'
                )}>{dentalCase.priority}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Technician</p>
                <p className="font-bold text-zinc-900">{dentalCase.technician_name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Received</p>
                <p className="font-bold text-zinc-900">{format(new Date(dentalCase.receiving_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Due Date</p>
                <p className="font-bold text-emerald-600">{format(new Date(dentalCase.due_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Cost</p>
                <p className="font-bold text-zinc-900">Rs {(dentalCase.cost || 0).toLocaleString()}</p>
              </div>
            </div>
            {dentalCase.selected_teeth && (
              <div className="px-8 pb-8">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Selected Teeth</p>
                <div className="flex flex-wrap gap-2">
                  {dentalCase.selected_teeth.split(',').map(num => (
                    <span key={num} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                      Tooth {num}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="p-8 border-t border-zinc-100">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 italic">
                {dentalCase.notes || "No additional notes provided."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Image Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden h-full">
            <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center">
                <Camera size={20} className="mr-2 text-emerald-500" /> Case Imagery
              </h2>
              {dentalCase.image_url && (
                <button 
                  onClick={() => setIsAiEditing(true)}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center bg-emerald-50 px-4 py-2 rounded-xl transition-colors"
                >
                  <Sparkles size={16} className="mr-2" /> AI Edit
                </button>
              )}
            </div>
            <div className="p-8">
              {dentalCase.image_url ? (
                <div className="relative group">
                  <img 
                    src={editedImage || dentalCase.image_url} 
                    alt="Case" 
                    className="w-full h-auto rounded-2xl shadow-lg border border-zinc-200"
                  />
                  {editedImage && (
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-black/60 backdrop-blur-md p-3 rounded-xl text-white">
                      <span className="text-xs font-bold flex items-center"><Sparkles size={14} className="mr-2 text-emerald-400" /> AI Edited Version</span>
                      <button 
                        onClick={() => setEditedImage(null)}
                        className="text-xs font-bold hover:text-emerald-400 transition-colors"
                      >
                        Reset to Original
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
                  <Camera size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">No image uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Case Tasks Section */}
        {!isDoctor && (
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center">
                <CheckCircle2 size={24} className="mr-3 text-emerald-500" /> Production Tasks
              </h2>
              <button 
                onClick={() => setShowTaskModal(true)}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center bg-emerald-50 px-4 py-2 rounded-xl transition-colors"
              >
                <PlusCircle size={16} className="mr-2" /> Add Task
              </button>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {tasks.length > 0 ? tasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div>
                      <p className="font-bold text-zinc-900">{task.task_name}</p>
                      <p className="text-xs text-zinc-500">Assigned to: {task.technician_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none transition-all",
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-zinc-100 text-zinc-600 border-zinc-200'
                        )}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <p className="text-zinc-400 text-sm italic">No tasks added yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dedicated History Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center">
              <History size={24} className="mr-3 text-emerald-500" /> Case Progress History
            </h2>
            <div className="text-sm font-medium text-zinc-500">
              {history.length} updates recorded
            </div>
          </div>
          <div className="p-8 h-[400px] overflow-y-auto">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-zinc-100" />
              
              <div className="space-y-8">
                {history.map((item: any, i) => {
                  const isLatest = i === 0;
                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative pl-12"
                    >
                      {/* Dot */}
                      <div className={cn(
                        "absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10",
                        item.status === 'Completed' ? 'bg-emerald-500' :
                        item.status === 'In Progress' ? 'bg-blue-500' :
                        item.status === 'Delivered' ? 'bg-purple-500' :
                        item.status === 'Trial' ? 'bg-indigo-500' :
                        item.status === 'Returned' ? 'bg-rose-500' :
                        'bg-amber-500'
                      )}>
                        {item.status === 'Completed' && <CheckCircle2 size={14} className="text-white" />}
                        {item.status === 'In Progress' && <Clock size={14} className="text-white" />}
                        {item.status === 'Delivered' && <Truck size={14} className="text-white" />}
                        {item.status === 'Trial' && <History size={14} className="text-white" />}
                        {item.status === 'Returned' && <AlertCircle size={14} className="text-white" />}
                        {item.status === 'Pending' && <AlertCircle size={14} className="text-white" />}
                      </div>

                      <div className={cn(
                        "p-4 rounded-2xl border transition-all",
                        isLatest ? "bg-emerald-50/30 border-emerald-100 shadow-sm" : "bg-white border-zinc-100"
                      )}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                              item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              item.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              'bg-amber-100 text-amber-700 border-amber-200'
                            )}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-zinc-400 flex items-center">
                            {format(new Date(item.updated_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed italic">
                          "{item.comment || `Status updated to ${item.status}.`}"
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">Add Production Task</h2>
                <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Task Name</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={newTask.task_name}
                    onChange={(e) => setNewTask({...newTask, task_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Assign Technician</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={newTask.technician_id}
                    onChange={(e) => setNewTask({...newTask, technician_id: e.target.value})}
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isUpdating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">Update Status</h2>
                <button onClick={() => setIsUpdating(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateStatus} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">New Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Pending', 'In Progress', 'Trial', 'Completed', 'Delivered', 'Returned'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setUpdateData({...updateData, status: s})}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                          updateData.status === s 
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                            : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-emerald-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Comment</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-24 resize-none"
                    value={updateData.comment}
                    onChange={(e) => setUpdateData({...updateData, comment: e.target.value})}
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsUpdating(false)}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Edit Modal */}
      <AnimatePresence>
        {showStatusConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Complete Case?</h3>
                <p className="text-zinc-500 text-sm mb-6">Are you sure you want to mark this entire case as completed? This will move it to the completed cases list.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowStatusConfirmModal(false);
                      setPendingStatusUpdate(null);
                    }}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => pendingStatusUpdate && performStatusUpdate(pendingStatusUpdate.status, pendingStatusUpdate.comment)}
                    className="flex-1 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Yes, Complete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showTaskConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Complete Task?</h3>
                <p className="text-zinc-500 text-sm mb-6">Are you sure you want to mark this task as completed? This action will notify the lab manager.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowTaskConfirmModal(false);
                      setPendingTaskUpdate(null);
                      fetchData(); // Reset select
                    }}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmTaskUpdate}
                    className="flex-1 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Yes, Complete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isAiEditing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-emerald-50/50">
                <h2 className="text-xl font-bold text-zinc-900 flex items-center">
                  <Sparkles size={20} className="mr-2 text-emerald-500" /> AI Image Assistant
                </h2>
                <button onClick={() => setIsAiEditing(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden relative border border-zinc-800">
                  <img src={dentalCase.image_url} alt="Original" className="w-full h-full object-contain opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white/60 text-xs font-medium px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
                      Previewing Original Image
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">What would you like to do?</label>
                    <div className="relative">
                      <textarea 
                        className="w-full pl-4 pr-12 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-32 resize-none text-sm"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={isAiProcessing}
                      />
                      <div className="absolute right-4 bottom-4">
                        <Wand2 size={20} className="text-emerald-500 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {['Add retro filter', 'Increase brightness', 'Sharpen details', 'Add red annotation'].map(p => (
                      <button 
                        key={p}
                        onClick={() => setAiPrompt(p)}
                        className="text-[10px] font-bold px-3 py-1.5 bg-zinc-100 text-zinc-500 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors border border-transparent hover:border-emerald-100"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsAiEditing(false)}
                    className="flex-1 px-6 py-4 bg-zinc-100 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAiEdit}
                    disabled={isAiProcessing || !aiPrompt}
                    className="flex-[2] px-6 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 size={20} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} className="mr-2" />
                        Apply AI Edit
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
