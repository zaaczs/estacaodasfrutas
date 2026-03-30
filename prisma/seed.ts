import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hash("123456", 12);
  const attendantPassword = await hash("123456", 12);

  await prisma.user.deleteMany({
    where: {
      email: { in: ["admin@estacaodasfrutas.com", "atendente@estacaodasfrutas.com"] },
    },
  }).catch(() => {});

  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@gmail.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const attendant = await prisma.user.upsert({
    where: { email: "atendente@gmail.com" },
    update: {},
    create: {
      name: "Atendente",
      email: "atendente@gmail.com",
      password: attendantPassword,
      role: "ATTENDANT",
    },
  });

  console.log("Usuários criados:", { admin: admin.email, attendant: attendant.email });

  const categories = ["Frutas", "Verduras", "Legumes"];
  const productsData = [
    {
      name: "Banana",
      description: "Banana prata, madura e doce",
      category: "Frutas",
      unit: "kg",
      price: 4.99,
      cost: 2.5,
      stock: 50,
      minStock: 10,
    },
    {
      name: "Maçã",
      description: "Maçã fresca e crocante",
      category: "Frutas",
      unit: "kg",
      price: 6.99,
      cost: 3.5,
      stock: 30,
      minStock: 8,
    },
    {
      name: "Laranja",
      description: "Laranja suculenta e cítrica",
      category: "Frutas",
      unit: "kg",
      price: 3.99,
      cost: 2,
      stock: 40,
      minStock: 10,
    },
    {
      name: "Alface",
      description: "Alface fresca e crocante",
      category: "Verduras",
      unit: "un",
      price: 2.99,
      cost: 1.2,
      stock: 20,
      minStock: 5,
    },
    {
      name: "Tomate",
      description: "Tomate maduro e vermelho",
      category: "Legumes",
      unit: "kg",
      price: 5.99,
      cost: 3,
      stock: 25,
      minStock: 8,
    },
  ];

  for (const p of productsData) {
    await prisma.product.create({ data: p }).catch(() => {});
  }

  console.log("Produtos de exemplo criados");

  const customersData = [
    { name: "João Silva", phone: "(11) 99999-1111", cpfCnpj: "123.456.789-00" },
    { name: "Maria Santos", phone: "(11) 98888-2222" },
  ];

  for (const c of customersData) {
    await prisma.customer.create({ data: c }).catch(() => {});
  }

  console.log("Clientes de exemplo criados");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
