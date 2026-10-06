"use client";

import React, { useState } from "react";
import { Product, Business } from "@/types";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  PackageCheck,
  PackageOpen,
  X,
  Check,
} from "lucide-react";

interface StockListProps {
  products: Product[];
  businesses: Business[];
  onStockUpdated: () => void;
}

export function StockList({ products, businesses, onStockUpdated }: StockListProps) {
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // New product form states
  const [newBizId, setNewBizId] = useState(businesses[0]?.id || "");
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [newCostPrice, setNewCostPrice] = useState("");
  const [newStock, setNewStock] = useState("20");
  const [newAlert, setNewAlert] = useState("5");

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalProduct || restockQty <= 0) return;

    store.updateProductStock(restockModalProduct.id, restockQty, "ARRIVAGE");
    onStockUpdated();
    setRestockModalProduct(null);
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSalePrice || !newCostPrice) return;

    store.createProduct({
      businessId: newBizId,
      name: newName,
      sku: newSku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
      salePrice: parseInt(newSalePrice, 10),
      costPrice: parseInt(newCostPrice, 10),
      alertThreshold: parseInt(newAlert, 10) || 5,
      initialStock: parseInt(newStock, 10) || 0,
    });

    onStockUpdated();
    setIsNewProductModalOpen(false);
    setNewName("");
    setNewSku("");
    setNewSalePrice("");
    setNewCostPrice("");
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Catalogue Produits & Inventaire
          </span>
          <span className="text-xl font-black text-white">
            {products.length} référence(s) active(s)
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {products.reduce((s, p) => s + p.currentStock, 0)} en stock
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {products.reduce((s, p) => s + p.reservedStock, 0)} réservé(s)
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsNewProductModalOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Produit</span>
        </button>
      </div>

      {/* Product Cards */}
      <div className="space-y-3">
        {products.map((product) => {
          const isLowStock = product.currentStock <= product.alertThreshold;
          const biz = businesses.find((b) => b.id === product.businessId);
          const unitMargin = product.salePrice - product.costPrice;
          const marginPercent = Math.round((unitMargin / product.salePrice) * 100);

          return (
            <div
              key={product.id}
              className={`bg-slate-900/90 border rounded-2xl p-3.5 shadow-sm space-y-3 transition-all ${
                isLowStock ? "border-rose-500/50 bg-rose-950/10" : "border-slate-800"
              }`}
            >
              {/* Product Header */}
              <div className="flex items-start gap-3">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                    <Boxes className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {product.sku}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400">
                      🇬🇲 Gambie
                    </span>
                    {isLowStock && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                        ⚠️ Alerte Stock Bas
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                    {product.name}
                  </h4>

                  {/* Financials per unit */}
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="font-bold text-emerald-400">
                      Prix: {formatCurrency(product.salePrice)}
                    </span>
                    <span className="text-slate-400">
                      Coût: {formatCurrency(product.costPrice)}
                    </span>
                    <span className="text-emerald-300 font-semibold text-[11px]">
                      (+{marginPercent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Bar & Breakdown */}
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Stock Physique Disponible</span>
                    <span className={`text-base font-extrabold ${isLowStock ? "text-rose-400" : "text-white"}`}>
                      {product.currentStock} unité(s)
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-slate-400 text-[11px] block">Réservé (Confirmé)</span>
                    <span className="text-sm font-bold text-amber-400">
                      {product.reservedStock} unité(s)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Seuil Alerte</span>
                    <span className="text-xs font-semibold text-slate-300">
                      ≤ {product.alertThreshold} unités
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isLowStock ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(10, (product.currentStock / (product.alertThreshold * 4)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400">
                  {product.currentStock <= 5 ? (
                    <span className="text-rose-400 font-medium">⚠️ Réapprovisionnement urgent recommandé</span>
                  ) : (
                    <span>Autonomie estimée : ~{Math.round(product.currentStock / 2.5)} jours de vente</span>
                  )}
                </div>

                <button
                  onClick={() => setRestockModalProduct(product)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Arrivage / Réassort</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restock Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">
              Entrée en Stock (Arrivage)
            </h3>
            <p className="text-xs text-slate-400 mb-3 truncate">
              {restockModalProduct.name}
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Quantité reçue (+ unités)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalProduct(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                >
                  Valider l'entrée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col p-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white">Ajouter un nouveau produit</h3>
              <button
                onClick={() => setIsNewProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Nom du Produit *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Écouteurs Pro ANC"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Prix de Vente (GMD) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1800"
                    value={newSalePrice}
                    onChange={(e) => setNewSalePrice(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Coût Revient (GMD) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="650"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Seuil Alerte Stock Bas
                  </label>
                  <input
                    type="number"
                    value={newAlert}
                    onChange={(e) => setNewAlert(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                >
                  Enregistrer le Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
