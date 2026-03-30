import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteProductCategory,
  updateProductCategory,
} from "@/lib/services/productCategoryService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Somente administradores podem editar categorias" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      active?: boolean;
    };
    const updated = await updateProductCategory(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/product-categories/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar categoria" },
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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Somente administradores podem excluir categorias" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await deleteProductCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/product-categories/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir categoria" },
      { status: 500 }
    );
  }
}

