import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  MoreVertical,
  UserCheck,
  Clock,
  Calendar
} from "lucide-react";
import { cn } from "../lib/utils";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

interface Attendance {
  name: string;
  date: string;
  time: string;
  status: string;
}

export default function AttendanceList() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Attendance);
      setAttendance(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (AttendanceList):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 bg-[#141414] border border-[#1A1A1A] px-3 py-1.5 rounded-xl w-80">
          <Search size={16} className="text-[#8E9299]" />
          <input 
            type="text" 
            placeholder="Search students..." 
            className="bg-transparent border-none focus:outline-none text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#1A1A1A] text-xs hover:bg-[#1A1A1A] transition-colors">
            <Filter size={14} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F27D26] text-black text-xs font-medium hover:bg-[#F27D26]/90 transition-colors">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0A0A0A] border border-[#141414] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-[#141414] bg-[#141414]/20">
              <th className="p-4 text-[9px] uppercase tracking-widest text-[#8E9299] font-medium">Student Name</th>
              <th className="p-4 text-[9px] uppercase tracking-widest text-[#8E9299] font-medium">Date</th>
              <th className="p-4 text-[9px] uppercase tracking-widest text-[#8E9299] font-medium">Time</th>
              <th className="p-4 text-[9px] uppercase tracking-widest text-[#8E9299] font-medium">Status</th>
              <th className="p-4 text-[9px] uppercase tracking-widest text-[#8E9299] font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[#8E9299]">Loading attendance records...</td>
              </tr>
            ) : attendance.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[#8E9299]">No records found. Start the live feed to mark attendance.</td>
              </tr>
            ) : (
              attendance.map((record, i) => (
                <tr key={i} className="hover:bg-[#141414]/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#1A1A1A] flex items-center justify-center">
                        <Users size={14} className="text-[#F27D26]" />
                      </div>
                      <span className="text-xs font-medium">{record.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[11px] text-[#8E9299]">
                      <Calendar size={12} />
                      {record.date}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[11px] text-[#8E9299]">
                      <Clock size={12} />
                      {record.time}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase tracking-widest">
                      <UserCheck size={10} />
                      {record.status}
                    </div>
                  </td>
                  <td className="p-4">
                    <button className="p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors text-[#8E9299]">
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
