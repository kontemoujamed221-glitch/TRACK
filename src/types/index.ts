export type UserRole = "OWNER_ADMIN" | "CONFIRMATOR" | "DELIVERY_AGENT";

export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "CANCELLED";

export type ExpenseCategory =
  | "ADS_FACEBOOK"
  | "ADS_TIKTOK"
  | "INVENTORY_PURCHASE"
  | "SHIPPING_LOGISTICS"
  | "SALARY_COMMISSION"
  | "TOOLS_SUBSCRIPTIONS"
  | "OTHER";

export type StockMovementType =
  | "IN_ARRIVAGE"
  | "OUT_DELIVERY"
  | "RETURN_RESTOCK"
  | "ADJUSTMENT_LOSS";

export type RemittanceStatus = "PENDING" | "VERIFIED" | "DISPUTED";

export interface Business {
  id: string;
  name: string;
  country: "Gambie";
  currency: "GMD";
  description?: string;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  businessIds: string[];
}

export interface ProductBatch {
  id: string;
  batchNumber: string;
  quantityReceived: number;
  unitPurchaseCost: number;
  unitShippingCost: number;
  unitCustomsCost: number;
  totalCostPerUnit: number;
  supplier?: string;
  receivedDate: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  image?: string;
  salePrice: number; // in Gambian Dalasi (GMD)
  costPrice: number; // estimated purchase + freight + customs
  alertThreshold: number;
  currentStock: number; // available
  reservedStock: number; // in confirmed / in delivery
  active: boolean;
  batches?: ProductBatch[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  frozenCostPrice: number;
}

export interface StatusHistory {
  id: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedById: string;
  changedByName: string;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  businessId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  zone: string;
  source: "Facebook Ads" | "TikTok Ads" | "WhatsApp" | "Organique" | "Autre";
  status: OrderStatus;
  failReason?: string;
  totalAmount: number; // Total to collect from customer (GMD)
  deliveryFee: number;
  deliveryAgentId?: string;
  confirmerId?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
  statusHistory: StatusHistory[];
}

export interface Expense {
  id: string;
  businessId?: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: "Wave" | "QMoney" | "Afrimoney" | "Espèces" | "Virement" | "Carte Bancaire";
  note?: string;
  receiptUrl?: string;
  adPlatform?: "Facebook Ads" | "TikTok Ads" | "Google Ads" | "Autre";
  campaignName?: string;
}

export interface CashRemittance {
  id: string;
  deliveryAgentId: string;
  deliveryAgentName: string;
  businessId: string;
  date: string;
  expectedAmount: number;
  remittedAmount: number;
  discrepancy: number; // remitted - expected
  status: RemittanceStatus;
  verifiedById?: string;
  notes?: string;
  orderIds: string[];
}

export interface DailyProblemNote {
  id: string;
  text: string;
  category?: "LOGISTICS" | "CLIENT" | "STOCK" | "CASH" | "OTHER";
  resolved: boolean;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  country: "Sénégal" | "Gambie";
  city: string;
  defaultDeliveryFee: number;
}

export type DateFilterType = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "all";
