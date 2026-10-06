"use client";

import React, { useState } from "react";
import { Expense, ExpenseCategory, Business } from "@/types";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Receipt, Plus, Tag, Calendar, CreditCard, Filter } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  businesses: Business[];
  onOpenCreate: () => void;
}

export function ExpenseList({ expenses, businesses, onOpenCreate }: ExpenseListProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "ALL">("ALL");

  const categoryLabels: Record<ExpenseCategory, { label: string; icon: string }> = {
    ADS_FACEBOOK: { label: "Facebook Ads", icon: "📘" },
    ADS_TIKTOK: { label: "TikTok Ads", icon: "🎵" },
    INVENTORY_PURCHASE: { label: "Achat Stock", icon: "📦" },
    SHIPPING_LOGISTICS: { label: "Fret & Transport", icon: "🚚" },
    SALARY_COMMISSION: { label: "Salaires & Frais", icon: "👥" },
    TOOLS_SUBSCRIPTIONS: { label: "Outils", icon: "💻" },
    OTHER: { label: "Autres", icon: "📝" },
  };

  const filtered = expenses.filter(
    (e) => selectedCategory === "ALL" || e.category === selectedCategory
  );

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

  // Group by category for quick summary
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  return (
    <div className="space-y-3 pb-24">
      {/* Header card with total spent */}
      <div className="bg-gradient-to-r from-rose-950/50 to-slate-900 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300 block">
            Total Dépenses Période
          </span>
          <span className="text-2xl font-black text-rose-400">
            {formatCurrency(totalAmount)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {filtered.length} dépense(s) enregistrée(s)
          </span>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Saisie Express</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "ALL"
              ? "bg-slate-100 text-slate-950 shadow-md font-bold"
              : "bg-slate-900 text-slate-400 border border-slate-800"
          }`}
        >
          Toutes ({formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))})
        </button>

        {Object.entries(categoryLabels).map(([catId, info]) => {
          const totalCat = categoryTotals[catId as ExpenseCategory] || 0;
          if (totalCat === 0 && selectedCategory !== catId) return null;
          const isActive = selectedCategory === catId;

          return (
            <button
              key={catId}
              onClick={() => setSelectedCategory(catId as ExpenseCategory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-rose-500 text-white shadow-md font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
              <span className="text-[10px] opacity-75 font-mono">{formatCurrency(totalCat)}</span>
            </button>
          );
        })}
      </div>

      {/* Expense Items List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
          Aucune dépense enregistrée pour ce filtre.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => {
            const catInfo = categoryLabels[exp.category] || { label: exp.category, icon: "📝" };
            const biz = businesses.find((b) => b.id === exp.businessId);

            return (
              <div
                key={exp.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/20 text-lg flex items-center justify-center shrink-0">
                    {catInfo.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {catInfo.label}
                      </span>
                      {biz ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {biz.name.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                          Partagée 50/50
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {exp.note || exp.campaignName || "Sans note"}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{formatDateShort(exp.date)}</span>
                      <span>•</span>
                      <span>Payé par {exp.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-rose-400 block font-mono">
                    -{formatCurrency(exp.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
