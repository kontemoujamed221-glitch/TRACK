"use client";

import React from "react";
import { Order, Expense, Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, PieChart, Sparkles } from "lucide-react";

interface RevenueChartProps {
  orders: Order[];
  expenses: Expense[];
  products: Product[];
}

export function RevenueChart({ orders, expenses, products }: RevenueChartProps) {
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");
  const totalCA = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalDepenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalProductCost = deliveredOrders.reduce((sum, o) => {
    return sum + o.items.reduce((s, it) => s + it.frozenCostPrice * it.quantity, 0);
  }, 0);
  const totalDeliveryFees = deliveredOrders.reduce((sum, o) => sum + o.deliveryFee, 0);
  const beneficeNet = totalCA - totalProductCost - totalDeliveryFees - totalDepenses;

  // Breakdown by channel/source
  const sources = ["Facebook Ads", "TikTok Ads", "WhatsApp", "Organique"];
  const sourceStats = sources.map((src) => {
    const srcOrders = orders.filter((o) => o.source === src);
    const srcDelivered = srcOrders.filter((o) => o.status === "DELIVERED");
    const srcCA = srcDelivered.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      name: src,
      count: srcOrders.length,
      delivered: srcDelivered.length,
      ca: srcCA,
    };
  }).filter((s) => s.count > 0);

  // Top products by revenue
  const productSales = products.map((prod) => {
    let soldQty = 0;
    let revenue = 0;
    deliveredOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (it.productId === prod.id) {
          soldQty += it.quantity;
          revenue += it.unitPrice * it.quantity;
        }
      });
    });
    return {
      product: prod,
      soldQty,
      revenue,
      margin: revenue - (soldQty * prod.costPrice),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxValue = Math.max(totalCA, totalDepenses, Math.abs(beneficeNet), 10000);

  return (
    <div className="space-y-3">
      {/* Visual Bar Comparison: CA vs Dépenses vs Bénéfice */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Structure Financière
              </h4>
              <p className="text-[10px] text-slate-400">CA Encaissé vs Dépenses vs Bénéfice Réel</p>
            </div>
          </div>
        </div>

        {/* 3 Horizontal Progress Bars */}
        <div className="space-y-2.5 pt-1">
          {/* CA */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Chiffre d'Affaires Encaissé</span>
              <span className="font-extrabold text-blue-400">{formatCurrency(totalCA)}</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, (totalCA / maxValue) * 100))}%` }}
              />
            </div>
          </div>

          {/* Dépenses */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Dépenses Opérationnelles</span>
              <span className="font-extrabold text-rose-400">-{formatCurrency(totalDepenses)}</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, (totalDepenses / maxValue) * 100))}%` }}
              />
            </div>
          </div>

          {/* Bénéfice Net */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Bénéfice Net Réel
              </span>
              <span className={`font-black ${beneficeNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(beneficeNet)}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  beneficeNet >= 0 ? "bg-emerald-500" : "bg-rose-600"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (Math.abs(beneficeNet) / maxValue) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Acquisition Sources Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-indigo-400" />
          <span>Canaux d'Acquisition (ROAS)</span>
        </h4>

        <div className="grid grid-cols-2 gap-2">
          {sourceStats.map((src) => (
            <div
              key={src.name}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">{src.name}</span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {src.delivered}/{src.count} livrés
                </span>
              </div>
              <p className="text-sm font-extrabold text-emerald-400">
                {formatCurrency(src.ca)}
              </p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{
                    width: `${src.count > 0 ? (src.delivered / src.count) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Top Produits par Rentabilité</span>
        </h4>

        <div className="space-y-2">
          {productSales.slice(0, 3).map((item, idx) => (
            <div
              key={item.product.id}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-200 truncate">
                    {item.product.name}
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    {item.soldQty} vendu(s) • Marge unitaire: +{formatCurrency(item.product.salePrice - item.product.costPrice)}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-emerald-400 block">
                  {formatCurrency(item.revenue)}
                </span>
                <span className="text-[10px] text-emerald-300/80 font-medium">
                  Gain: +{formatCurrency(item.margin)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
