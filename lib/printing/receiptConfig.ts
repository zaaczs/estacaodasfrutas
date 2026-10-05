/**
 * Bobina de 80 mm com a fonte nativa A (12×24 pontos) cabe 48 caracteres.
 * Para bobina de 58 mm, use 32. A quebra de linha e o preço à direita
 * acompanham este número.
 *
 * `codePage` 2 pede PC850 na maioria das Epson e Elgin. O encoder grava
 * os acentos nessa mesma página — os dois precisam mudar juntos.
 */
export const RECEIPT_COLUMNS = 48;
export const RECEIPT_CODE_PAGE = 2;
export const RECEIPT_FEED_BEFORE_CUT = 4;
export const RECEIPT_CUT = true;
export const THERMAL_PRINTER_STORAGE_KEY = "estacao.thermalPrinter";
