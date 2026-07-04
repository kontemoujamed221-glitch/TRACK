import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des produits.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, sku, category, prixVenteActuel, seuilAlerte } = await request.json();

    if (!name || !sku || prixVenteActuel === undefined) {
      return NextResponse.json(
        { error: 'Veuillez renseigner le nom, le SKU et le prix de vente.' },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Un produit avec ce SKU existe déjà.' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || '',
        prixVenteActuel: parseFloat(prixVenteActuel),
        seuilAlerte: seuilAlerte ? parseInt(seuilAlerte) : 5,
        stockActuel: 0, // Starts at 0, updated via SupplierOrders or stock movements
        status: 'actif',
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du produit.' }, { status: 500 });
  }
}
