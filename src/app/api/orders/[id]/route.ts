import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const {
      productId,
      quantity,
      clientName,
      clientTel,
      clientAddress,
      clientCity,
      source,
      campaign,
      prixVente,
      status,
      courierName,
      shippingFee,
      amountCollected,
      dateOrder,
      dateDelivery,
      confirmedByTel,
      note,
    } = await request.json();

    const qty = parseInt(quantity);
    const price = parseFloat(prixVente);
    const shipFee = parseFloat(shippingFee || 0);
    const collected = parseFloat(amountCollected || 0);
    const isConfirmed = !!confirmedByTel;
    
    const parsedDateOrder = new Date(dateOrder);
    const parsedDateDelivery = dateDelivery ? new Date(dateDelivery) : (status === 'Livree' ? parsedDateOrder : null);

    // Fetch old order
    const oldOrder = await prisma.customerOrder.findUnique({
      where: { id },
    });

    if (!oldOrder) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    const wasDelivered = oldOrder.status === 'Livree';
    const isDelivered = status === 'Livree';

    // If confirmation status changed
    let confirmedAt = oldOrder.confirmedAt;
    if (isConfirmed && !oldOrder.confirmedByTel) {
      confirmedAt = new Date();
    } else if (!isConfirmed) {
      confirmedAt = null;
    }

    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update the order
      const order = await tx.customerOrder.update({
        where: { id },
        data: {
          productId,
          quantity: qty,
          clientName,
          clientTel,
          clientAddress: clientAddress || '',
          clientCity,
          source,
          campaign: campaign || '',
          prixVente: price,
          status,
          courierName: courierName || '',
          shippingFee: shipFee,
          amountCollected: isDelivered ? (collected || price) : collected,
          dateOrder: parsedDateOrder,
          dateDelivery: parsedDateDelivery,
          confirmedByTel: isConfirmed,
          confirmedAt,
          note: note || '',
        },
      });

      // 2. Adjust stock levels based on status changes
      if (!wasDelivered && isDelivered) {
        // Transition: Not Delivered -> Delivered
        await tx.product.update({
          where: { id: productId },
          data: { stockActuel: { decrement: qty } },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'sortie',
            quantity: qty,
            refId: id,
            notes: `Commande client livrée (Réf: ${id.substring(0, 8)})`,
            date: parsedDateDelivery || new Date(),
          },
        });
      } else if (wasDelivered && !isDelivered) {
        // Transition: Delivered -> Not Delivered
        await tx.product.update({
          where: { id: oldOrder.productId },
          data: { stockActuel: { increment: oldOrder.quantity } },
        });

        await tx.stockMovement.deleteMany({
          where: { refId: id, type: 'sortie' },
        });
      } else if (wasDelivered && isDelivered) {
        // Transition: Delivered -> Delivered (Product or Quantity change)
        if (oldOrder.productId !== productId) {
          // Changed product
          await tx.product.update({
            where: { id: oldOrder.productId },
            data: { stockActuel: { increment: oldOrder.quantity } },
          });

          await tx.product.update({
            where: { id: productId },
            data: { stockActuel: { decrement: qty } },
          });
        } else if (oldOrder.quantity !== qty) {
          // Same product, changed quantity
          const diff = qty - oldOrder.quantity; // positive means we sold more, so decrement inventory
          await tx.product.update({
            where: { id: productId },
            data: { stockActuel: { decrement: diff } },
          });
        }

        // Re-write stock movements
        await tx.stockMovement.deleteMany({
          where: { refId: id },
        });
        await tx.stockMovement.create({
          data: {
            productId,
            type: 'sortie',
            quantity: qty,
            refId: id,
            notes: `Commande client livrée (Réf: ${id.substring(0, 8)})`,
            date: parsedDateDelivery || new Date(),
          },
        });
      }

      return order;
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la commande.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const oldOrder = await prisma.customerOrder.findUnique({
      where: { id },
    });

    if (!oldOrder) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    const wasDelivered = oldOrder.status === 'Livree';

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Restore stock if the order was delivered
      if (wasDelivered) {
        await tx.product.update({
          where: { id: oldOrder.productId },
          data: { stockActuel: { increment: oldOrder.quantity } },
        });

        await tx.stockMovement.deleteMany({
          where: { refId: id },
        });
      }

      // 2. Delete the order
      await tx.customerOrder.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete order:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la commande.' }, { status: 500 });
  }
}
