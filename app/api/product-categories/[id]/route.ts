import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/constants";
import {
  deleteProductCategory,
  updateProductCategory,
} from "@/lib/services/productCategoryService";

function canModifyCategories(role?: string | null) {
  return role === Role.ADMIN || role === Role.ATTENDANT;
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
    if (!canModifyCategories(session.user.role)) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar categorias" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      active?: boolean;
    };
    if (body.active != null && session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Somente administradores podem ocultar ou reativar categorias" },
        { status: 403 }
      );
    }
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (!canModifyCategories(session.user.role)) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir categorias" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const password = typeof body.password === "string" ? body.password : "";
    if (!password.trim()) {
      return NextResponse.json(
        { error: "Informe a senha do login para excluir a categoria" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });
    const passwordMatches = user
      ? await compare(password, user.password)
      : false;
    if (!passwordMatches) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 403 });
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

