"use client";

import React, { useState } from "react";
import { Order, OrderStatus } from "@/types";
import { store } from "@/lib/store";
import { formatCurrency, formatDateShort, getStatusDetails, getWhatsAppLink } from "@/lib/utils";
import {
  Search,
  MessageCircle,
  Phone,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface OrderListProps {
  orders: Order[];
  onOrderUpdated: () => void;
}

export function OrderList({ orders, onOrderUpdated }: OrderListProps) {
  const [activeTab, setActiveTab] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [failModalOrderId, setFailModalOrderId] = useState<string | null>(null);
  const [selectedFailReason, setSelectedFailReason] = useState("Client injoignable après plusieurs appels");

  const failReasons = [
    "Client injoignable après plusieurs appels",
    "Client a refusé le colis à la livraison",
    "Adresse ou localisation introuvable",
    "Client n'avait pas l'argent disponible",
    "Livraison reportée à demain",
    "Faux numéro / Commande erronée",
  ];

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "ALL" || order.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.includes(q) ||
      order.orderNumber.toLowerCase().includes(q) ||
      order.zone.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus, failReason?: string) => {
    store.updateOrderStatus(orderId, newStatus, {
      failReason,
      changedByName: "Mouhamed Konteye",
    });
    onOrderUpdated();
    setFailModalOrderId(null);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone, zone, N° commande..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Status Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
        {[
          { id: "ALL", label: "Toutes", count: orders.length },
          { id: "NEW", label: "Nouvelles", count: orders.filter((o) => o.status === "NEW").length },
          {
            id: "CONFIRMED",
            label: "Confirmées",
            count: orders.filter((o) => o.status === "CONFIRMED").length,
          },
          {
            id: "IN_DELIVERY",
            label: "En livraison",
            count: orders.filter((o) => o.status === "IN_DELIVERY").length,
          },
          {
            id: "DELIVERED",
            label: "Livrées",
            count: orders.filter((o) => o.status === "DELIVERED").length,
          },
          {
            id: "FAILED",
            label: "Échouées",
            count: orders.filter((o) => o.status === "FAILED").length,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as OrderStatus | "ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-slate-100 text-slate-950 shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-300">Aucune commande dans cette section</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Utilisez le bouton (+) pour enregistrer une commande rapidement.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusDetails(order.status);
            const firstItem = order.items[0];

            return (
              <div
                key={order.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5 transition-all hover:border-slate-700"
              >
                {/* Top bar: Order ID, Date & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateShort(order.createdAt)}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">
                      via {order.source}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                    {statusInfo.label}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{order.customerName}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>📍 {order.zone}</span>
                      {order.deliveryAddress && order.deliveryAddress !== order.zone && (
                        <span className="truncate max-w-[200px]">({order.deliveryAddress})</span>
                      )}
                    </p>
                  </div>

                  {/* Contact Buttons (1-Tap WhatsApp & Call) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Appeler"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    <a
                      href={getWhatsAppLink(
                        order.customerPhone,
                        order.customerName,
                        order.orderNumber,
                        order.totalAmount,
                        firstItem?.productName
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                      title="Envoyer message WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Items & Price */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-slate-300 font-medium truncate max-w-[220px]">
                    {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Total à encaisser</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Failure reason if FAILED */}
                {order.status === "FAILED" && order.failReason && (
                  <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/50 text-[11px] text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>Motif : {order.failReason}</span>
                  </div>
                )}

                {/* Fast Action Buttons according to current status */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                  {order.status === "NEW" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        ✓ Confirmer la commande
                      </button>
                      <button
                        onClick={() => setFailModalOrderId(order.id)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-xs font-semibold"
                      >
                        Annuler
                      </button>
                    </>
                  )}

                  {order.status === "CONFIRMED" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, "IN_DELIVERY")}
                        className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Donner au Livreur</span>
                      </button>
                      <button
                        onClick={() => setFailModalOrderId(order.id)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-xs font-semibold"
                      >
                        Échouer
                      </button>
                    </>
                  )}

                  {order.status === "IN_DELIVERY" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, "DELIVERED")}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marquer Livrée & Encaissée</span>
                      </button>
                      <button
                        onClick={() => setFailModalOrderId(order.id)}
                        className="py-2 px-3 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-300 text-xs font-bold"
                      >
                        Échouée
                      </button>
                    </>
                  )}

                  {order.status === "FAILED" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rappeler & Reprogrammer</span>
                    </button>
                  )}

                  {order.status === "DELIVERED" && (
                    <div className="w-full text-center py-1 text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Encaissé {formatCurrency(order.totalAmount)} • Stock décompté</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Failure Reason Modal */}
      {failModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Préciser le motif de l'échec / annulation</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Obligatoire pour les statistiques et le suivi opérationnel.
            </p>

            <div className="space-y-1.5 mb-4">
              {failReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedFailReason(reason)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedFailReason === reason
                      ? "bg-rose-500/15 border-rose-500 text-rose-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFailModalOrderId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Retour
              </button>
              <button
                onClick={() => handleStatusChange(failModalOrderId, "FAILED", selectedFailReason)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                Confirmer l'échec
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
