const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orders = await prisma.customerOrder.findMany();
  console.log('--- AUDIT DES COMMANDES ---');
  let count = 0;
  for (const o of orders) {
    const expectedTotal = o.quantity * o.prixVente + o.shippingFee;
    if (o.amountCollected !== expectedTotal && o.status === 'Livree') {
      console.log(`Mismatch detected: Order ID ${o.id.substring(0,8)} | Client: ${o.clientName} | Prix: ${o.prixVente} | Qté: ${o.quantity} | Shipping: ${o.shippingFee} | Collected in DB: ${o.amountCollected} | Expected: ${expectedTotal}`);
      count++;
    }
  }
  console.log(`Total mismatching delivered orders: ${count}`);

  // Fix the order for 'aziz seck' specifically
  const azizOrder = await prisma.customerOrder.findFirst({
    where: { clientName: { contains: 'aziz' } }
  });

  if (azizOrder) {
    const expected = azizOrder.quantity * azizOrder.prixVente + azizOrder.shippingFee;
    await prisma.customerOrder.update({
      where: { id: azizOrder.id },
      data: { amountCollected: expected }
    });
    console.log(`\nSuccessfully updated 'aziz seck' order collected amount in database to: ${expected}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
