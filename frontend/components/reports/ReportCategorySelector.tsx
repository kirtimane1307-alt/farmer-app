"use client";

import React from "react";
import { ReportCategoryKey } from "@/types";
import {
  Tractor,
  Wheat,
  Users,
  CalendarCheck,
  CreditCard,
  FlaskConical,
  Droplets,
  Receipt,
  Wrench,
  Package,
  TrendingUp,
  FileBarChart,
  LucideIcon,
} from "lucide-react";

export interface CategoryItem {
  key: ReportCategoryKey;
  title: string;
  shortDesc: string;
  icon: LucideIcon;
  group: "operations" | "workforce" | "finance";
  badge?: string;
}

export const REPORT_CATEGORIES_CONFIG: CategoryItem[] = [
  // Agricultural Operations
  {
    key: "farm_summary",
    title: "Farm Summary Report",
    shortDesc: "Land area, cultivated plots, crop distribution, and farm-level activities overview.",
    icon: Tractor,
    group: "operations",
  },
  {
    key: "crop",
    title: "Crop Cultivation & Harvest",
    shortDesc: "Varieties, sowing timelines, growth stages, planted areas, and harvest yields.",
    icon: Wheat,
    group: "operations",
  },
  {
    key: "fertilizer_pesticide",
    title: "Fertilizer & Pesticide",
    shortDesc: "Agrochemical applications, product quantities, application methods, and input costs.",
    icon: FlaskConical,
    group: "operations",
  },
  {
    key: "irrigation",
    title: "Irrigation & Water",
    shortDesc: "Field plot irrigation logs, watering runtimes, pump durations, and water methods.",
    icon: Droplets,
    group: "operations",
  },
  {
    key: "harvest",
    title: "Harvest & Yield Output",
    shortDesc: "Harvest dates, crop volumes, quality grading, harvest methods, and storage records.",
    icon: Package,
    group: "operations",
  },

  // Workforce & Wages
  {
    key: "labour",
    title: "Labour & Workforce",
    shortDesc: "Worker registry, trades, daily wages, attendance summaries, and earned salaries.",
    icon: Users,
    group: "workforce",
  },
  {
    key: "attendance",
    title: "Workforce Attendance",
    shortDesc: "Daily worker check-ins, check-outs, presence rates, and working hours.",
    icon: CalendarCheck,
    group: "workforce",
  },
  {
    key: "salary",
    title: "Salary & Wage Payments",
    shortDesc: "Payroll calculations, gross earnings, cash disbursements, and outstanding wages.",
    icon: CreditCard,
    group: "workforce",
  },

  // Finance & Machinery
  {
    key: "expense",
    title: "Operational Expenses",
    shortDesc: "Classified farm expenditures: seeds, fertilizers, fuel, labour, and maintenance.",
    icon: Receipt,
    group: "finance",
  },
  {
    key: "machinery",
    title: "Machinery & Equipment",
    shortDesc: "Asset registry, operational states, purchase costs, and service maintenance logs.",
    icon: Wrench,
    group: "finance",
  },
  {
    key: "sales_income",
    title: "Sales & Farm Income",
    shortDesc: "Crop produce sales after discount, non-crop other incomes, and buyer balances.",
    icon: TrendingUp,
    group: "finance",
  },
  {
    key: "financial_summary",
    title: "Financial Summary (P&L)",
    shortDesc: "Authoritative profit & loss statement, gross revenue, expenses, and monthly margins.",
    icon: FileBarChart,
    group: "finance",
    badge: "Authoritative",
  },
];

interface ReportCategorySelectorProps {
  selectedCategory: ReportCategoryKey;
  onSelectCategory: (category: ReportCategoryKey) => void;
}

export function ReportCategorySelector({
  selectedCategory,
  onSelectCategory,
}: ReportCategorySelectorProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "operations" | "workforce" | "finance">("all");

  const filteredCategories = React.useMemo(() => {
    if (activeTab === "all") return REPORT_CATEGORIES_CONFIG;
    return REPORT_CATEGORIES_CONFIG.filter((c) => c.group === activeTab);
  }, [activeTab]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Select Report Category</h3>
          <p className="text-xs text-slate-500">
            Choose from 12 specialized agronomic, workforce, or financial report generators
          </p>
        </div>

        {/* Group Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "all"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All (12)
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "operations"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Operations (5)
          </button>
          <button
            onClick={() => setActiveTab("workforce")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "workforce"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Workforce (3)
          </button>
          <button
            onClick={() => setActiveTab("finance")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "finance"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Finance & Assets (4)
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(cat.key)}
              className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {cat.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                      {cat.badge}
                    </span>
                  )}
                </div>
                <h4
                  className={`text-sm font-semibold mb-1 ${
                    isSelected ? "text-emerald-950" : "text-slate-900"
                  }`}
                >
                  {cat.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {cat.shortDesc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ReportCategorySelector;

