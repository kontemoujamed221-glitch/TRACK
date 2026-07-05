import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, sku, category, prixVenteActuel, seuilAlerte, status, stockActuel } = await request.json();

    if (!name || !sku || prixVenteActuel === undefined) {
      return NextResponse.json(
        { error: 'Veuillez renseigner le nom, le SKU et le prix de vente.' },
        { status: 400 }
      );
    }

    // Check if SKU is used by another product
    const existingSku = await prisma.product.findFirst({
      where: { sku, id: { not: id } },
    });
    if (existingSku) {
      return NextResponse.json(
        { error: 'Un autre produit utilise déjà ce SKU.' },
        { status: 400 }
      );
    }

    // Fetch current stock to detect manual adjustment
    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    }

    const newStock = stockActuel !== undefined ? parseInt(stockActuel) : current.stockActuel;
    const stockDiff = newStock - current.stockActuel;

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name,
          sku,
          category: category || '',
          prixVenteActuel: parseFloat(prixVenteActuel),
          seuilAlerte: seuilAlerte ? parseInt(seuilAlerte) : 5,
          status,
          stockActuel: newStock,
        },
      });

      // Create a stock movement if stock was manually changed
      if (stockDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            type: stockDiff > 0 ? 'entree' : 'sortie',
            quantity: Math.abs(stockDiff),
            notes: `Ajustement manuel du stock (${stockDiff > 0 ? '+' : ''}${stockDiff})`,
            date: new Date(),
          },
        });
      }

      return updated;
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du produit.' }, { status: 500 });
  }
}
