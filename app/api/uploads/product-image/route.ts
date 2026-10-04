import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") || !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Envie uma imagem válida" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Imagem muito grande (máximo 5MB)" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const image = await prisma.productImage.create({
      data: {
        mimeType: file.type,
        data: bytes,
      },
    });

    return NextResponse.json({
      url: `/api/product-images/${image.id}`,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("POST /api/uploads/product-image:", error);
    return NextResponse.json({ error: "Erro ao fazer upload da imagem" }, { status: 500 });
  }
}
