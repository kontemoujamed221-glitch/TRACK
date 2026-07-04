import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const productId = searchParams.get('productId');
    const city = searchParams.get('city');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (status) where.status = status;
    if (source) where.source = source;
    if (productId) where.productId = productId;
    if (city) where.clientCity = city;
    
    if (search) {
      where.OR = [
        { clientName: { contains: search } },
        { clientTel: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.dateOrder = {};
      if (startDate) where.dateOrder.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.dateOrder.lte = end;
      }
    }

    const orders = await prisma.customerOrder.findMany({
      where,
      include: {
        product: {
          select: { name: true, sku: true, prixVenteActuel: true },
        },
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des commandes.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
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

    if (!productId || !quantity || !clientName || !clientTel || !clientCity || !source || prixVente === undefined) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs obligatoires.' },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity);
    const price = parseFloat(prixVente);
    const shipFee = parseFloat(shippingFee || 0);
    const collected = parseFloat(amountCollected || 0);
    const isConfirmed = !!confirmedByTel;
    
    const parsedDateOrder = dateOrder ? new Date(dateOrder) : new Date();
    const parsedDateDelivery = dateDelivery ? new Date(dateDelivery) : (status === 'Livree' ? parsedDateOrder : null);

    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.customerOrder.create({
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
          amountCollected: status === 'Livree' ? (collected || price) : collected,
          dateOrder: parsedDateOrder,
          dateDelivery: parsedDateDelivery,
          confirmedByTel: isConfirmed,
          confirmedAt: isConfirmed ? new Date() : null,
          note: note || '',
          createdById: userId,
        },
      });

      // 2. Adjust inventory if delivered
      if (status === 'Livree') {
        await tx.product.update({
          where: { id: productId },
          data: {
            stockActuel: { decrement: qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'sortie',
            quantity: qty,
            refId: order.id,
            notes: `Commande client livrée (Réf: ${order.id.substring(0, 8)})`,
            date: parsedDateDelivery || new Date(),
          },
        });
      }

      return order;
    });

    return NextResponse.json(newOrder);
  } catch (error) {
    console.error('Failed to create order:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la commande.' }, { status: 500 });
  }
}
