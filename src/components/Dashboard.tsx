import React from "react";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

const data = [
  { name: "08:00", value: 12 },
  { name: "09:00", value: 24 },
  { name: "10:00", value: 32 },
  { name: "11:00", value: 28 },
  { name: "12:00", value: 15 },
  { name: "13:00", value: 35 },
  { name: "14:00", value: 38 },
];

export default function Dashboard({ alerts, totalStudents }: { alerts: string[], totalStudents: number }) {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="text-emerald-500" />} 
          label="Total Students" 
          value={totalStudents.toString()} 
          trend="+12% from yesterday"
        />
        <StatCard 
          icon={<Clock className="text-blue-500" />} 
          label="Avg. Attendance" 
          value="94%" 
          trend="Stable"
        />
        <StatCard 
          icon={<Activity className="text-[#F27D26]" />} 
          label="Attention Level" 
          value="78%" 
          trend="-2% this hour"
        />
        <StatCard 
          icon={<AlertTriangle className="text-red-500" />} 
          label="Active Alerts" 
          value={alerts.length.toString()} 
          trend="Monitoring active"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0A0A0A] border border-[#141414] shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Attendance Trends</h3>
            <button className="text-[10px] uppercase tracking-widest text-[#8E9299] hover:text-white flex items-center gap-2">
              View Full Report <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F27D26" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#141414" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#333" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#333" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #141414", borderRadius: "12px" }}
                  itemStyle={{ color: "#F27D26" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#F27D26" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-[#141414] shadow-2xl">
          <h3 className="text-lg font-medium mb-6">System Alerts</h3>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-20">
                <ShieldAlert size={48} />
                <p className="mt-4 text-sm">No active threats detected.</p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#141414] border border-[#1A1A1A] animate-in slide-in-from-right-4 duration-300">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{alert}</p>
                    <p className="text-[9px] text-[#8E9299] mt-1 uppercase tracking-widest">Just now</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-[#141414] shadow-2xl hover:border-[#F27D26]/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-[#141414] border border-[#1A1A1A] group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <TrendingUp size={14} className="text-[#8E9299] opacity-20" />
      </div>
      <p className="text-[10px] text-[#8E9299] font-medium tracking-wide uppercase">{label}</p>
      <h4 className="text-3xl font-light mt-1 tracking-tight">{value}</h4>
      <p className="text-[9px] text-[#8E9299] mt-3 uppercase tracking-widest">{trend}</p>
    </div>
  );
}
