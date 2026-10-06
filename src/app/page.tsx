"use client";

import React, { useState, useEffect } from "react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNavigation, TabType } from "@/components/layout/BottomNavigation";
import { KPICards } from "@/components/dashboard/KPICards";
import { ProblemsSection } from "@/components/dashboard/ProblemsSection";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OrderList } from "@/components/orders/OrderList";
import { OrderQuickCreateModal } from "@/components/orders/OrderQuickCreateModal";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseQuickCreateModal } from "@/components/expenses/ExpenseQuickCreateModal";
import { StockList } from "@/components/stock/StockList";
import { RemittanceView } from "@/components/cash/RemittanceView";
import { store, DashboardKPIs } from "@/lib/store";
import { DateFilterType } from "@/types";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterType>("today");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Reactive state from central store
  const [businesses, setBusinesses] = useState(() => store.getBusinesses());
  const [zones, setZones] = useState(() => store.getZones());
  const [users, setUsers] = useState(() => store.getUsers());
  const [products, setProducts] = useState(() => store.getProducts(selectedBusinessId));
  const [orders, setOrders] = useState(() => store.getOrders(selectedBusinessId, selectedDateFilter));
  const [expenses, setExpenses] = useState(() => store.getExpenses(selectedBusinessId, selectedDateFilter));
  const [remittances, setRemittances] = useState(() => store.getRemittances(selectedBusinessId));
  const [kpis, setKpis] = useState<DashboardKPIs>(() =>
    store.calculateKPIs(selectedBusinessId, selectedDateFilter)
  );

  // Sync state when business or date filter changes, or on store notification
  const refreshData = () => {
    setBusinesses(store.getBusinesses());
    setZones(store.getZones());
    setUsers(store.getUsers());
    setProducts(store.getProducts(selectedBusinessId));
    setOrders(store.getOrders(selectedBusinessId, selectedDateFilter));
    setExpenses(store.getExpenses(selectedBusinessId, selectedDateFilter));
    setRemittances(store.getRemittances(selectedBusinessId));
    setKpis(store.calculateKPIs(selectedBusinessId, selectedDateFilter));
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = store.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [selectedBusinessId, selectedDateFilter]);

  const pendingOrdersCount = orders.filter((o) =>
    ["NEW", "CONFIRMED", "IN_DELIVERY"].includes(o.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Mobile-First Header */}
      <MobileHeader
        selectedDateFilter={selectedDateFilter}
        onSelectDateFilter={setSelectedDateFilter}
        kpis={kpis}
      />

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 space-y-4">
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-4 pb-20 animate-fade-in">
            {/* KPI Cards */}
            <KPICards kpis={kpis} />

            {/* Daily Operational Problems Block */}
            <ProblemsSection
              orders={orders}
              products={products}
              remittances={remittances}
              onSelectTab={(tab) => setActiveTab(tab)}
            />

            {/* Financial & Channel Performance */}
            <RevenueChart orders={orders} expenses={expenses} products={products} />
          </div>
        )}

        {/* TAB 2: COMMANDES */}
        {activeTab === "orders" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-extrabold text-white">Gestion des Commandes COD</h2>
              <span className="text-xs text-slate-400">
                {orders.length} commande(s)
              </span>
            </div>
            <OrderList orders={orders} onOrderUpdated={refreshData} />
          </div>
        )}

        {/* TAB 3: DÉPENSES */}
        {activeTab === "expenses" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-extrabold text-white">Suivi des Dépenses</h2>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="text-xs text-rose-400 font-bold hover:underline"
              >
                + Ajouter
              </button>
            </div>
            <ExpenseList
              expenses={expenses}
              businesses={businesses}
              onOpenCreate={() => setIsExpenseModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 4: STOCK */}
        {activeTab === "stock" && (
          <div className="animate-fade-in">
            <h2 className="text-base font-extrabold text-white mb-2">Stocks & Réassort</h2>
            <StockList
              products={products}
              businesses={businesses}
              onStockUpdated={refreshData}
            />
          </div>
        )}

        {/* TAB 5: CAISSE */}
        {activeTab === "cash" && (
          <div className="animate-fade-in">
            <h2 className="text-base font-extrabold text-white mb-2">Caisse & Clôture de Journée</h2>
            <RemittanceView
              remittances={remittances}
              users={users}
              businesses={businesses}
              orders={orders}
              onRemittanceUpdated={refreshData}
            />
          </div>
        )}
      </main>

      {/* Express Order Creation Modal (<20s) */}
      <OrderQuickCreateModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        businesses={businesses}
        products={products}
        zones={zones}
        defaultBusinessId={selectedBusinessId}
        onOrderCreated={() => {
          refreshData();
          setActiveTab("orders");
        }}
      />

      {/* Express Expense Creation Modal */}
      <ExpenseQuickCreateModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        businesses={businesses}
        defaultBusinessId={selectedBusinessId}
        onExpenseCreated={() => {
          refreshData();
          setActiveTab("expenses");
        }}
      />

      {/* Bottom Navigation with FAB (+) */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pendingOrdersCount={pendingOrdersCount}
        lowStockCount={kpis.lowStockCount}
        onOpenQuickCreate={() => setIsOrderModalOpen(true)}
      />
    </div>
  );
}
