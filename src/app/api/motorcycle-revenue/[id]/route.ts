import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { amount, date, driverName, notes } = await request.json();

    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Veuillez remplir un montant valide.' }, { status: 400 });
    }

    const updatedRevenue = await prisma.motorcycleRevenue.update({
      where: { id },
      data: {
        amount: Math.max(0, parseFloat(amount)),
        date: date ? new Date(date) : undefined,
        driverName: driverName || '',
        notes: notes || '',
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(updatedRevenue);
  } catch (error) {
    console.error('Failed to update motorcycle revenue:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification de la recette moto.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    await prisma.motorcycleRevenue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete motorcycle revenue:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la recette moto.' }, { status: 500 });
  }
}
