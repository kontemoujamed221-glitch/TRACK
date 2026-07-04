import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: {
          select: { name: true, sku: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(movements);
  } catch (error) {
    console.error('Failed to fetch stock movements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique des stocks.' },
      { status: 500 }
    );
  }
}
