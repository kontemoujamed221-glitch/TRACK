"use client";

import React, { useState, useEffect } from "react";
import { Business, Product, DeliveryZone, Order } from "@/types";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { X, Check, AlertCircle, ShoppingBag, MapPin, Phone, User, Tag } from "lucide-react";

interface OrderQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  products: Product[];
  zones: DeliveryZone[];
  defaultBusinessId?: string;
  onOrderCreated: (order: Order) => void;
}

export function OrderQuickCreateModal({
  isOpen,
  onClose,
  businesses,
  products,
  zones,
  defaultBusinessId,
  onOrderCreated,
}: OrderQuickCreateModalProps) {
  const [businessId] = useState("biz_gambia");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [zone, setZone] = useState(zones[0]?.name || "Serrekunda / Senegambia");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deliveryFee, setDeliveryFee] = useState(150);
  const [source, setSource] = useState<Order["source"]>("Facebook Ads");
  const [notes, setNotes] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<Order | null>(null);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === productId)) {
      setProductId(products[0].id);
    }
  }, [products, productId]);

  // Update default delivery fee when zone changes
  useEffect(() => {
    const selectedZone = zones.find((z) => z.name === zone);
    if (selectedZone) {
      setDeliveryFee(selectedZone.defaultDeliveryFee);
    }
  }, [zone, zones]);

  // Check for duplicate order as user types phone
  useEffect(() => {
    if (customerPhone.length >= 7 && productId) {
      const dup = store.checkDuplicate(customerPhone, productId);
      setDuplicateWarning(dup || null);
    } else {
      setDuplicateWarning(null);
    }
  }, [customerPhone, productId]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === productId);
  const unitPrice = selectedProduct?.salePrice || 0;
  const totalAmount = unitPrice * quantity + deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !productId) return;

    const res = store.createOrder({
      businessId,
      customerName,
      customerPhone,
      deliveryAddress: deliveryAddress || zone,
      zone,
      source,
      productId,
      quantity,
      deliveryFee,
      notes,
    });

    onOrderCreated(res.order);
    onClose();

    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Nouvelle Commande Gambie COD</span>
            </h2>
            <p className="text-[11px] text-slate-400">Saisie express terrain (&lt; 20 secondes) • En Dalasi (GMD)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="font-bold">Attention doublon détecté !</strong>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Une commande (#{duplicateWarning.orderNumber}) existe déjà aujourd'hui pour ce numéro avec le même produit.
                </p>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nom du Client *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Fatou Ceesay"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Téléphone (WhatsApp Gambie) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
                <input
                  type="tel"
                  required
                  placeholder="Ex: 311 22 33 ou 789 01 23"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Zone & Delivery Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Zone de Livraison (Gambie)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>
                      {z.name} ({formatCurrency(z.defaultDeliveryFee)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Adresse / Repère
              </label>
              <input
                type="text"
                placeholder="Ex: Westfield, near Elton Petrol Station"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Product & Quantity */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Produit sélectionné *
              </label>
              <div className="relative">
                <ShoppingBag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.salePrice)} (Stock dispo: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Quantité
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden w-32">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 py-2 text-slate-300 hover:bg-slate-800 font-bold"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-white text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 py-2 text-slate-300 hover:bg-slate-800 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Frais Livraison
                </label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Source & Notes */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Order["source"])}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Organique">Organique / Bouche à oreille</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Note livreur
              </label>
              <input
                type="text"
                placeholder="Ex: Appeler avant de venir"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Total Preview & Submit Button */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 mb-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Montant total à encaisser (COD)
                </span>
                <span className="text-xl font-extrabold text-emerald-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <span className="text-xs text-slate-300">
                {quantity}x article(s) + livraison
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Enregistrer la Commande Express</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
