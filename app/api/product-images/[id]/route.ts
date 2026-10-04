import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await prisma.productImage.findUnique({ where: { id } });

    if (!image) {
      return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/product-images/[id]:", error);
    return NextResponse.json({ error: "Erro ao carregar imagem" }, { status: 500 });
  }
}
