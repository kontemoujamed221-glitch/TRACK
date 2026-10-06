import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { OrderStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: "GMD" | "XOF" = "GMD"): string {
  const rounded = Math.round(amount || 0);
  const formatted = new Intl.NumberFormat("fr-FR").format(rounded).replace(/\u202F/g, " ");
  return `${formatted} GMD`;
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateShort(dateString: string | Date): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Gambia standard (+220) if 7 digits (e.g. 3xxxxxx, 7xxxxxx, 9xxxxxx, 2xxxxxx)
  if (digits.length === 7) {
    return `220${digits}`;
  }
  // Already has 220 prefix + 7 digits
  if (digits.length === 10 && digits.startsWith("220")) {
    return digits;
  }
  // Fallback for Senegal (+221) if 9 digits starting with 7
  if (digits.length === 9 && digits.startsWith("7")) {
    return `221${digits}`;
  }
  return digits;
}

export function getWhatsAppLink(
  phone: string,
  customerName: string,
  orderNumber: string,
  totalAmount: number,
  productSummary?: string
): string {
  const cleaned = cleanPhoneNumber(phone);
  const message = encodeURIComponent(
    `Bonjour ${customerName},\n\n` +
      `C'est le service de livraison pour votre commande #${orderNumber}` +
      (productSummary ? ` (${productSummary})` : "") +
      ` d'un montant de ${formatCurrency(totalAmount)}.\n\n` +
      `Notre livreur prépare votre commande. Pouvez-vous nous confirmer votre disponibilité aujourd'hui ? Merci !`
  );
  return `https://wa.me/${cleaned}?text=${message}`;
}

export function getStatusDetails(status: OrderStatus) {
  switch (status) {
    case "NEW":
      return {
        label: "Nouvelle",
        badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
        dotClass: "bg-blue-500",
        description: "Reçue, en attente d'appel client",
      };
    case "CONFIRMED":
      return {
        label: "Confirmée",
        badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50",
        dotClass: "bg-indigo-500",
        description: "Client contacté, stock réservé",
      };
    case "IN_DELIVERY":
      return {
        label: "En livraison",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
        dotClass: "bg-amber-500",
        description: "Colis confié au livreur sur le terrain",
      };
    case "DELIVERED":
      return {
        label: "Livrée & Encaissée",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
        dotClass: "bg-emerald-500",
        description: "Montant encaissé, stock décompté",
      };
    case "FAILED":
      return {
        label: "Échouée",
        badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
        dotClass: "bg-rose-500",
        description: "Client injoignable, refus ou faux numéro",
      };
    case "RETURNED":
      return {
        label: "Retournée",
        badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
        dotClass: "bg-orange-500",
        description: "Colis revenu en stock",
      };
    case "CANCELLED":
      return {
        label: "Annulée",
        badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
        dotClass: "bg-slate-400",
        description: "Annulée avant expédition",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        dotClass: "bg-slate-400",
        description: "",
      };
  }
}
