import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  FileText, 
  Settings, 
  Bell, 
  ShieldAlert,
  Ghost,
  LogIn,
  LogOut,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import Dashboard from "./components/Dashboard";
import LiveFeed from "./components/LiveFeed";
import AttendanceList from "./components/AttendanceList";
import NotesGenerator from "./components/NotesGenerator";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firestore-utils";

type Tab = "dashboard" | "live" | "attendance" | "notes" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [studentsPresent, setStudentsPresent] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for Attendance
    const pathAttendance = "attendance";
    const qAttendance = query(collection(db, pathAttendance), orderBy("timestamp", "desc"));
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      const names = snapshot.docs.map(doc => doc.data().name);
      // Unique names for headcount
      setStudentsPresent([...new Set(names)]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, pathAttendance);
    });

    // Listen for Alerts
    const pathAlerts = "alerts";
    const qAlerts = query(collection(db, pathAlerts), orderBy("timestamp", "desc"), limit(10));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(alertData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, pathAlerts);
    });

    return () => {
      unsubAttendance();
      unsubAlerts();
    };
  }, [user]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === "auth/popup-blocked") {
        setLoginError("Popup blocked! Please allow popups for this site.");
      } else if (error.code === "auth/unauthorized-domain") {
        setLoginError("This domain is not authorized in Firebase Console.");
      } else {
        setLoginError("Sign-in failed. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0A0A0A] border border-[#141414] rounded-3xl p-12 text-center"
        >
          <div className="w-16 h-16 bg-[#F27D26] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(242,125,38,0.3)]">
            <Ghost className="text-black w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">GHOST</h1>
          <p className="text-[#8E9299] text-sm mb-8 uppercase tracking-[0.2em]">Classroom AI Sentinel</p>
          
          <button 
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-[#E4E3E0] transition-all disabled:opacity-50"
          >
            {loginLoading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            {loginLoading ? "Connecting..." : "Sign in with Google"}
          </button>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest"
            >
              {loginError}
            </motion.div>
          )}
          
          <p className="mt-8 text-[10px] text-[#444] uppercase tracking-widest leading-relaxed">
            Secure biometric monitoring system.<br />Authorized personnel only.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans selection:bg-[#F27D26] selection:text-black">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-[#141414] bg-[#0A0A0A] z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F27D26] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(242,125,38,0.3)]">
            <Ghost className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">GHOST</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8E9299]">Classroom AI</p>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
          />
          <NavItem 
            icon={<Video size={20} />} 
            label="Live Feed" 
            active={activeTab === "live"} 
            onClick={() => setActiveTab("live")} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Attendance" 
            active={activeTab === "attendance"} 
            onClick={() => setActiveTab("attendance")} 
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="AI Notes" 
            active={activeTab === "notes"} 
            onClick={() => setActiveTab("notes")} 
          />
          <div className="pt-8 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299]">System</p>
          </div>
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
          />
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-all mt-4"
          >
            <LogOut size={18} />
            <span className="text-xs font-medium tracking-wide">Logout</span>
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="absolute bottom-8 left-8 right-8 p-4 rounded-xl bg-[#141414] border border-[#1A1A1A]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium">System Online</span>
          </div>
          <div className="w-full bg-[#050505] h-1 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#F27D26]" 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8 min-h-screen">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-light tracking-tight capitalize">{activeTab.replace("-", " ")}</h2>
            <p className="text-xs text-[#8E9299] mt-1">Real-time monitoring and automation active.</p>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-1.5 rounded-full bg-[#141414] border border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors relative">
              <Bell size={18} />
              {alerts.length > 0 && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#F27D26] rounded-full border border-[#050505]" />
              )}
            </button>
            <div className="h-8 w-[1px] bg-[#141414]" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-medium">{user.displayName || "Admin"}</p>
                <p className="text-[9px] text-[#8E9299] uppercase tracking-wider">Superuser</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-[#1A1A1A]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F27D26] to-[#FF4444]" />
              )}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && <Dashboard alerts={alerts.map(a => a.message)} totalStudents={studentsPresent.length} />}
            {activeTab === "live" && <LiveFeed studentsPresent={studentsPresent} />}
            {activeTab === "attendance" && <AttendanceList />}
            {activeTab === "notes" && <NotesGenerator />}
            {activeTab === "settings" && (
              <div className="p-12 border border-dashed border-[#141414] rounded-3xl flex flex-col items-center justify-center text-center">
                <Settings className="w-12 h-12 text-[#141414] mb-4" />
                <h3 className="text-xl font-medium">System Configuration</h3>
                <p className="text-[#8E9299] max-w-md mt-2">Ghost Classroom AI is currently running in autonomous mode. Manual overrides are disabled for security.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
        active ? "bg-[#F27D26] text-black shadow-[0_4px_20px_rgba(242,125,38,0.2)]" : "text-[#8E9299] hover:bg-[#141414] hover:text-white"
      )}
    >
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {React.cloneElement(icon as React.ReactElement, { size: 18 } as any)}
      </span>
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </button>
  );
}
