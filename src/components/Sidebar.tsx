"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  FileText,
  ReceiptText,
  Building2,
  Truck,
  Bot,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spend", label: "Spend", icon: PieChart },
  { href: "/purchase-orders", label: "Purchase Orders", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/deliveries", label: "Deliveries", icon: Truck },
  { href: "/copilot", label: "Copilot", icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Bot size={20} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">Procurement</div>
          <div className="text-xs text-slate-500">Copilot</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-400">
        Demo workspace · seed data
      </div>
    </aside>
  );
}
