/** Dados institucionais exibidos na loja (cliente). */
export const STORE_INFO = {
  shortName: "Estação das Frutas",
  fullName: "Mercadinho Estação das Frutas",
  taglines: [
    "Frutas e Verduras da melhor qualidade.",
    "Produtos de Mercearia em geral.",
    "Garrafões de água 20L, 10L e 5L.",
  ],
  feiraSchedule: "Nossa feira chega toda segunda-feira e quinta-feira.",
  orderPhonesDisplay: "3241-3295 ou 98762-7978",
  telLinks: ["tel:+558532413295", "tel:+5585987627978"] as const,
  addressLine:
    "Rua Francisco Xerez, 593 - Guararapes, Fortaleza, Brazil 60810-035",
  /** Link direto WhatsApp (sem parâmetros de campanha). */
  whatsappOrderUrl: "https://api.whatsapp.com/send?phone=5585987627978",
} as const;
