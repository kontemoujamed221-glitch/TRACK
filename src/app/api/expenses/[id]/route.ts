import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Dépense introuvable.' }, { status: 404 });
    }

    // Safety lock: if linked to Alibaba Supplier Order, reject editing here
    if (existingExpense.description?.startsWith('Achat marchandise - Réf Commande:')) {
      return NextResponse.json(
        { error: 'Cette dépense est liée à un achat Alibaba. Veuillez la modifier dans l\'onglet "Achats Fournisseurs" du module Produits & Stocks.' },
        { status: 400 }
      );
    }

    const amt = parseFloat(amount);
    const exRate = parseFloat(exchangeRate || 1);
    const amtXof = amt * exRate;

    const updatedExpense = await prisma.expense.update({
      where: { id },
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
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Failed to update expense:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification de la dépense.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Dépense introuvable.' }, { status: 404 });
    }

    // Safety lock: if linked to Alibaba Supplier Order, reject deletion here
    if (existingExpense.description?.startsWith('Achat marchandise - Réf Commande:')) {
      return NextResponse.json(
        { error: 'Cette dépense est liée à un achat Alibaba. Veuillez la supprimer dans l\'onglet "Achats Fournisseurs" du module Produits & Stocks.' },
        { status: 400 }
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la dépense.' }, { status: 500 });
  }
}
