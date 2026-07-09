const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

let prisma;
const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql');

if (isPostgres) {
  prisma = new PrismaClient();
} else {
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl || 'file:./dev.db',
  });
  prisma = new PrismaClient({ adapter });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}T12:00:00Z`);
}

async function main() {
  console.log('Seeding real data...');

  // 1. Clean existing data
  await prisma.stockMovement.deleteMany({});
  await prisma.supplierOrder.deleteMany({});
  await prisma.customerOrder.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create users
  const ownerPassword = 'OwnerPassword123!';
  const associatePassword = 'AssociatePassword123!';
  const ownerHash = hashPassword(ownerPassword);
  const associateHash = hashPassword(associatePassword);

  const owner = await prisma.user.create({
    data: {
      id: 'usr-owner-id',
      name: 'Propriétaire',
      email: 'owner@cod.sn',
      passwordHash: ownerHash,
      role: 'admin',
    },
  });

  const associate = await prisma.user.create({
    data: {
      id: 'usr-associate-id',
      name: 'Associé',
      email: 'associate@cod.sn',
      passwordHash: associateHash,
      role: 'user',
    },
  });

  // 3. Create products based on inventory expenses
  const pBelt = await prisma.product.create({
    data: {
      id: 'prod-belt',
      name: 'Ceinture Belt',
      sku: 'BELT-01',
      category: 'Accessoires',
      prixVenteActuel: 4000,
      stockActuel: 150,
      seuilAlerte: 10,
      status: 'actif',
    },
  });

  const pEar = await prisma.product.create({
    data: {
      id: 'prod-ear',
      name: "Nettoyeur d'Oreille",
      sku: 'EAR-01',
      category: 'Hygiène',
      prixVenteActuel: 5000,
      stockActuel: 120,
      seuilAlerte: 10,
      status: 'actif',
    },
  });

  const pTea = await prisma.product.create({
    data: {
      id: 'prod-tea',
      name: 'Thé 18 Saveurs',
      sku: 'TEA-18',
      category: 'Santé',
      prixVenteActuel: 8000,
      stockActuel: 90,
      seuilAlerte: 5,
      status: 'actif',
    },
  });

  const pSmile = await prisma.product.create({
    data: {
      id: 'prod-smile',
      name: 'Smile Kit Dentaire',
      sku: 'SMILE-01',
      category: 'Esthétique',
      prixVenteActuel: 14000,
      stockActuel: 200,
      seuilAlerte: 15,
      status: 'actif',
    },
  });

  const pMoto = await prisma.product.create({
    data: {
      id: 'prod-moto',
      name: 'Bluetooth Casque Moto',
      sku: 'BIKE-BT',
      category: 'Technologie',
      prixVenteActuel: 18000,
      stockActuel: 180,
      seuilAlerte: 10,
      status: 'actif',
    },
  });

  const pGeneric = await prisma.product.create({
    data: {
      id: 'prod-generic',
      name: 'Montre Bracelet',
      sku: 'WATCH-01',
      category: 'Accessoires',
      prixVenteActuel: 10000,
      stockActuel: 80,
      seuilAlerte: 5,
      status: 'actif',
    },
  });

  console.log('Created products.');

  // 4. Create customer orders
  const rawOrders = [
    { id: "ORD-1783030309", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "02/07/2026", prodId: pBelt.id },
    { id: "ORD-1782855705", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "30/06/2026", prodId: pBelt.id },
    { id: "ORD-1782652117", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "27/06/2026", prodId: pEar.id },
    { id: "ORD-1782652037", clientName: "Yolland Mondele", clientTel: "78 109 41 82", quantity: 1, price: 8000, status: "Nouvelle", date: "27/06/2026", prodId: pTea.id },
    { id: "ORD-1782467371", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "25/06/2026", prodId: pGeneric.id },
    { id: "ORD-1782386332", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "24/06/2026", prodId: pBelt.id },
    { id: "ORD-1782311755", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 18000, status: "Nouvelle", date: "24/06/2026", prodId: pMoto.id },
    { id: "ORD-1782311419", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 11500, status: "Nouvelle", date: "23/06/2026", prodId: pGeneric.id },
    { id: "ORD-1782311377", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "23/06/2026", prodId: pBelt.id },
    { id: "ORD-1782311356", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 15000, status: "Nouvelle", date: "23/06/2026", prodId: pSmile.id },
    { id: "ORD-1782311316", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "23/06/2026", prodId: pTea.id },
    { id: "ORD-1782218871", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "23/06/2026", prodId: pGeneric.id },
    { id: "ORD-1782218846", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "22/06/2026", prodId: pTea.id },
    { id: "ORD-1782218823", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "22/06/2026", prodId: pTea.id },
    { id: "ORD-1782218805", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "22/06/2026", prodId: pTea.id },
    { id: "ORD-1782218766", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 40000, status: "Nouvelle", date: "22/06/2026", prodId: pMoto.id },
    { id: "ORD-1782218735", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "22/06/2026", prodId: pTea.id },
    { id: "ORD-1782083452", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 19000, status: "Nouvelle", date: "21/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781997669", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "20/06/2026", prodId: pTea.id },
    { id: "ORD-1781997647", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 30000, status: "Nouvelle", date: "20/06/2026", prodId: pSmile.id },
    { id: "ORD-1781997625", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "19/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781914255", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 7000, status: "Nouvelle", date: "19/06/2026", prodId: pEar.id },
    { id: "ORD-1781914214", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 70000, status: "Nouvelle", date: "19/06/2026", prodId: pMoto.id },
    { id: "ORD-1781914147", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "18/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781914132", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "18/06/2026", prodId: pTea.id },
    { id: "ORD-1781741427", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "17/06/2026", prodId: pBelt.id },
    { id: "ORD-1781741298", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "17/06/2026", prodId: pTea.id },
    { id: "ORD-1781741222", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "17/06/2026", prodId: pBelt.id },
    { id: "ORD-1781741157", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 7000, status: "Nouvelle", date: "17/06/2026", prodId: pEar.id },
    { id: "ORD-1781741096", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "17/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781655293", clientName: "Mame bouso", clientTel: "78 540 14 79", quantity: 1, price: 14000, status: "Nouvelle", date: "16/06/2026", prodId: pSmile.id },
    { id: "ORD-1781655155", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "16/06/2026", prodId: pTea.id },
    { id: "ORD-1781655141", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 6000, status: "Nouvelle", date: "16/06/2026", prodId: pEar.id },
    { id: "ORD-1781655126", clientName: "Mouhamed", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "16/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781612487", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "16/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781612270", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "15/06/2026", prodId: pBelt.id },
    { id: "ORD-1781612247", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "15/06/2026", prodId: pTea.id },
    { id: "ORD-1781612228", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 20000, status: "Nouvelle", date: "15/06/2026", prodId: pMoto.id },
    { id: "ORD-1781480327", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 16000, status: "Nouvelle", date: "14/06/2026", prodId: pSmile.id },
    { id: "ORD-1781480301", clientName: "Manguane", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "14/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781480279", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "14/06/2026", prodId: pBelt.id },
    { id: "ORD-1781480261", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "14/06/2026", prodId: pTea.id },
    { id: "ORD-1781390457", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "13/06/2026", prodId: pTea.id },
    { id: "ORD-1781390423", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 16500, status: "Nouvelle", date: "13/06/2026", prodId: pSmile.id },
    { id: "ORD-1781390314", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "13/06/2026", prodId: pTea.id },
    { id: "ORD-1781390285", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "13/06/2026", prodId: pTea.id },
    { id: "ORD-1781370917", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "12/06/2026", prodId: pBelt.id },
    { id: "ORD-1781370892", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "12/06/2026", prodId: pTea.id },
    { id: "ORD-1781370868", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "12/06/2026", prodId: pBelt.id },
    { id: "ORD-1781370846", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "12/06/2026", prodId: pEar.id },
    { id: "ORD-1781219492", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "11/06/2026", prodId: pEar.id },
    { id: "ORD-1781219476", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "11/06/2026", prodId: pEar.id },
    { id: "ORD-1781219461", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "11/06/2026", prodId: pBelt.id },
    { id: "ORD-1781219440", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "11/06/2026", prodId: pBelt.id },
    { id: "ORD-1781219395", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4500, status: "Nouvelle", date: "11/06/2026", prodId: pBelt.id },
    { id: "ORD-1781219374", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "11/06/2026", prodId: pTea.id },
    { id: "ORD-1781108034", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 10000, status: "Nouvelle", date: "10/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781107083", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "10/06/2026", prodId: pBelt.id },
    { id: "ORD-1781107062", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 7000, status: "Nouvelle", date: "10/06/2026", prodId: pEar.id },
    { id: "ORD-1781107014", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 6000, status: "Nouvelle", date: "09/06/2026", prodId: pGeneric.id },
    { id: "ORD-1781106772", clientName: "Adja", clientTel: "76 607 93 04", quantity: 1, price: 4000, status: "Nouvelle", date: "09/06/2026", prodId: pBelt.id },
    { id: "ORD-1781106383", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 4500, status: "Nouvelle", date: "09/06/2026", prodId: pBelt.id },
    { id: "ORD-1780964515", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 8000, status: "Nouvelle", date: "08/06/2026", prodId: pTea.id },
    { id: "ORD-1780964456", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "08/06/2026", prodId: pBelt.id },
    { id: "ORD-1780964437", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "08/06/2026", prodId: pTea.id },
    { id: "ORD-1780964401", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "08/06/2026", prodId: pBelt.id },
    { id: "ORD-1780964374", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "08/06/2026", prodId: pBelt.id },
    { id: "ORD-1780964323", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "08/06/2026", prodId: pBelt.id },
    { id: "ORD-1780964281", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "08/06/2026", prodId: pEar.id },
    { id: "ORD-1780964261", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "08/06/2026", prodId: pEar.id },
    { id: "ORD-1780964243", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "08/06/2026", prodId: pBelt.id },
    { id: "ORD-1780964220", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "08/06/2026", prodId: pBelt.id },
    { id: "ORD-1780867198", clientName: "Abdou", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "07/06/2026", prodId: pEar.id },
    { id: "ORD-1780867183", clientName: "Elhaj Mbaye", clientTel: "77 930 10 95", quantity: 1, price: 8000, status: "Nouvelle", date: "07/06/2026", prodId: pTea.id },
    { id: "ORD-1780792442", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "06/06/2026", prodId: pBelt.id },
    { id: "ORD-1780792372", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "06/06/2026", prodId: pEar.id },
    { id: "ORD-1780792294", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "06/06/2026", prodId: pBelt.id },
    { id: "ORD-1780792269", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "06/01/2026", prodId: pBelt.id },
    { id: "ORD-1780792246", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 5000, status: "Nouvelle", date: "06/06/2026", prodId: pEar.id },
    { id: "ORD-1780704578", clientName: "S Fallou", clientTel: "78 531 36 32", quantity: 1, price: 4000, status: "Nouvelle", date: "05/06/2026", prodId: pBelt.id },
    { id: "ORD-1780704473", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "05/06/2026", prodId: pBelt.id },
    { id: "ORD-1780704438", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "05/06/2026", prodId: pBelt.id },
    { id: "ORD-1780620356", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 4500, status: "Nouvelle", date: "04/06/2026", prodId: pBelt.id },
    { id: "ORD-1780620318", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "04/06/2026", prodId: pBelt.id },
    { id: "ORD-1780620275", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "04/06/2026", prodId: pBelt.id },
    { id: "ORD-1780620215", clientName: "Binta", clientTel: "77 174 94 35", quantity: 1, price: 9000, status: "Nouvelle", date: "04/06/2026", prodId: pTea.id },
    { id: "ORD-1780620081", clientName: "Abdou kanin", clientTel: "77 616 00 37", quantity: 1, price: 4000, status: "Nouvelle", date: "04/06/2026", prodId: pBelt.id },
    { id: "ORD-1780619982", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 2, price: 9000, status: "Nouvelle", date: "04/06/2026", prodId: pTea.id },
    { id: "ORD-1780619570", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "04/06/2026", prodId: pBelt.id },
    { id: "ORD-1780619519", clientName: "Saliou coli", clientTel: "77 267 57 96", quantity: 2, price: 7500, status: "Nouvelle", date: "04/06/2026", prodId: pSmile.id },
    { id: "ORD-1780619377", clientName: "Khadi ba", clientTel: "77 641 16 40", quantity: 1, price: 5000, status: "Nouvelle", date: "04/06/2026", prodId: pEar.id },
    { id: "ORD-1780531416", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "03/06/2026", prodId: pBelt.id },
    { id: "ORD-1780531372", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "03/06/2026", prodId: pBelt.id },
    { id: "ORD-1780439060", clientName: "Mamadou", clientTel: "77 38 07 04", quantity: 1, price: 8000, status: "Nouvelle", date: "02/06/2026", prodId: pTea.id },
    { id: "ORD-1780438998", clientName: "Elhaj Mbaye", clientTel: "77 930 10 95", quantity: 1, price: 18000, status: "Nouvelle", date: "02/06/2026", prodId: pMoto.id },
    { id: "ORD-1780437886", clientName: "Yaye MN", clientTel: "78 318 07 04", quantity: 1, price: 4000, status: "Nouvelle", date: "02/06/2026", prodId: pBelt.id },
    { id: "ORD-1780437813", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "01/06/2026", prodId: pBelt.id },
    { id: "ORD-1780437782", clientName: "Client Anonyme", clientTel: "Inconnu", quantity: 1, price: 9000, status: "Nouvelle", date: "01/06/2026", prodId: pTea.id },
    { id: "ORD-1780317683", clientName: "Cheikh", clientTel: "77 385 63 33", quantity: 1, price: 9000, status: "Confirmee", date: "01/06/2026", prodId: pTea.id },
    { id: "ORD-1780269153", clientName: "Mariama", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Confirmee", date: "31/05/2026", prodId: pBelt.id },
    { id: "ORD-1780269104", clientName: "Modou", clientTel: "77 889 43 99", quantity: 1, price: 9000, status: "Nouvelle", date: "31/05/2026", prodId: pTea.id },
    { id: "ORD-1780185649", clientName: "Mouhamed", clientTel: "77 526 80 61", quantity: 1, price: 9000, status: "Nouvelle", date: "31/05/2026", prodId: pTea.id },
    { id: "ORD-1780185591", clientName: "allalou baye ndao", clientTel: "78 187 15 47", quantity: 1, price: 4000, status: "Nouvelle", date: "30/05/2026", prodId: pBelt.id },
    { id: "ORD-1780185294", clientName: "Inconue", clientTel: "Inconnu", quantity: 1, price: 4000, status: "Nouvelle", date: "30/05/2026", prodId: pBelt.id },
    { id: "ORD-1780149779", clientName: "Daoda", clientTel: "75 336 35 20", quantity: 2, price: 6500, status: "Nouvelle", date: "30/05/2026", prodId: pSmile.id }
  ];

  const rawExpenses = [
    { date: "02/07/2026", category: "Publicité", subcategory: "Meta Ads", amount: 2.5, description: "" },
    { date: "02/07/2026", category: "Autres frais", subcategory: "Transitaire", amount: 54000, description: "" },
    { date: "30/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 12000, description: "On n'a passe une nouvelle commende teste sur les centure belt" },
    { date: "30/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 218000, description: "On n'a fait une nouvelle commande sur les montres bracelet, de 100 pieces" },
    { date: "29/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 36000, description: "On a complété la commande des Bluetooth pour casque moto avec micro. Cette commande, c'est pour les micros." },
    { date: "29/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 10000, description: "On a passé une commande sur le \"the 18 saveurs\" de 20 pièces pour tester le marché." },
    { date: "24/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 242000, description: "On a fait une nouvelle commande sur les Bluetooth pour casque moto de 80 pièces." },
    { date: "24/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4500, description: "" },
    { date: "22/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 9, description: "" },
    { date: "21/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4600, description: "" },
    { date: "21/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 31000, description: "" },
    { date: "20/06/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 9000, description: "" },
    { date: "20/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 7400, description: "" },
    { date: "19/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 8600, description: "" },
    { date: "18/06/2026", category: "Publicité", subcategory: "TikTok Ads", amount: 1800, description: "" },
    { date: "18/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 1900, description: "" },
    { date: "16/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4300, description: "" },
    { date: "13/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4300, description: "" },
    { date: "12/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4300, description: "" },
    { date: "11/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4368, description: "" },
    { date: "11/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4400, description: "" },
    { date: "10/06/2026", category: "Achat marchandise", subcategory: "Transitaire", amount: 39000, description: "On n'a payé le transitaire pour l'arrivée des smil kit" },
    { date: "10/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4400, description: "" },
    { date: "07/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4356, description: "" },
    { date: "07/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 1089, description: "" },
    { date: "05/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4082, description: "" },
    { date: "04/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4500, description: "j'ai lancer une autre campage sur les smil kit" },
    { date: "03/06/2026", category: "Publicité", subcategory: "Meta Ads", amount: 4500, description: "J'ai lancer une campage sur les nettoyeur d'oreille" },
    { date: "30/05/2026", category: "Achat marchandise", subcategory: "Alibaba", amount: 40700, description: "On a acheté un nouveau stock sur les kit blanchiment dentire" }
  ];

  console.log('Inserting orders...');
  for (const o of rawOrders) {
    const totalValue = o.price * o.quantity;
    await prisma.customerOrder.create({
      data: {
        id: o.id,
        productId: o.prodId,
        quantity: o.quantity,
        clientName: o.clientName,
        clientTel: o.clientTel,
        clientCity: 'Dakar',
        source: 'Meta Ads',
        prixVente: o.price,
        status: 'Livree',
        amountCollected: totalValue,
        dateOrder: parseDate(o.date),
        dateDelivery: parseDate(o.date),
        confirmedByTel: true,
        confirmedAt: parseDate(o.date),
        createdById: 'usr-owner-id',
      },
    });
  }

  console.log('Inserting expenses...');
  for (let i = 0; i < rawExpenses.length; i++) {
    const e = rawExpenses[i];
    await prisma.expense.create({
      data: {
        category: e.category,
        subcategory: e.subcategory,
        amount: e.amount,
        currency: 'XOF',
        exchangeRate: 1,
        amountXof: e.amount,
        date: parseDate(e.date),
        description: e.description || '',
        createdById: 'usr-owner-id',
      },
    });
  }

  console.log('Real data seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
