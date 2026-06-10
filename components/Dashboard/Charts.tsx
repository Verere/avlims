"use client";
import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

const revenueData = [
  { date: "Mon", revenue: 20000 },
  { date: "Tue", revenue: 30000 },
  { date: "Wed", revenue: 25000 },
  { date: "Thu", revenue: 40000 },
  { date: "Fri", revenue: 35000 },
  { date: "Sat", revenue: 20000 },
  { date: "Sun", revenue: 15000 },
];

const testDistData = [
  { category: "Hematology", value: 24 },
  { category: "Biochemistry", value: 18 },
  { category: "Microbiology", value: 12 },
  { category: "Immunology", value: 8 },
  { category: "Others", value: 6 },
];

const COLORS = ["#6366f1", "#22d3ee", "#34d399", "#fbbf24", "#f87171"];

export default function Charts() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Revenue Line Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-2">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueData}>
            <XAxis dataKey="date" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Test Distribution Pie Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-2">Test Distribution</h2>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={testDistData}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label
            >
              {testDistData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
