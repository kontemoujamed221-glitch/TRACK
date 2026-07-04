import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const orders = await prisma.supplierOrder.findMany({
      include: {
        product: {
          select: { name: true, sku: true },
        },
      },
      orderBy: { dateOrder: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch supplier orders:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des achats.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const {
      productId,
      quantity,
      costUnit,
      currency,
      exchangeRate,
      transportCustomsFee,
      status,
      dateOrder,
      dateReceive,
      supplierName,
      supplierLink,
    } = await request.json();

    if (!productId || !quantity || !costUnit || !exchangeRate || !dateOrder) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs obligatoires.' },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity);
    const cUnit = parseFloat(costUnit);
    const exRate = parseFloat(exchangeRate);
    const fee = parseFloat(transportCustomsFee || 0);

    // Calculate real cost of unit in XOF
    const costRevientUnit = ((cUnit * qty * exRate) + fee) / qty;

    const parsedDateOrder = new Date(dateOrder);
    const parsedDateReceive = dateReceive ? new Date(dateReceive) : null;

    // Use Prisma transaction to ensure atomic operations
    const supplierOrder = await prisma.$transaction(async (tx) => {
      // 1. Create SupplierOrder
      const order = await tx.supplierOrder.create({
        data: {
          productId,
          quantity: qty,
          costUnit: cUnit,
          currency,
          exchangeRate: exRate,
          transportCustomsFee: fee,
          costRevientUnit,
          status,
          dateOrder: parsedDateOrder,
          dateReceive: parsedDateReceive,
          supplierName: supplierName || '',
          supplierLink: supplierLink || '',
        },
      });

      // 2. Automatically create associated Expense (Achat marchandise)
      // Total spent = (CostUnit * Quantity * exchangeRate) + transportCustomsFee
      const totalXof = (cUnit * qty * exRate) + fee;
      
      await tx.expense.create({
        data: {
          category: 'Achat marchandise',
          subcategory: supplierName || 'Alibaba',
          amount: cUnit * qty,
          currency,
          exchangeRate: exRate,
          amountXof: totalXof,
          date: parsedDateOrder,
          description: `Achat marchandise - Réf Commande: ${order.id.substring(0, 8)}`,
        },
      });

      // 3. If marked as Received/Customs Cleared, update Stock & create Movement
      const isReceived = status === 'recu' || status === 'dedouane';
      if (isReceived) {
        // Increment stock
        await tx.product.update({
          where: { id: productId },
          data: {
            stockActuel: { increment: qty },
          },
        });

        // Log movement
        await tx.stockMovement.create({
          data: {
            productId,
            type: 'entree',
            quantity: qty,
            refId: order.id,
            notes: `Réception approvisionnement Alibaba (Lot: ${order.id.substring(0, 8)})`,
            date: parsedDateReceive || new Date(),
          },
        });
      }

      return order;
    });

    return NextResponse.json(supplierOrder);
  } catch (error) {
    console.error('Failed to create supplier order:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la commande fournisseur.' }, { status: 500 });
  }
}
