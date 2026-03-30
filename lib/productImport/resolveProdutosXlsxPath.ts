import fs from "fs";
import path from "path";

const CANDIDATES = ["produtos.xlsx", "PRODUTOS.xlsx", "Produtos.xlsx"];

export function resolveProdutosXlsxPath(cwd: string = process.cwd()): string | null {
  for (const name of CANDIDATES) {
    const full = path.join(cwd, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}
