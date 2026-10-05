/**
 * Página PC850 (Europa Ocidental), a mais comum em térmica ESC/POS.
 * Inclui ç, ã, õ e os demais acentos usados em nomes de produto.
 */
const CP850: Record<string, number> = {
  Ç: 0x80,
  ü: 0x81,
  é: 0x82,
  â: 0x83,
  ä: 0x84,
  à: 0x85,
  å: 0x86,
  ç: 0x87,
  ê: 0x88,
  ë: 0x89,
  è: 0x8a,
  ï: 0x8b,
  î: 0x8c,
  ì: 0x8d,
  Ä: 0x8e,
  Å: 0x8f,
  É: 0x90,
  æ: 0x91,
  Æ: 0x92,
  ô: 0x93,
  ö: 0x94,
  ò: 0x95,
  û: 0x96,
  ù: 0x97,
  ÿ: 0x98,
  Ö: 0x99,
  Ü: 0x9a,
  á: 0xa0,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  ñ: 0xa4,
  Ñ: 0xa5,
  ª: 0xa6,
  º: 0xa7,
  Á: 0xb5,
  Â: 0xb6,
  À: 0xb7,
  ã: 0xc6,
  Ã: 0xc7,
  Ê: 0xd2,
  Ë: 0xd3,
  È: 0xd4,
  Í: 0xd6,
  Î: 0xd7,
  Ï: 0xd8,
  Ì: 0xde,
  Ó: 0xe0,
  Ô: 0xe2,
  Ò: 0xe3,
  õ: 0xe4,
  Õ: 0xe5,
  Ú: 0xe9,
  Û: 0xea,
  Ù: 0xeb,
  "—": 0x2d,
  "–": 0x2d,
  "−": 0x2d,
  "“": 0x22,
  "”": 0x22,
  "‘": 0x27,
  "’": 0x27,
  "\u00A0": 0x20,
};

function foldToAscii(char: string): string {
  return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function encodeCp850(text: string): number[] {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) {
      bytes.push(code);
      continue;
    }

    const mapped = CP850[char];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }

    const folded = foldToAscii(char);
    if (folded.length === 1) {
      const foldedCode = folded.charCodeAt(0);
      if (foldedCode >= 0x20 && foldedCode <= 0x7e) {
        bytes.push(foldedCode);
        continue;
      }
    }

    if (char === "\n" || char === "\r" || char === "\t") {
      bytes.push(0x20);
      continue;
    }

    bytes.push(0x3f);
  }

  return bytes;
}
