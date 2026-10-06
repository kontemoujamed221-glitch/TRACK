"use client";

import React from "react";
import { DashboardKPIs } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Banknote,
  Receipt,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Percent,
} from "lucide-react";

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const isProfitable = kpis.netProfit >= 0;

  return (
    <div className="space-y-3">
      {/* Hero Card: Bénéfice Net Réel */}
      <div
        className={`relative overflow-hidden rounded-2xl p-4 border transition-all shadow-lg ${
          isProfitable
            ? "bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-500/40 text-white shadow-emerald-950/30"
            : "bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-rose-500/40 text-white shadow-rose-950/30"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Bénéfice Net Réel</span>
              <span className="text-[10px] lowercase text-slate-400 font-normal">
                (CA − Coûts − Pub − Frais)
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  isProfitable ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(kpis.netProfit)}
              </span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isProfitable
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/20 border-rose-500/30 text-rose-400"
            }`}
          >
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Breakdown Sub-bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/60 rounded-lg py-1 px-1.5 border border-slate-800/40">
            <span className="text-[10px] text-slate-400 block font-medium">Marge Nette</span>
            <span
              className={`text-xs font-bold ${
                kpis.marginPercent >= 20
                  ? "text-emerald-400"
                  : kpis.marginPercent > 0
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {Math.round(kpis.marginPercent)}%
            </span>
          </div>

          <div className="bg-slate-900/60 rounded-lg py-1 px-1.5 border border-slate-800/40">
            <span className="text-[10px] text-slate-400 block font-medium">Coût Produits</span>
            <span className="text-xs font-semibold text-slate-200">
              {formatCurrency(kpis.totalProductCost)}
            </span>
          </div>

          <div className="bg-slate-900/60 rounded-lg py-1 px-1.5 border border-slate-800/40">
            <span className="text-[10px] text-slate-400 block font-medium">Frais Livraison</span>
            <span className="text-xs font-semibold text-slate-200">
              {formatCurrency(kpis.totalDeliveryFees)}
            </span>
          </div>
        </div>
      </div>

      {/* 2x2 Grid: CA, Dépenses, Taux Livraison, Commandes */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* CA Encaissé */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              CA Encaissé
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {formatCurrency(kpis.totalRevenue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{kpis.ordersDelivered} commande(s) livrée(s)</span>
          </p>
        </div>

        {/* Dépenses Totales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Dépenses
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {formatCurrency(kpis.totalExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>Pub, salaires, logistique</span>
          </p>
        </div>

        {/* Taux de Livraison */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Taux Livraison
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {Math.round(kpis.deliveryRate)}%
            </span>
            <span className="text-[10px] text-slate-400">
              ({kpis.ordersDelivered}/{kpis.ordersDelivered + kpis.ordersFailed})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, kpis.deliveryRate))}%` }}
            />
          </div>
        </div>

        {/* Flux Commandes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Commandes
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {kpis.ordersReceived} <span className="text-xs font-normal text-slate-400">total</span>
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-medium">
            <span className="text-amber-400">{kpis.ordersInDelivery} en cours</span>
            <span className="text-rose-400">{kpis.ordersFailed} échouée(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
