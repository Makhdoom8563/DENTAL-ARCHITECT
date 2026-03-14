import React, { useState } from "react";
import { motion } from "motion/react";
import { PlusCircle, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const user = await response.json();
        if (user.role === 'Doctor') {
          toast.error("Please use the Doctor Portal to log in");
          setLoading(false);
          return;
        }
        localStorage.setItem("user", JSON.stringify(user));
        onLogin(user);
        toast.success(`Welcome back, ${user.username}!`);
      } else {
        toast.error("Invalid username or password");
      }
    } catch (err) {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-[2rem] text-white shadow-2xl shadow-emerald-500/40 mb-6"
          >
            <PlusCircle size={40} />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            DENTAL<span className="text-emerald-500">ARCHITECT</span>
          </h1>
          <p className="text-zinc-500 font-medium">Dental Lab Management System v1.0</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white">Staff Login</h2>
            <p className="text-sm text-zinc-400 mt-1">Enter your credentials to access the lab dashboard.</p>
            <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">Default Credentials</p>
              <p className="text-sm text-zinc-300">User: <span className="text-white font-mono">admin</span></p>
              <p className="text-sm text-zinc-300">Pass: <span className="text-white font-mono">admin123</span></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  required
                  type="text" 
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  placeholder=""
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  required
                  type="password" 
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center group disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-2 text-zinc-500 text-xs">
            <ShieldCheck size={14} />
            Secure Enterprise Connection
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-600 text-sm">
            Are you a doctor? <a href="/doctor-portal" className="text-emerald-500 font-bold hover:underline">Go to Doctor Portal</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
