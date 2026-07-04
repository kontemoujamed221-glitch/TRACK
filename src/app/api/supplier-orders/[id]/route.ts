import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const qty = parseInt(quantity);
    const cUnit = parseFloat(costUnit);
    const exRate = parseFloat(exchangeRate);
    const fee = parseFloat(transportCustomsFee || 0);

    const costRevientUnit = ((cUnit * qty * exRate) + fee) / qty;
    const parsedDateOrder = new Date(dateOrder);
    const parsedDateReceive = dateReceive ? new Date(dateReceive) : null;

    // Get old order to compare status
    const oldOrder = await prisma.supplierOrder.findUnique({
      where: { id },
    });

    if (!oldOrder) {
      return NextResponse.json({ error: 'Commande fournisseur introuvable.' }, { status: 404 });
    }

    const wasReceived = oldOrder.status === 'recu' || oldOrder.status === 'dedouane';
    const isReceived = status === 'recu' || status === 'dedouane';

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update the SupplierOrder
      const order = await tx.supplierOrder.update({
        where: { id },
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

      // 2. Sync associated Expense
      const totalXof = (cUnit * qty * exRate) + fee;
      const expenseDescPrefix = `Achat marchandise - Réf Commande: ${id.substring(0, 8)}`;
      
      const existingExpense = await tx.expense.findFirst({
        where: {
          description: { startsWith: expenseDescPrefix },
        },
      });

      if (existingExpense) {
        await tx.expense.update({
          where: { id: existingExpense.id },
          data: {
            subcategory: supplierName || 'Alibaba',
            amount: cUnit * qty,
            currency,
            exchangeRate: exRate,
            amountXof: totalXof,
            date: parsedDateOrder,
          },
        });
      } else {
        await tx.expense.create({
          data: {
            category: 'Achat marchandise',
            subcategory: supplierName || 'Alibaba',
            amount: cUnit * qty,
            currency,
            exchangeRate: exRate,
            amountXof: totalXof,
            date: parsedDateOrder,
            description: expenseDescPrefix,
          },
        });
      }

      // 3. Update stock and stock movements based on transition
      if (!wasReceived && isReceived) {
        // Commanded -> Received: increment stock, log entry
        await tx.product.update({
          where: { id: productId },
          data: { stockActuel: { increment: qty } },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'entree',
            quantity: qty,
            refId: id,
            notes: `Réception approvisionnement Alibaba (Lot: ${id.substring(0, 8)})`,
            date: parsedDateReceive || new Date(),
          },
        });
      } else if (wasReceived && !isReceived) {
        // Received -> Commanded: decrement stock, remove movement
        await tx.product.update({
          where: { id: productId },
          data: { stockActuel: { decrement: oldOrder.quantity } },
        });

        await tx.stockMovement.deleteMany({
          where: { refId: id, type: 'entree' },
        });
      } else if (wasReceived && isReceived) {
        // Quantity / Product changes while remaining in received status
        if (oldOrder.productId !== productId) {
          // Changed product: decrement old, increment new
          await tx.product.update({
            where: { id: oldOrder.productId },
            data: { stockActuel: { decrement: oldOrder.quantity } },
          });

          await tx.product.update({
            where: { id: productId },
            data: { stockActuel: { increment: qty } },
          });
        } else if (oldOrder.quantity !== qty) {
          // Same product, changed quantity: adjust diff
          const diff = qty - oldOrder.quantity;
          await tx.product.update({
            where: { id: productId },
            data: { stockActuel: { increment: diff } },
          });
        }

        // Re-write stock movements
        await tx.stockMovement.deleteMany({
          where: { refId: id },
        });
        await tx.stockMovement.create({
          data: {
            productId,
            type: 'entree',
            quantity: qty,
            refId: id,
            notes: `Réception approvisionnement Alibaba (Lot: ${id.substring(0, 8)})`,
            date: parsedDateReceive || new Date(),
          },
        });
      }

      return order;
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to update supplier order:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la commande fournisseur.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const oldOrder = await prisma.supplierOrder.findUnique({
      where: { id },
    });

    if (!oldOrder) {
      return NextResponse.json({ error: 'Commande fournisseur introuvable.' }, { status: 404 });
    }

    const wasReceived = oldOrder.status === 'recu' || oldOrder.status === 'dedouane';

    await prisma.$transaction(async (tx) => {
      // 1. If received, decrease stock and remove stock movement
      if (wasReceived) {
        await tx.product.update({
          where: { id: oldOrder.productId },
          data: { stockActuel: { decrement: oldOrder.quantity } },
        });

        await tx.stockMovement.deleteMany({
          where: { refId: id },
        });
      }

      // 2. Delete associated Expense
      const expenseDescPrefix = `Achat marchandise - Réf Commande: ${id.substring(0, 8)}`;
      await tx.expense.deleteMany({
        where: {
          description: { startsWith: expenseDescPrefix },
        },
      });

      // 3. Delete the SupplierOrder
      await tx.supplierOrder.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete supplier order:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la commande fournisseur.' }, { status: 500 });
  }
}
