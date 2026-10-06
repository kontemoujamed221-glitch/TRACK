"use client";

import React, { useState, useEffect } from "react";
import { Order, Product, CashRemittance, DailyProblemNote } from "@/types";
import { formatCurrency, getWhatsAppLink } from "@/lib/utils";
import { store } from "@/lib/store";
import {
  AlertTriangle,
  MessageCircle,
  Phone,
  ArrowRight,
  Edit3,
  CheckCircle2,
  Trash2,
  Plus,
  Save,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ProblemsSectionProps {
  orders: Order[];
  products: Product[];
  remittances: CashRemittance[];
  onSelectTab: (tab: "orders" | "stock" | "cash") => void;
}

export function ProblemsSection({
  orders,
  products,
  remittances,
  onSelectTab,
}: ProblemsSectionProps) {
  // Automated operational detection
  const failedOrders = orders.filter((o) => o.status === "FAILED");
  const overdueOrders = orders.filter((o) => {
    if (o.status !== "IN_DELIVERY") return false;
    const ageHours = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 3600);
    return ageHours > 24;
  });
  const lowStockProducts = products.filter((p) => p.currentStock <= p.alertThreshold);
  const discrepancyRemittances = remittances.filter(
    (r) => r.discrepancy !== 0 || r.status === "DISPUTED"
  );

  const totalAutoAlerts =
    failedOrders.length +
    overdueOrders.length +
    lowStockProducts.length +
    discrepancyRemittances.length;

  // Custom text notes state
  const [dailyNotes, setDailyNotes] = useState<DailyProblemNote[]>(() => store.getDailyNotes());
  const [dailySummary, setDailySummary] = useState<string>(() => store.getDailySummary());
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DailyProblemNote["category"]>("LOGISTICS");
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setDailyNotes(store.getDailyNotes());
      setDailySummary(store.getDailySummary());
    });
    return () => unsub();
  }, []);

  const handleSaveSummary = () => {
    store.setDailySummary(dailySummary);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2200);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    store.addDailyNote(newNoteText.trim(), selectedCategory);
    setNewNoteText("");
    setShowAddForm(false);
  };

  const handleToggleNote = (id: string) => {
    store.toggleDailyNote(id);
  };

  const handleDeleteNote = (id: string) => {
    store.deleteDailyNote(id);
  };

  const quickChips = [
    { text: "🛵 Panne de moto / retard livreur", cat: "LOGISTICS" as const },
    { text: "🚦 Embouteillage Westfield / Traffic", cat: "LOGISTICS" as const },
    { text: "📦 Rupture de stock à commander", cat: "STOCK" as const },
    { text: "📞 Client injoignable à relancer", cat: "CLIENT" as const },
    { text: "💸 Problème monnaie / versement", cat: "CASH" as const },
  ];

  const pendingNotesCount = dailyNotes.filter((n) => !n.resolved).length;

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg shadow-black/40 space-y-3.5 transition-all">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Problèmes du Jour & Journal Terrain</span>
              {(pendingNotesCount > 0 || totalAutoAlerts > 0) && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                  {pendingNotesCount + totalAutoAlerts}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Notes libres d&apos;incidents + alertes automatiques en Gambie
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* 1. TEXTE DU JOUR : Zone de saisie libre persistante */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Note / Mémo Opérationnel du Jour</span>
          </label>
          {isSavedSuccess && (
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3 h-3" />
              Enregistré !
            </span>
          )}
        </div>

        <textarea
          rows={2}
          value={dailySummary}
          onChange={(e) => setDailySummary(e.target.value)}
          placeholder="Écrivez ici les problèmes ou consignes du jour (ex: Bakary en panne de moto à Westfield, client Banjul à relancer avant 16h...)"
          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 leading-relaxed resize-y transition-all"
        />

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {quickChips.slice(0, 3).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDailySummary((prev) =>
                    prev ? `${prev}\n• ${chip.text}` : `• ${chip.text}`
                  );
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 whitespace-nowrap transition-colors border border-slate-700/60"
              >
                {chip.text}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveSummary}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sauvegarder</span>
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout d'un problème spécifique (accordéon) */}
      {showAddForm && (
        <form
          onSubmit={handleAddNote}
          className="bg-slate-950 border border-amber-500/40 rounded-xl p-3 space-y-2.5 animate-slide-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              Nouveau problème à consigner
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Fermer
            </button>
          </div>

          <input
            type="text"
            required
            autoFocus
            placeholder="Ex: Livreur Bakary - batterie déchargée à Senegambia..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <div className="flex items-center justify-between gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
            >
              <option value="LOGISTICS">🛵 Logistique / Livreur</option>
              <option value="CLIENT">📞 Client / Injoignable</option>
              <option value="STOCK">📦 Stock / Rupture</option>
              <option value="CASH">💸 Caisse / Écart</option>
              <option value="OTHER">📝 Autre incident</option>
            </select>

            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              + Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* 2. LISTE DES PROBLÈMES CONSIGNÉS (avec case à cocher 'Résolu') */}
      {dailyNotes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Incidents signalés ({dailyNotes.length})
            </span>
            <span className="text-[10px] text-slate-500">
              {pendingNotesCount} à traiter
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {dailyNotes.map((note) => {
              const catColors: Record<string, string> = {
                LOGISTICS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                CLIENT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                STOCK: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                CASH: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                OTHER: "bg-slate-500/20 text-slate-400 border-slate-500/30",
              };

              return (
                <div
                  key={note.id}
                  className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 transition-all ${
                    note.resolved
                      ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                      : "bg-slate-950/90 border-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={note.resolved}
                      onChange={() => handleToggleNote(note.id)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {note.category && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                              catColors[note.category] || catColors.OTHER
                            }`}
                          >
                            {note.category}
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            note.resolved
                              ? "line-through text-slate-500"
                              : "text-slate-200 font-medium"
                          }`}
                        >
                          {note.text}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 block mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(note.createdAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {note.resolved && " • Résolu ✓"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                    title="Supprimer la note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ALERTES SYSTÈME AUTOMATIQUES DÉTECTÉES */}
      {totalAutoAlerts > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block px-1">
            Alertes Opérationnelles Détectées ({totalAutoAlerts})
          </span>

          <div className="space-y-1.5">
            {/* Livraisons Échouées avec WhatsApp 1-clic */}
            {failedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Échouée
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate">{order.customerName}</span>
                    <span className="text-[10px] text-slate-400">({order.zone})</span>
                  </div>
                  <p className="text-[11px] text-rose-300 font-medium truncate mt-0.5">
                    Motif : {order.failReason || "Injoignable"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")} •{" "}
                    <span className="text-slate-300 font-semibold">{formatCurrency(order.totalAmount)}</span>
                  </p>
                </div>

                <a
                  href={getWhatsAppLink(
                    order.customerPhone,
                    order.customerName,
                    order.orderNumber,
                    order.totalAmount,
                    order.items[0]?.productName
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm transition-transform active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            ))}

            {/* Commandes en retard > 24h */}
            {overdueOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-950/80 border border-amber-900/40 rounded-xl p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Retard &gt;24h
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate">{order.customerName}</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 truncate mt-0.5">
                    En livraison • {order.zone}
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab("orders")}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 shrink-0"
                >
                  <span>Voir</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Stock Critique */}
            {lowStockProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Stock Bas
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate">{prod.name}</span>
                  </div>
                  <p className="text-[11px] text-rose-300 font-medium mt-0.5">
                    Reste : <strong className="text-white">{prod.currentStock} unité(s)</strong> (Alerte : {prod.alertThreshold})
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab("stock")}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0"
                >
                  Réassortir
                </button>
              </div>
            ))}

            {/* Écarts de caisse */}
            {discrepancyRemittances.map((rem) => (
              <div
                key={rem.id}
                className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Écart Caisse
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate">{rem.deliveryAgentName}</span>
                  </div>
                  <p className="text-[11px] text-rose-300 font-medium mt-0.5">
                    Écart : {formatCurrency(rem.discrepancy)} (Attendu : {formatCurrency(rem.expectedAmount)})
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab("cash")}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-0.5 shrink-0"
                >
                  <span>Vérifier</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
