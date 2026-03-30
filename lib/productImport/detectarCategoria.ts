/**
 * Inferência de categoria a partir do nome do produto (hortifruti / mercearia).
 */
export function detectarCategoria(nome: string): string {
  const n = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const regrasPrioritarias: { fragmento: string; categoria: string }[] = [
    // Polpas (prioridade máxima para não cair em Frutas por conter o nome da fruta)
    { fragmento: "polpa", categoria: "Polpas" },
    { fragmento: "polpas", categoria: "Polpas" },

    // Bebidas (sucos, refrigerantes, águas, energéticos, etc.)
    { fragmento: "cajuina", categoria: "Bebidas" },
    { fragmento: "suco", categoria: "Bebidas" },
    { fragmento: "refrigerante", categoria: "Bebidas" },
    { fragmento: "refri", categoria: "Bebidas" },
    { fragmento: "agua de coco", categoria: "Bebidas" },
    { fragmento: "agua mineral", categoria: "Bebidas" },
    { fragmento: "água mineral", categoria: "Bebidas" },
    { fragmento: "garrafao", categoria: "Bebidas" },
    { fragmento: "garrafão", categoria: "Bebidas" },
    { fragmento: "energetico", categoria: "Bebidas" },
    { fragmento: "energético", categoria: "Bebidas" },
    { fragmento: "isotonico", categoria: "Bebidas" },
    { fragmento: "isotônico", categoria: "Bebidas" },
    { fragmento: "nectar", categoria: "Bebidas" },
    { fragmento: "néctar", categoria: "Bebidas" },
    { fragmento: "coca", categoria: "Bebidas" },
    { fragmento: "pepsi", categoria: "Bebidas" },
    { fragmento: "guarana", categoria: "Bebidas" },
    { fragmento: "guaraná", categoria: "Bebidas" },
    { fragmento: "fanta", categoria: "Bebidas" },
    { fragmento: "sprite", categoria: "Bebidas" },
    { fragmento: "schweppes", categoria: "Bebidas" },
    { fragmento: "cha", categoria: "Bebidas" },
    { fragmento: "chá", categoria: "Bebidas" },
  ];

  const regras: { fragmento: string; categoria: string }[] = [
    { fragmento: "couve-flor", categoria: "Legumes" },
    { fragmento: "couve flor", categoria: "Legumes" },
    { fragmento: "arroz", categoria: "Mercado" },
    { fragmento: "feijao", categoria: "Mercado" },
    { fragmento: "feijão", categoria: "Mercado" },
    { fragmento: "acucar", categoria: "Mercado" },
    { fragmento: "açúcar", categoria: "Mercado" },
    { fragmento: "macarrao", categoria: "Mercado" },
    { fragmento: "macarrão", categoria: "Mercado" },
    { fragmento: "oleo", categoria: "Mercado" },
    { fragmento: "óleo", categoria: "Mercado" },
    { fragmento: "farinha", categoria: "Mercado" },
    { fragmento: "cafe", categoria: "Mercado" },
    { fragmento: "café", categoria: "Mercado" },
    { fragmento: "leite", categoria: "Mercado" },
    { fragmento: "manteiga", categoria: "Mercado" },
    { fragmento: "fermento", categoria: "Mercado" },
    { fragmento: "vinagre", categoria: "Mercado" },
    { fragmento: "molho shoy", categoria: "Mercado" },
    { fragmento: "banana", categoria: "Frutas" },
    { fragmento: "maca", categoria: "Frutas" },
    { fragmento: "maçã", categoria: "Frutas" },
    { fragmento: "uva", categoria: "Frutas" },
    { fragmento: "laranja", categoria: "Frutas" },
    { fragmento: "melao", categoria: "Frutas" },
    { fragmento: "melão", categoria: "Frutas" },
    { fragmento: "melancia", categoria: "Frutas" },
    { fragmento: "morango", categoria: "Frutas" },
    { fragmento: "abacate", categoria: "Frutas" },
    { fragmento: "limao", categoria: "Frutas" },
    { fragmento: "limão", categoria: "Frutas" },
    { fragmento: "maracuja", categoria: "Frutas" },
    { fragmento: "maracujá", categoria: "Frutas" },
    { fragmento: "goiaba", categoria: "Frutas" },
    { fragmento: "manga", categoria: "Frutas" },
    { fragmento: "pessego", categoria: "Frutas" },
    { fragmento: "pêssego", categoria: "Frutas" },
    { fragmento: "kiwi", categoria: "Frutas" },
    { fragmento: "figo", categoria: "Frutas" },
    { fragmento: "tangerina", categoria: "Frutas" },
    { fragmento: "bergamota", categoria: "Frutas" },
    { fragmento: "caju", categoria: "Frutas" },
    { fragmento: "coco", categoria: "Frutas" },
    { fragmento: "ameixa", categoria: "Frutas" },
    { fragmento: "pera", categoria: "Frutas" },
    { fragmento: "pêra", categoria: "Frutas" },
    { fragmento: "jaca", categoria: "Frutas" },
    { fragmento: "pitanga", categoria: "Frutas" },
    { fragmento: "acerola", categoria: "Frutas" },
    { fragmento: "mamao", categoria: "Frutas" },
    { fragmento: "mamão", categoria: "Frutas" },
    { fragmento: "abacaxi", categoria: "Frutas" },
    { fragmento: "batata", categoria: "Legumes" },
    { fragmento: "cenoura", categoria: "Legumes" },
    { fragmento: "chuchu", categoria: "Legumes" },
    { fragmento: "abobora", categoria: "Legumes" },
    { fragmento: "abóbora", categoria: "Legumes" },
    { fragmento: "berinjela", categoria: "Legumes" },
    { fragmento: "pimentao", categoria: "Legumes" },
    { fragmento: "pimentão", categoria: "Legumes" },
    { fragmento: "tomate", categoria: "Legumes" },
    { fragmento: "inhame", categoria: "Legumes" },
    { fragmento: "mandioca", categoria: "Legumes" },
    { fragmento: "aipim", categoria: "Legumes" },
    { fragmento: "quiabo", categoria: "Legumes" },
    { fragmento: "milho", categoria: "Legumes" },
    { fragmento: "brocolis", categoria: "Legumes" },
    { fragmento: "brócolis", categoria: "Legumes" },
    { fragmento: "nabo", categoria: "Legumes" },
    { fragmento: "rabanete", categoria: "Legumes" },
    { fragmento: "beterraba", categoria: "Legumes" },
    { fragmento: "palmito", categoria: "Legumes" },
    { fragmento: "pepino", categoria: "Legumes" },
    { fragmento: "alface", categoria: "Verduras" },
    { fragmento: "couve", categoria: "Verduras" },
    { fragmento: "rucula", categoria: "Verduras" },
    { fragmento: "rúcula", categoria: "Verduras" },
    { fragmento: "espinafre", categoria: "Verduras" },
    { fragmento: "agriao", categoria: "Verduras" },
    { fragmento: "agrião", categoria: "Verduras" },
    { fragmento: "acelga", categoria: "Verduras" },
    { fragmento: "repolho", categoria: "Verduras" },
    { fragmento: "escarola", categoria: "Verduras" },
    { fragmento: "mostarda", categoria: "Verduras" },
    { fragmento: "salsa", categoria: "Verduras" },
    { fragmento: "coentro", categoria: "Verduras" },
    { fragmento: "alho", categoria: "Temperos" },
    { fragmento: "cebola", categoria: "Temperos" },
    { fragmento: "gengibre", categoria: "Temperos" },
  ];

  for (const { fragmento, categoria } of [...regrasPrioritarias, ...regras]) {
    const f = fragmento
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (n.includes(f)) return categoria;
  }

  return "Outros";
}
