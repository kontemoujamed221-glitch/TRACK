import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const revenues = await prisma.motorcycleRevenue.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Also calculate overall cumulative sum (all time) and statistics
    const allRevenues = await prisma.motorcycleRevenue.findMany({
      select: { amount: true, date: true },
    });

    const totalCumulative = allRevenues.reduce((sum, r) => sum + r.amount, 0);
    const totalDaysCount = allRevenues.length;
    const averagePerDay = totalDaysCount > 0 ? totalCumulative / totalDaysCount : 0;

    // Compute revenue for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthRevenue = allRevenues
      .filter((r) => new Date(r.date) >= startOfMonth)
      .reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      revenues,
      summary: {
        totalCumulative,
        totalDaysCount,
        averagePerDay,
        currentMonthRevenue,
      },
    });
  } catch (error) {
    console.error('Failed to fetch motorcycle revenues:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des recettes moto.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const { amount, date, driverName, notes } = await request.json();

    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Veuillez remplir un montant valide.' }, { status: 400 });
    }

    const parsedAmount = Math.max(0, parseFloat(amount));
    const parsedDate = date ? new Date(date) : new Date();

    const newRevenue = await prisma.motorcycleRevenue.create({
      data: {
        amount: parsedAmount,
        date: parsedDate,
        driverName: driverName || '',
        notes: notes || '',
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(newRevenue);
  } catch (error) {
    console.error('Failed to create motorcycle revenue:', error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de la recette moto." }, { status: 500 });
  }
}
