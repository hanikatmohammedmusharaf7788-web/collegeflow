import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export default function AttendanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={206}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6985fa" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6985fa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 5" />
        <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} interval={0} />
        <YAxis domain={[50, 100]} ticks={[50, 60, 70, 80, 90, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 12 }} />
        <Area type="monotone" dataKey="attendance" stroke="#6985fa" strokeWidth={2.5} fill="url(#attendanceFill)" activeDot={{ r: 5, fill: "#fff", stroke: "#6985fa", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
