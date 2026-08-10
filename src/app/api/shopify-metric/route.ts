import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('dateStr') || 'default';

    const metric = (prisma as any).shopifyMetric
      ? await (prisma as any).shopifyMetric.findUnique({
          where: { dateStr },
        })
      : null;

    return NextResponse.json({
      dateStr,
      totalShopifyOrders: metric ? metric.totalShopifyOrders : 0,
    });
  } catch (error) {
    console.error('Failed to fetch shopify metric:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de la métrique Shopify.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { dateStr = 'default', totalShopifyOrders } = await request.json();

    if (totalShopifyOrders === undefined || totalShopifyOrders === null) {
      return NextResponse.json({ error: 'Veuillez fournir le nombre total de commandes Shopify.' }, { status: 400 });
    }

    const count = Math.max(0, parseInt(totalShopifyOrders) || 0);

    if (!(prisma as any).shopifyMetric) {
      return NextResponse.json({ dateStr, totalShopifyOrders: count });
    }

    const updatedMetric = await (prisma as any).shopifyMetric.upsert({
      where: { dateStr },
      update: { totalShopifyOrders: count },
      create: { dateStr, totalShopifyOrders: count },
    });

    return NextResponse.json(updatedMetric);
  } catch (error) {
    console.error('Failed to update shopify metric:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la métrique Shopify.' }, { status: 500 });
  }
}
