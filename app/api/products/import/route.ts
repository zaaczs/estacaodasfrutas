import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importProductsFromXlsxBuffer } from "@/lib/productImport/runImport";
import { resolveProdutosXlsxPath } from "@/lib/productImport/resolveProdutosXlsxPath";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let buffer: Buffer;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) {
        return NextResponse.json(
          { error: "Envie o arquivo no campo file (multipart/form-data)" },
          { status: 400 }
        );
      }
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
    } else {
      const caminho = resolveProdutosXlsxPath();
      if (!caminho) {
        return NextResponse.json(
          {
            error:
              "Nenhum produtos.xlsx na raiz do servidor. Envie o arquivo via formulário ou coloque o .xlsx na raiz do projeto.",
          },
          { status: 400 }
        );
      }
      buffer = readFileSync(caminho);
    }

    const resumo = await importProductsFromXlsxBuffer(prisma, buffer);
    return NextResponse.json(resumo);
  } catch (error) {
    console.error("POST /api/products/import:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao importar produtos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
