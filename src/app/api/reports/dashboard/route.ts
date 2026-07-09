import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const CHANNELS = [
  'Meta Ads', 'Organique Facebook',
  'TikTok Organic', 'Instagram', 'WhatsApp', 'Autre'
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 30 days in UTC
    const defaultStart = new Date();
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 30);
    defaultStart.setUTCHours(0, 0, 0, 0);

    const startDate = startDateParam ? new Date(`${startDateParam}T00:00:00.000Z`) : defaultStart;
    
    let endDate: Date;
    if (endDateParam) {
      endDate = new Date(`${endDateParam}T23:59:59.999Z`);
    } else {
      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
    }

    // 1. Fetch delivered orders for the period based on their order date
    const deliveredOrders = await prisma.customerOrder.findMany({
      where: {
        status: 'Livree',
        dateOrder: { gte: startDate, lte: endDate },
      },
    });

    // 1b. Fetch confirmed (not yet delivered) orders for the period — pending revenue
    const confirmedOrders = await prisma.customerOrder.findMany({
      where: {
        status: { in: ['Confirmee', 'En livraison'] },
        dateOrder: { gte: startDate, lte: endDate },
      },
    });

    // 2. Fetch expenses for the period
    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    // 3. Fetch all orders created in this period (to compute status conversion rates)
    const periodOrders = await prisma.customerOrder.findMany({
      where: {
        dateOrder: { gte: startDate, lte: endDate },
      },
    });

    // 4. Financial Sums
    const revenue = deliveredOrders.reduce((sum, o) => sum + o.amountCollected, 0);
    const revenuePotentiel = confirmedOrders.reduce((sum, o) => sum + (o.prixVente * o.quantity), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amountXof, 0);
    const profitNet = revenue - totalExpenses;

    const expensesBreakdown = {
      merchandise: expenses.filter(e => e.category === 'Achat marchandise').reduce((sum, e) => sum + e.amountXof, 0),
      advertising: expenses.filter(e => e.category === 'Publicité').reduce((sum, e) => sum + e.amountXof, 0),
      shipping: expenses.filter(e => e.category === 'Livraison').reduce((sum, e) => sum + e.amountXof, 0),
      other: expenses.filter(e => e.category === 'Autres frais').reduce((sum, e) => sum + e.amountXof, 0),
    };

    // 5. Order conversion rates
    const totalOrdersCount = periodOrders.length;
    const deliveredCount = periodOrders.filter(o => o.status === 'Livree').length;
    const returnedCount = periodOrders.filter(o => o.status === 'Retournee').length;
    const cancelledCount = periodOrders.filter(o => o.status === 'Annulee').length;
    const pendingCount = periodOrders.filter(o => ['Nouvelle', 'Confirmee', 'En livraison'].includes(o.status)).length;

    const rates = {
      total: totalOrdersCount,
      delivery: totalOrdersCount > 0 ? (deliveredCount / totalOrdersCount) * 100 : 0,
      return: totalOrdersCount > 0 ? (returnedCount / totalOrdersCount) * 100 : 0,
      cancellation: totalOrdersCount > 0 ? (cancelledCount / totalOrdersCount) * 100 : 0,
      delivered: deliveredCount,
      returned: returnedCount,
      cancelled: cancelledCount,
      pending: pendingCount,
    };

    // 6. Margin per Product (using Weighted Average Cost (WAC) logic)
    const products = await prisma.product.findMany({
      include: {
        supplierOrders: {
          where: {
            status: { in: ['recu', 'dedouane'] },
          },
        },
      },
    });

    const productWacMap = new Map<string, number>();
    products.forEach((p) => {
      if (p.prixAchat && p.prixAchat > 0) {
        productWacMap.set(p.id, p.prixAchat + (p.prixTransport || 0));
      } else {
        const totalQty = p.supplierOrders.reduce((sum, o) => sum + o.quantity, 0);
        if (totalQty > 0) {
          const totalCost = p.supplierOrders.reduce((sum, o) => {
            return sum + (o.costUnit * o.quantity * o.exchangeRate + o.transportCustomsFee);
          }, 0);
          productWacMap.set(p.id, totalCost / totalQty);
        } else {
          // If no purchase logged, fallback to WAC = 0
          productWacMap.set(p.id, 0);
        }
      }
    });

    const productMargins: Record<string, any> = {};
    products.forEach((p) => {
      productMargins[p.id] = {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitsSold: 0,
        revenue: 0,
        costStockSold: 0,
        shippingFees: 0,
        netProfit: 0,
      };
    });

    deliveredOrders.forEach((o) => {
      const wac = productWacMap.get(o.productId) || 0;
      const stats = productMargins[o.productId];
      if (stats) {
        stats.unitsSold += o.quantity;
        stats.revenue += o.amountCollected;
        stats.costStockSold += o.quantity * wac;
        stats.shippingFees += o.shippingFee;
      }
    });

    const productMarginsList = Object.values(productMargins)
      .map((stats: any) => {
        stats.netProfit = stats.revenue - stats.costStockSold - stats.shippingFees;
        return stats;
      })
      .filter((stats: any) => stats.unitsSold > 0 || stats.revenue > 0);

    // 7. Channel ROI
    const adSpends = expenses.filter((e) => e.category === 'Publicité');
    const channelSpendMap = new Map<string, number>();
    adSpends.forEach((e) => {
      const channel = e.subcategory || 'Autre';
      channelSpendMap.set(channel, (channelSpendMap.get(channel) || 0) + e.amountXof);
    });

    const channelRevenueMap = new Map<string, number>();
    deliveredOrders.forEach((o) => {
      const channel = o.source || 'Autre';
      channelRevenueMap.set(channel, (channelRevenueMap.get(channel) || 0) + o.amountCollected);
    });

    const allChannels = Array.from(
      new Set([
        ...CHANNELS,
        ...Array.from(channelSpendMap.keys()),
        ...Array.from(channelRevenueMap.keys()),
      ])
    );

    const channelRoiList = allChannels
      .map((channel) => {
        const spend = channelSpendMap.get(channel) || 0;
        const revenue = channelRevenueMap.get(channel) || 0;
        const roi = spend > 0 ? (revenue / spend) * 100 : 0;
        const orderCount = periodOrders.filter((o) => o.source === channel).length;

        return {
          channel,
          spend,
          revenue,
          roi,
          orderCount,
        };
      })
      .filter((c) => c.spend > 0 || c.revenue > 0 || c.orderCount > 0);

    // 8. Daily Evolution data (CA, Expenses, Profit)
    const dateMap = new Map<string, { date: string; revenue: number; expenses: number; profit: number }>();
    
    // Seed all days in range
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = curr.toISOString().substring(0, 10);
      dateMap.set(dateStr, { date: dateStr, revenue: 0, expenses: 0, profit: 0 });
      curr.setDate(curr.getDate() + 1);
    }

    deliveredOrders.forEach((o) => {
      const dateStr = o.dateOrder.toISOString().substring(0, 10);
      const dayData = dateMap.get(dateStr);
      if (dayData) {
        dayData.revenue += o.amountCollected;
      }
    });

    expenses.forEach((e) => {
      const dateStr = e.date.toISOString().substring(0, 10);
      const dayData = dateMap.get(dateStr);
      if (dayData) {
        dayData.expenses += e.amountXof;
      }
    });

    const evolution = Array.from(dateMap.values())
      .map((d) => {
        d.profit = d.revenue - d.expenses;
        return d;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      revenue,
      revenuePotentiel,
      confirmedOrdersCount: confirmedOrders.length,
      totalExpenses,
      profitNet,
      expensesBreakdown,
      rates,
      productMargins: productMarginsList,
      channelRoi: channelRoiList,
      evolution,
    });
  } catch (error) {
    console.error('Failed to generate dashboard report:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport.' }, { status: 500 });
  }
}
