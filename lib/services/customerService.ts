import { prisma } from "@/lib/db";

export type CreateCustomerInput = {
  name: string;
  phone: string;
  cpfCnpj?: string | null;
  address?: string | null;
  complement?: string | null;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export async function getCustomers(search?: string) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: { orders: true },
  });
}

export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  return prisma.customer.update({
    where: { id },
    data,
  });
}

export async function deleteCustomer(id: string) {
  return prisma.customer.delete({
    where: { id },
  });
}
