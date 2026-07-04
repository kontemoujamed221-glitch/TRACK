import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (category) where.category = category;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des dépenses.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const {
      category,
      subcategory,
      amount,
      currency,
      exchangeRate,
      date,
      description,
      receiptUrl,
    } = await request.json();

    if (!category || amount === undefined || !date) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs obligatoires (catégorie, montant, date).' },
        { status: 400 }
      );
    }

    const amt = parseFloat(amount);
    const exRate = parseFloat(exchangeRate || 1);
    const amtXof = amt * exRate;

    const expense = await prisma.expense.create({
      data: {
        category,
        subcategory: subcategory || '',
        amount: amt,
        currency: currency || 'XOF',
        exchangeRate: exRate,
        amountXof: amtXof,
        date: new Date(date),
        description: description || '',
        receiptUrl: receiptUrl || '',
        createdById: userId,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la dépense.' }, { status: 500 });
  }
}
