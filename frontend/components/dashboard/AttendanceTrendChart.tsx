"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Users, UserCheck } from "lucide-react";
import { AttendanceTrendItem } from "@/lib/api/dashboard";

interface AttendanceTrendChartProps {
  data: AttendanceTrendItem[];
  isLoading?: boolean;
}

export function AttendanceTrendChart({
  data,
  isLoading = false,
}: AttendanceTrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading workforce attendance logs...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <Users className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Attendance Logged
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          No labour attendance was marked for this date range. Mark daily worker attendance in Labour Management to track manpower.
        </p>
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const present = payload.find((p: any) => p.dataKey === "present_count")?.value || 0;
      const absent = payload.find((p: any) => p.dataKey === "absent_count")?.value || 0;
      const halfDay = payload.find((p: any) => p.dataKey === "half_day_count")?.value || 0;
      const hours = payload[0]?.payload?.total_hours_worked || 0;
      return (
        <div className="bg-white p-3 border border-earth-200 rounded-xl shadow-lg text-xs space-y-1">
          <p className="font-semibold text-earth-900 border-b border-earth-100 pb-1">{label}</p>
          <p className="text-emerald-700 flex justify-between gap-4">
            <span>Present:</span>
            <span className="font-semibold">{present} Workers</span>
          </p>
          <p className="text-amber-600 flex justify-between gap-4">
            <span>Half Day:</span>
            <span className="font-semibold">{halfDay} Workers</span>
          </p>
          <p className="text-rose-600 flex justify-between gap-4">
            <span>Absent:</span>
            <span className="font-semibold">{absent} Workers</span>
          </p>
          <p className="text-sky-700 pt-1 border-t border-earth-100 flex justify-between gap-4 font-semibold">
            <span>Hours Logged:</span>
            <span>{hours} hrs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const totalPresent = data.reduce((acc, curr) => acc + curr.present_count, 0);
  const totalHours = data.reduce((acc, curr) => acc + curr.total_hours_worked, 0);

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="formatted_date"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={customTooltip} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => {
                const labels: Record<string, string> = {
                  present_count: "Present",
                  half_day_count: "Half Day",
                  absent_count: "Absent",
                };
                return (
                  <span className="text-xs font-medium text-earth-700">
                    {labels[value] || value}
                  </span>
                );
              }}
            />
            <Bar
              dataKey="present_count"
              name="present_count"
              stackId="a"
              fill="#10b981"
              radius={[0, 0, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="half_day_count"
              name="half_day_count"
              stackId="a"
              fill="#f59e0b"
              radius={[0, 0, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="absent_count"
              name="absent_count"
              stackId="a"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-earth-100 pt-3 text-xs text-earth-600">
        <div className="flex items-center gap-1.5 font-medium">
          <UserCheck className="h-4 w-4 text-emerald-600" />
          <span>Workforce Total:</span>
          <span className="font-semibold text-earth-900">{totalPresent} Person-Days ({totalHours.toFixed(1)} hrs)</span>
        </div>
        <span className="text-[11px] text-earth-500">
          Showing daily muster roll logs
        </span>
      </div>
    </div>
  );
}

export default AttendanceTrendChart;
