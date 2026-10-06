"use client";

import React, { useState } from "react";
import { Business, Expense, ExpenseCategory } from "@/types";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { X, Check, Receipt, Tag, CreditCard, DollarSign } from "lucide-react";

interface ExpenseQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  defaultBusinessId?: string;
  onExpenseCreated: (expense: Expense) => void;
}

export function ExpenseQuickCreateModal({
  isOpen,
  onClose,
  businesses,
  defaultBusinessId,
  onExpenseCreated,
}: ExpenseQuickCreateModalProps) {
  const [businessId] = useState("biz_gambia");
  const [category, setCategory] = useState<ExpenseCategory>("ADS_FACEBOOK");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<Expense["paymentMethod"]>("Wave");
  const [note, setNote] = useState("");
  const [campaignName, setCampaignName] = useState("");

  if (!isOpen) return null;

  const categories: { id: ExpenseCategory; label: string; icon: string }[] = [
    { id: "ADS_FACEBOOK", label: "Facebook Ads", icon: "📘" },
    { id: "ADS_TIKTOK", label: "TikTok Ads", icon: "🎵" },
    { id: "INVENTORY_PURCHASE", label: "Achat Marchandises (Stock)", icon: "📦" },
    { id: "SHIPPING_LOGISTICS", label: "Fret, Douane & Carburant", icon: "🚚" },
    { id: "SALARY_COMMISSION", label: "Salaires & Frais Livreurs", icon: "👥" },
    { id: "TOOLS_SUBSCRIPTIONS", label: "Outils & Abonnements", icon: "💻" },
    { id: "OTHER", label: "Autre dépense", icon: "📝" },
  ];

  const paymentMethods: Expense["paymentMethod"][] = [
    "Wave",
    "QMoney",
    "Afrimoney",
    "Espèces",
    "Carte Bancaire",
    "Virement",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || isNaN(numAmount)) return;

    const newExp = store.createExpense({
      businessId,
      category,
      amount: numAmount,
      paymentMethod,
      note,
      adPlatform: category.startsWith("ADS")
        ? category === "ADS_FACEBOOK"
          ? "Facebook Ads"
          : "TikTok Ads"
        : undefined,
      campaignName: campaignName || undefined,
    });

    onExpenseCreated(newExp);
    onClose();
    setAmount("");
    setNote("");
    setCampaignName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Saisie Dépense (Gambie)</span>
            </h2>
            <p className="text-[11px] text-slate-400">En Dalasi (GMD) • Impact direct sur le bénéfice net</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Amount (Big Tactile Input) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Montant dépensé (GMD) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                autoFocus
                placeholder="Ex: 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-4 pr-16 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xl font-extrabold text-rose-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono shadow-inner"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                GMD
              </span>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Catégorie de dépense
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2 ${
                    category === cat.id
                      ? "bg-rose-500/15 border-rose-500 text-rose-300 shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Moyen de paiement
            </label>
            <div className="flex flex-wrap gap-1.5">
              {paymentMethods.map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === method
                      ? "bg-slate-100 text-slate-950 border-white shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note / Campaign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Note / Description
              </label>
              <input
                type="text"
                placeholder="Ex: Essence Modou Fall ou lot Alibaba"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {category.startsWith("ADS") && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nom Campagne Pub
                </label>
                <input
                  type="text"
                  placeholder="Ex: WATCH-ULTRA-DK"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-sm shadow-xl shadow-rose-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Enregistrer la Dépense</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
