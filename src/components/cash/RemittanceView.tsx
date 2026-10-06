"use client";

import React, { useState } from "react";
import { CashRemittance, User, Business, Order } from "@/types";
import { store } from "@/lib/store";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  UserCheck,
  Share2,
  DollarSign,
  X,
} from "lucide-react";

interface RemittanceViewProps {
  remittances: CashRemittance[];
  users: User[];
  businesses: Business[];
  orders: Order[];
  onRemittanceUpdated: () => void;
}

export function RemittanceView({
  remittances,
  users,
  businesses,
  orders,
  onRemittanceUpdated,
}: RemittanceViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(
    users.find((u) => u.role === "DELIVERY_AGENT")?.id || users[0]?.id || ""
  );
  const [selectedBizId, setSelectedBizId] = useState(businesses[0]?.id || "");
  const [remittedAmount, setRemittedAmount] = useState("");
  const [notes, setNotes] = useState("");

  const deliveryAgents = users.filter((u) => u.role === "DELIVERY_AGENT");

  // Calculate uncollected / unverified cash for selected agent
  const agentDeliveredOrders = orders.filter(
    (o) => o.status === "DELIVERED" && o.deliveryAgentId === selectedAgentId
  );
  const expectedForAgent = agentDeliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const totalCollectedToday = remittances.reduce((sum, r) => sum + r.remittedAmount, 0);
  const totalDiscrepancies = remittances.reduce((sum, r) => sum + r.discrepancy, 0);

  const handleCreateRemittance = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(remittedAmount.replace(/\D/g, ""), 10);
    if (isNaN(amountNum)) return;

    const agent = users.find((u) => u.id === selectedAgentId);

    store.createCashRemittance({
      deliveryAgentId: selectedAgentId,
      deliveryAgentName: agent ? agent.name : "Livreur",
      businessId: selectedBizId,
      expectedAmount: expectedForAgent || amountNum,
      remittedAmount: amountNum,
      notes,
    });

    onRemittanceUpdated();
    setIsModalOpen(false);
    setRemittedAmount("");
    setNotes("");
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Cash Overview Hero */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
            Trésorerie & Caisse Livreurs
          </span>
          <span className="text-2xl font-black text-white">
            {formatCurrency(totalCollectedToday)}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalDiscrepancies === 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Caisse parfaitement équilibrée (0 écart)
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Écart détecté : {formatCurrency(totalDiscrepancies)}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Clôture Caisse</span>
        </button>
      </div>

      {/* Daily Closing Report Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Contrôle des versements livreurs</span>
          </h4>
          <span className="text-[11px] text-slate-500">Aujourd'hui</span>
        </div>

        <div className="space-y-2">
          {remittances.map((rem) => {
            const isBalanced = rem.discrepancy === 0;

            return (
              <div
                key={rem.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  isBalanced
                    ? "bg-slate-950/70 border-slate-800"
                    : "bg-rose-950/30 border-rose-900/50"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">
                      {rem.deliveryAgentName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                        rem.status === "VERIFIED"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      {rem.status === "VERIFIED" ? "Vérifié & Clôturé" : "En attente versement"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>Attendu: {formatCurrency(rem.expectedAmount)}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      Reçu: {formatCurrency(rem.remittedAmount)}
                    </span>
                  </div>

                  {rem.notes && (
                    <p className="text-[10px] text-slate-500 mt-0.5 italic">{rem.notes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {isBalanced ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Conforme</span>
                    </span>
                  ) : (
                    <div className="text-rose-400 text-xs font-bold">
                      <span>Écart: {formatCurrency(rem.discrepancy)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remittance Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Enregistrer un versement livreur</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRemittance} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Livreur
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {deliveryAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[11px]">Montant attendu des commandes livrées :</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {formatCurrency(expectedForAgent)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Montant effectivement remis (GMD) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 2950"
                  value={remittedAmount}
                  onChange={(e) => setRemittedAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Note (Wave, Espèces, date...)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Versement Wave 19h30 à Mouhamed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                >
                  Valider la Remise de Caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
