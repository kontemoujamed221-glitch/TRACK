import {
  Business,
  Product,
  Order,
  Expense,
  CashRemittance,
  DeliveryZone,
  User,
  OrderStatus,
  DateFilterType,
  DailyProblemNote,
} from "@/types";
import {
  initialBusinesses,
  initialProducts,
  initialOrders,
  initialExpenses,
  initialRemittances,
  deliveryZones,
  initialUsers,
  initialDailyNotes,
} from "./mockData";

export interface DashboardKPIs {
  ordersReceived: number;
  ordersConfirmed: number;
  ordersInDelivery: number;
  ordersDelivered: number;
  ordersFailed: number;
  totalRevenue: number; // CA Encaissé (commandes LIVRÉES uniquement)
  totalProductCost: number; // Coût de revient des produits livrés
  totalDeliveryFees: number; // Frais de livraison des commandes livrées
  totalExpenses: number; // Dépenses opérationnelles (pub, transport, salaires)
  netProfit: number; // CA Encaissé - coût produits - frais livraison - dépenses
  marginPercent: number; // (netProfit / totalRevenue) * 100
  deliveryRate: number; // (ordersDelivered / (ordersDelivered + ordersFailed || 1)) * 100
  confirmationRate: number; // (ordersConfirmed / (ordersReceived || 1)) * 100
  lowStockCount: number;
  overdueOrdersCount: number;
  cashDiscrepanciesCount: number;
}

const STORAGE_KEY_PREFIX = "gambia_track_v4_";

function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error("Storage read error:", e);
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage write error:", e);
  }
}

class DataStore {
  private businesses: Business[] = initialBusinesses;
  private products: Product[] = initialProducts;
  private orders: Order[] = initialOrders;
  private expenses: Expense[] = initialExpenses;
  private remittances: CashRemittance[] = initialRemittances;
  private users: User[] = initialUsers;
  private zones: DeliveryZone[] = deliveryZones;
  private dailyNotes: DailyProblemNote[] = initialDailyNotes;
  private dailySummaryText: string = "Livreur Bakary sur le terrain Banjul/Serrekunda. Vérifier confirmation des 2 commandes en attente d'appel.";
  private listeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.initFromStorage();
    }
  }

  public initFromStorage() {
    this.businesses = getStored("businesses", initialBusinesses);
    this.products = getStored("products", initialProducts);
    this.orders = getStored("orders", initialOrders);
    this.expenses = getStored("expenses", initialExpenses);
    this.remittances = getStored("remittances", initialRemittances);
    this.users = getStored("users", initialUsers);
    this.zones = getStored("zones", deliveryZones);
    this.dailyNotes = getStored("dailyNotes", initialDailyNotes);
    this.dailySummaryText = getStored("dailySummaryText", this.dailySummaryText);
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private persist() {
    setStored("businesses", this.businesses);
    setStored("products", this.products);
    setStored("orders", this.orders);
    setStored("expenses", this.expenses);
    setStored("remittances", this.remittances);
    setStored("dailyNotes", this.dailyNotes);
    setStored("dailySummaryText", this.dailySummaryText);
    this.notify();
  }

  public getBusinesses(): Business[] {
    return this.businesses;
  }

  public getZones(): DeliveryZone[] {
    return this.zones;
  }

  public getUsers(): User[] {
    return this.users;
  }

  public getProducts(businessId?: string): Product[] {
    if (!businessId || businessId === "all") return this.products;
    return this.products.filter((p) => p.businessId === businessId);
  }

  // Daily Problem Notes & Freeform text
  public getDailyNotes(): DailyProblemNote[] {
    return this.dailyNotes;
  }

  public addDailyNote(
    text: string,
    category: DailyProblemNote["category"] = "LOGISTICS"
  ): DailyProblemNote {
    const newNote: DailyProblemNote = {
      id: "note_" + Math.random().toString(36).substring(2, 9),
      text: text.trim(),
      category,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    this.dailyNotes.unshift(newNote);
    this.persist();
    return newNote;
  }

  public toggleDailyNote(id: string): void {
    const note = this.dailyNotes.find((n) => n.id === id);
    if (note) {
      note.resolved = !note.resolved;
      this.persist();
    }
  }

  public deleteDailyNote(id: string): void {
    this.dailyNotes = this.dailyNotes.filter((n) => n.id !== id);
    this.persist();
  }

  public getDailySummary(): string {
    return this.dailySummaryText;
  }

  public setDailySummary(text: string): void {
    this.dailySummaryText = text;
    this.persist();
  }

  public filterByDate<T extends { createdAt?: string; date?: string; deliveredAt?: string }>(
    items: T[],
    filter: DateFilterType,
    dateField: "createdAt" | "date" | "deliveredAt" = "createdAt"
  ): T[] {
    if (filter === "all") return items;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 3600 * 1000;
    const sevenDaysAgo = todayStart - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 3600 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return items.filter((item) => {
      const targetDate = item[dateField] ? new Date(item[dateField] as string).getTime() : 0;
      if (!targetDate) return true;

      switch (filter) {
        case "today":
          return targetDate >= todayStart;
        case "yesterday":
          return targetDate >= yesterdayStart && targetDate < todayStart;
        case "last7days":
          return targetDate >= sevenDaysAgo;
        case "last30days":
          return targetDate >= thirtyDaysAgo;
        case "thisMonth":
          return targetDate >= monthStart;
        default:
          return true;
      }
    });
  }

  public getOrders(businessId?: string, dateFilter: DateFilterType = "all"): Order[] {
    let list = this.orders;
    if (businessId && businessId !== "all") {
      list = list.filter((o) => o.businessId === businessId);
    }
    return this.filterByDate(list, dateFilter, "createdAt");
  }

  public getExpenses(businessId?: string, dateFilter: DateFilterType = "all"): Expense[] {
    let list = this.expenses;
    if (businessId && businessId !== "all") {
      list = list.filter((e) => !e.businessId || e.businessId === businessId);
    }
    return this.filterByDate(list, dateFilter, "date");
  }

  public getRemittances(businessId?: string): CashRemittance[] {
    if (!businessId || businessId === "all") return this.remittances;
    return this.remittances.filter((r) => r.businessId === businessId);
  }

  public calculateKPIs(businessId?: string, dateFilter: DateFilterType = "today"): DashboardKPIs {
    const orders = this.getOrders(businessId, dateFilter);
    const expenses = this.getExpenses(businessId, dateFilter);
    const products = this.getProducts(businessId);
    const remittances = this.getRemittances(businessId);

    const ordersReceived = orders.length;
    const ordersConfirmed = orders.filter((o) => ["CONFIRMED", "IN_DELIVERY", "DELIVERED"].includes(o.status)).length;
    const ordersInDelivery = orders.filter((o) => o.status === "IN_DELIVERY").length;
    const ordersDeliveredList = orders.filter((o) => o.status === "DELIVERED");
    const ordersDelivered = ordersDeliveredList.length;
    const ordersFailed = orders.filter((o) => ["FAILED", "RETURNED", "CANCELLED"].includes(o.status)).length;

    // Rule: CA et bénéfice ne comptent QUE les commandes Livrées et encaissées
    const totalRevenue = ordersDeliveredList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const totalProductCost = ordersDeliveredList.reduce((sum, o) => {
      const itemsCost = o.items.reduce((s, it) => s + (it.frozenCostPrice * it.quantity), 0);
      return sum + itemsCost;
    }, 0);

    const totalDeliveryFees = ordersDeliveredList.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Bénéfice = CA encaissé − coût des produits livrés − frais de livraison − dépenses opérationnelles
    const netProfit = totalRevenue - totalProductCost - totalDeliveryFees - totalExpenses;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const deliveryTotalDecided = ordersDelivered + ordersFailed;
    const deliveryRate = deliveryTotalDecided > 0 ? (ordersDelivered / deliveryTotalDecided) * 100 : 0;
    const confirmationRate = ordersReceived > 0 ? (ordersConfirmed / ordersReceived) * 100 : 0;

    const lowStockCount = products.filter((p) => p.currentStock <= p.alertThreshold).length;
    const overdueOrdersCount = orders.filter((o) => {
      if (o.status !== "IN_DELIVERY") return false;
      const orderAgeHours = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 3600);
      return orderAgeHours > 24;
    }).length;

    const cashDiscrepanciesCount = remittances.filter((r) => r.discrepancy !== 0 || r.status === "DISPUTED").length;

    return {
      ordersReceived,
      ordersConfirmed,
      ordersInDelivery,
      ordersDelivered,
      ordersFailed,
      totalRevenue,
      totalProductCost,
      totalDeliveryFees,
      totalExpenses,
      netProfit,
      marginPercent,
      deliveryRate,
      confirmationRate,
      lowStockCount,
      overdueOrdersCount,
      cashDiscrepanciesCount,
    };
  }

  // Check duplicate: same phone + same product within 24 hours
  public checkDuplicate(phone: string, productId: string): Order | undefined {
    const cleanPhone = phone.replace(/\D/g, "");
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;
    return this.orders.find((o) => {
      const orderPhone = o.customerPhone.replace(/\D/g, "");
      const isSamePhone = orderPhone === cleanPhone || orderPhone.endsWith(cleanPhone) || cleanPhone.endsWith(orderPhone);
      const isRecent = new Date(o.createdAt).getTime() >= oneDayAgo;
      const hasProduct = o.items.some((i) => i.productId === productId);
      return isSamePhone && isRecent && hasProduct;
    });
  }

  public createOrder(data: {
    businessId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    zone: string;
    source: Order["source"];
    productId: string;
    quantity: number;
    deliveryFee: number;
    notes?: string;
  }): { order: Order; isDuplicate: boolean } {
    const duplicate = this.checkDuplicate(data.customerPhone, data.productId);
    const product = this.products.find((p) => p.id === data.productId);
    const unitPrice = product ? product.salePrice : 0;
    const costPrice = product ? product.costPrice : 0;
    const totalAmount = unitPrice * data.quantity + (data.deliveryFee || 0);

    const orderNumber = `CMD-GM-${new Date().getFullYear().toString().slice(-2)}${String(
      this.orders.length + 101
    ).padStart(4, "0")}`;

    const newOrder: Order = {
      id: "ord_" + Math.random().toString(36).substring(2, 9),
      businessId: data.businessId,
      orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: data.deliveryAddress,
      zone: data.zone,
      source: data.source,
      status: "NEW",
      totalAmount,
      deliveryFee: data.deliveryFee,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "item_" + Math.random().toString(36).substring(2, 9),
          productId: data.productId,
          productName: product ? product.name : "Produit inconnu",
          quantity: data.quantity,
          unitPrice,
          frozenCostPrice: costPrice,
        },
      ],
      statusHistory: [
        {
          id: "h_" + Math.random().toString(36).substring(2, 9),
          toStatus: "NEW",
          changedById: "current_user",
          changedByName: "Mouhamed Konteye",
          note: "Création de la commande",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    this.orders.unshift(newOrder);
    this.persist();
    return { order: newOrder, isDuplicate: !!duplicate };
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    options?: {
      failReason?: string;
      deliveryAgentId?: string;
      note?: string;
      changedByName?: string;
    }
  ): Order | null {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return null;

    const order = this.orders[orderIndex];
    const prevStatus = order.status;
    if (prevStatus === newStatus) return order;

    order.items.forEach((item) => {
      const prod = this.products.find((p) => p.id === item.productId);
      if (!prod) return;

      if (
        (newStatus === "CONFIRMED" || newStatus === "IN_DELIVERY") &&
        prevStatus === "NEW"
      ) {
        prod.reservedStock += item.quantity;
      }

      if (newStatus === "DELIVERED" && prevStatus !== "DELIVERED") {
        prod.currentStock = Math.max(0, prod.currentStock - item.quantity);
        if (prevStatus === "CONFIRMED" || prevStatus === "IN_DELIVERY") {
          prod.reservedStock = Math.max(0, prod.reservedStock - item.quantity);
        }
      }

      if (
        ["FAILED", "RETURNED", "CANCELLED"].includes(newStatus) &&
        ["CONFIRMED", "IN_DELIVERY"].includes(prevStatus)
      ) {
        prod.reservedStock = Math.max(0, prod.reservedStock - item.quantity);
      }
    });

    order.status = newStatus;
    if (newStatus === "DELIVERED") {
      order.deliveredAt = new Date().toISOString();
    }
    if (options?.failReason) {
      order.failReason = options.failReason;
    }
    if (options?.deliveryAgentId) {
      order.deliveryAgentId = options.deliveryAgentId;
    }

    order.statusHistory.push({
      id: "h_" + Math.random().toString(36).substring(2, 9),
      fromStatus: prevStatus,
      toStatus: newStatus,
      changedById: "current_user",
      changedByName: options?.changedByName || "Mouhamed Konteye",
      note: options?.note || (options?.failReason ? `Motif: ${options.failReason}` : undefined),
      createdAt: new Date().toISOString(),
    });

    this.persist();
    return order;
  }

  public createExpense(data: {
    businessId?: string;
    category: Expense["category"];
    amount: number;
    paymentMethod: Expense["paymentMethod"];
    note?: string;
    adPlatform?: Expense["adPlatform"];
    campaignName?: string;
    receiptUrl?: string;
  }): Expense {
    const newExpense: Expense = {
      id: "exp_" + Math.random().toString(36).substring(2, 9),
      businessId: data.businessId === "all" ? undefined : data.businessId,
      date: new Date().toISOString(),
      category: data.category,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      note: data.note,
      adPlatform: data.adPlatform,
      campaignName: data.campaignName,
      receiptUrl: data.receiptUrl,
    };

    this.expenses.unshift(newExpense);
    this.persist();
    return newExpense;
  }

  public updateProductStock(
    productId: string,
    delta: number,
    type: "ARRIVAGE" | "AJUSTEMENT"
  ): Product | null {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return null;

    product.currentStock = Math.max(0, product.currentStock + delta);
    this.persist();
    return product;
  }

  public createProduct(data: {
    businessId: string;
    name: string;
    sku: string;
    salePrice: number;
    costPrice: number;
    alertThreshold: number;
    initialStock: number;
    image?: string;
  }): Product {
    const newProduct: Product = {
      id: "prod_" + Math.random().toString(36).substring(2, 9),
      businessId: data.businessId,
      name: data.name,
      sku: data.sku,
      salePrice: data.salePrice,
      costPrice: data.costPrice,
      alertThreshold: data.alertThreshold || 5,
      currentStock: data.initialStock || 0,
      reservedStock: 0,
      active: true,
      image: data.image || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60",
    };

    this.products.unshift(newProduct);
    this.persist();
    return newProduct;
  }

  public createCashRemittance(data: {
    deliveryAgentId: string;
    deliveryAgentName: string;
    businessId: string;
    expectedAmount: number;
    remittedAmount: number;
    notes?: string;
    orderIds?: string[];
  }): CashRemittance {
    const discrepancy = data.remittedAmount - data.expectedAmount;
    const newRemittance: CashRemittance = {
      id: "rem_" + Math.random().toString(36).substring(2, 9),
      deliveryAgentId: data.deliveryAgentId,
      deliveryAgentName: data.deliveryAgentName,
      businessId: data.businessId,
      date: new Date().toISOString(),
      expectedAmount: data.expectedAmount,
      remittedAmount: data.remittedAmount,
      discrepancy,
      status: discrepancy === 0 ? "VERIFIED" : "DISPUTED",
      notes: data.notes,
      orderIds: data.orderIds || [],
    };

    this.remittances.unshift(newRemittance);
    this.persist();
    return newRemittance;
  }
}

export const store = new DataStore();
