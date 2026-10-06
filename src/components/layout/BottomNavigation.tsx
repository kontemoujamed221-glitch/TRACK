"use client";

import React from "react";
import { LayoutDashboard, Package, Receipt, Boxes, Wallet, Plus } from "lucide-react";

export type TabType = "dashboard" | "orders" | "expenses" | "stock" | "cash";

interface BottomNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingOrdersCount?: number;
  lowStockCount?: number;
  onOpenQuickCreate: () => void;
}

export function BottomNavigation({
  activeTab,
  onChangeTab,
  pendingOrdersCount = 0,
  lowStockCount = 0,
  onOpenQuickCreate,
}: BottomNavigationProps) {
  const navItems = [
    {
      id: "dashboard" as TabType,
      label: "Tableau",
      icon: LayoutDashboard,
    },
    {
      id: "orders" as TabType,
      label: "Commandes",
      icon: Package,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      id: "expenses" as TabType,
      label: "Dépenses",
      icon: Receipt,
    },
    {
      id: "stock" as TabType,
      label: "Stock",
      icon: Boxes,
      badge: lowStockCount > 0 ? "!" : undefined,
      badgeColor: "bg-rose-500",
    },
    {
      id: "cash" as TabType,
      label: "Caisse",
      icon: Wallet,
    },
  ];

  return (
    <>
      {/* Floating Action Button (FAB) for express order creation in < 20s */}
      <div className="fixed bottom-20 right-4 z-40">
        <button
          onClick={onOpenQuickCreate}
          className="w-13 h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/30 group"
          title="Ajouter une commande express"
          aria-label="Ajouter une commande"
        >
          <Plus className="w-6 h-6 stroke-[2.5] text-slate-950 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Modern Glassmorphic Bottom Bar with safe area padding */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center relative transition-all rounded-xl ${
                  isActive
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative">
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive ? "bg-emerald-500/15 text-emerald-400 scale-110" : ""
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`absolute -top-1 -right-2 text-[10px] font-black px-1.5 py-0.2 min-w-4 h-4 flex items-center justify-center rounded-full text-white ${
                        item.badgeColor || "bg-indigo-600"
                      } shadow-sm animate-pulse`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>

                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5 shadow-sm shadow-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
