import {
  LayoutDashboard,
  Tractor,
  Layers,
  Wheat,
  Users,
  CalendarCheck,
  CreditCard,
  FlaskConical,
  Bug,
  Droplets,
  Wrench,
  Receipt,
  TrendingUp,
  Package,
  Calendar,
  FileBarChart,
  Bell,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  phase: string;
  badge?: string;
  description: string;
}

export interface NavigationGroup {
  groupTitle: string;
  items: NavigationItem[];
}

export const NAVIGATION_CONFIG: NavigationGroup[] = [
  {
    groupTitle: "Main",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        phase: "Phase 3 Shell",
        badge: "Overview",
        description: "Farm telemetry, real-time statistics, and recent activities overview.",
      },
    ],
  },
  {
    groupTitle: "Farm Management",
    items: [
      {
        title: "Farms",
        href: "/farms",
        icon: Tractor,
        phase: "Phase 5",
        description: "Manage farm lands, boundary locations, and total acreage.",
      },
      {
        title: "Fields",
        href: "/fields",
        icon: Layers,
        phase: "Phase 5",
        description: "Subdivide farms into cultivated fields, soil types, and plot sectors.",
      },
      {
        title: "Crops",
        href: "/crops",
        icon: Wheat,
        phase: "Phase 6",
        description: "Track sowing schedules, crop varieties, growth stages, and health.",
      },
    ],
  },
  {
    groupTitle: "Workforce",
    items: [
      {
        title: "Labour",
        href: "/labour",
        icon: Users,
        phase: "Phase 7",
        description: "Worker directories, contact info, skills, and daily wage rates.",
      },
      {
        title: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
        phase: "Phase 8",
        description: "Daily clock-in/out logs, working hours, and overtime calculations.",
      },
      {
        title: "Salary / Payments",
        href: "/salary",
        icon: CreditCard,
        phase: "Phase 9",
        description: "Wage disbursement ledgers, pending payments, and pay slips.",
      },
    ],
  },
  {
    groupTitle: "Resources",
    items: [
      {
        title: "Fertilizer",
        href: "/fertilizer",
        icon: FlaskConical,
        phase: "Phase 10",
        description: "Chemical and organic nutrient application logs and stock.",
      },
      {
        title: "Pesticides",
        href: "/pesticides",
        icon: Bug,
        phase: "Phase 10",
        description: "Target pest protection applications and safety intervals.",
      },
      {
        title: "Irrigation",
        href: "/irrigation",
        icon: Droplets,
        phase: "Phase 11",
        description: "Water source management, drip/sprinkler runtimes, and volume.",
      },
      {
        title: "Equipment",
        href: "/equipment",
        icon: Wrench,
        phase: "Phase 13",
        description: "Tractor, pump, and tool maintenance, fuel logs, and availability.",
      },
    ],
  },
  {
    groupTitle: "Finance",
    items: [
      {
        title: "Financial Overview",
        href: "/financial-overview",
        icon: FileBarChart,
        phase: "Phase 15",
        badge: "P&L",
        description: "Consolidated income, produce sales, operational expenses, and net profit/loss analysis.",
      },
      {
        title: "Sales",
        href: "/sales",
        icon: TrendingUp,
        phase: "Phase 15",
        description: "Crop produce sales, buyer ledgers, invoices, and payment tracking.",
      },
      {
        title: "Other Income",
        href: "/income",
        icon: CreditCard,
        phase: "Phase 15",
        description: "Subsidies, equipment rentals, insurance claims, and auxiliary farm income.",
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: Receipt,
        phase: "Phase 12",
        description: "Record operating costs: seeds, fuel, repairs, and supplies.",
      },
    ],
  },
  {
    groupTitle: "Operations",
    items: [
      {
        title: "Harvest",
        href: "/harvest",
        icon: Package,
        phase: "Phase 14",
        description: "Yield volume recording, quality grading, and harvest dates.",
      },
      {
        title: "Calendar",
        href: "/calendar",
        icon: Calendar,
        phase: "Phase 16",
        description: "Agro-tasks, weather alerts, spraying, and harvest deadlines.",
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        phase: "Phase 19",
        description: "Farm alerts, upcoming task notifications, and scheduled reminders.",
      },
    ],
  },
  {
    groupTitle: "Analysis",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: FileBarChart,
        phase: "Phase 18",
        description: "Yield reports, financial statements, and exportable data.",
      },
    ],
  },
  {
    groupTitle: "System",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        phase: "Phase 21",
        description: "Profile configurations, units of measure, and preferences.",
      },
    ],
  },
];

/**
 * Helper to look up active navigation item info by path.
 */
export function getNavigationItemByPath(pathname: string): NavigationItem | null {
  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      if (item.href === pathname || (item.href !== "/dashboard" && pathname.startsWith(item.href))) {
        return item;
      }
    }
  }
  return null;
}
