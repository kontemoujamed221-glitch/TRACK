"use client";

import React from "react";
import { DateFilterType } from "@/types";
import { ShieldCheck, TrendingUp, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DashboardKPIs } from "@/lib/store";

interface MobileHeaderProps {
  selectedDateFilter: DateFilterType;
  onSelectDateFilter: (filter: DateFilterType) => void;
  kpis: DashboardKPIs;
}

export function MobileHeader({
  selectedDateFilter,
  onSelectDateFilter,
  kpis,
}: MobileHeaderProps) {
  const dateOptions: { id: DateFilterType; label: string }[] = [
    { id: "today", label: "Aujourd'hui" },
    { id: "yesterday", label: "Hier" },
    { id: "last7days", label: "7 jours" },
    { id: "last30days", label: "30 jours" },
    { id: "all", label: "Tout" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white pt-2.5 pb-3 px-4 shadow-lg transition-all">
      {/* Top row: Brand & Admin Profile */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/25 text-white font-black text-lg">
            GT
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">Gambia Track</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                GAMBIA 🇬🇲
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Banjul & Serrekunda COD</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-semibold font-mono">GMD (Dalasi)</span>
            </p>
          </div>
        </div>

        {/* Co-Owner Badge */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-full text-right shadow-inner">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-semibold text-slate-200 block">Mouhamed & Associé</span>
            <span className="text-[9px] text-emerald-400 font-medium">50/50 Co-Admin</span>
          </div>
        </div>
      </div>

      {/* Quick Status Sub-Bar: Gambian Store context + Live Net Profit */}
      <div className="flex items-center justify-between gap-2 mb-2.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">E-commerce Gambie</span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400">Devise : <strong>Dalasi (GMD)</strong></span>
        </div>

        {/* Mini Live Profit Indicator */}
        <div className={`px-2.5 py-1 rounded-lg border text-right shrink-0 flex items-center gap-1.5 ${
          kpis.netProfit >= 0 
            ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
            : "bg-rose-950/40 border-rose-800/50 text-rose-300"
        }`}>
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase text-slate-400 font-medium">Net:</span>
            <span className="text-xs font-extrabold">{formatCurrency(kpis.netProfit)}</span>
          </div>
        </div>
      </div>

      {/* Date Filter Horizontal Scroll Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
        {dateOptions.map((opt) => {
          const isActive = selectedDateFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectDateFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-800"
              }`}
            >
              {opt.id === "today" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
