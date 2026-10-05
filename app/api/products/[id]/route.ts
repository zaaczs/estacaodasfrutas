import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProductById,
  updateProduct,
  deleteProduct,
  UpdateProductInput,
} from "@/lib/services/productService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produto" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateProductInput;

    const product = await updateProduct(id, {
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      complements: body.complements,
      category: body.category,
      unit: body.unit,
      price: body.price != null ? Number(body.price) : undefined,
      cost: body.cost != null ? Number(body.cost) : undefined,
      stock: body.stock != null ? Number(body.stock) : undefined,
      minStock: body.minStock != null ? Number(body.minStock) : undefined,
      active: body.active,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PATCH /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateProductInput;

    const product = await updateProduct(id, {
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      complements: body.complements,
      category: body.category,
      unit: body.unit,
      price: body.price != null ? Number(body.price) : undefined,
      cost: body.cost != null ? Number(body.cost) : undefined,
      stock: body.stock != null ? Number(body.stock) : undefined,
      minStock: body.minStock != null ? Number(body.minStock) : undefined,
      active: body.active,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const result = await deleteProduct(id);

    if (result.mode === "inactivated") {
      return NextResponse.json({
        success: true,
        inactivated: true,
        message:
          "Este produto já consta em pedidos e não pode ser apagado do banco. Ele foi inativado e deixa de aparecer na loja para novos clientes.",
        product: result.product,
      });
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("DELETE /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto" },
      { status: 500 }
    );
  }
}
