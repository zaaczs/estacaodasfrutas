const NOTE_PATTERN =
  /^(nat|assinar|cart[aã]o|cupom(\s+fiscal)?|nota\s+fiscal|pix|pluragua|indaia|recibo|vem\s+pegar|cliente\s+(super\s+)?exigente|formosa|patroa|atualizado|compras|produtos\s+de\s+coco|n[aã]o\s+cobrar|mandar.*|demora.*|s[oó]\s+vai.*|mediante.*|pagamento.*|func\.?|funcion[aá]ri[ao].*)$/i;

function cleanText(value: string) {
  return value
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.\-–—]+|[\s.\-–—]+$/g, "")
    .trim();
}

function looksLikeAddress(value: string) {
  const text = cleanText(value);
  if (!text) return false;
  if (/\d/.test(text)) return true;
  return /\b(sala|bloco|torre|loja|apto|apartamento|portaria|shopping|residencial|academia|cantina|engenharia|edif[ií]cio|condom[ií]nio)\b/i.test(text);
}

function isNote(value: string) {
  const text = cleanText(value).replace(/[()]/g, "");
  if (!text) return true;
  if (NOTE_PATTERN.test(text)) return true;
  if (/^func\.?\s*[-–.]/i.test(text)) return false;
  if (/demora|assinar|cupom|nota fiscal|pluragua|pix|\bnat\b|\bph\b|recibo|vem pegar|exigente|pagamento|n[aã]o cobrar|ao lado/i.test(text)) {
    return true;
  }
  return false;
}

function personFromChunk(value: string) {
  let text = cleanText(value);
  text = text.replace(/^(func\.?|funcion[aá]ri[ao])\s*[-–.]?\s*/i, "");
  text = text.replace(/\s*[-–]?\s*(func\.?|funcion[aá]ri[ao]|patroa|filha|filho).*$/i, "");
  return cleanText(text);
}

function titleCaseName(value: string) {
  return value.replace(/\p{L}[\p{L}'’-]*/gu, (word, offset: number) => {
    if (/^(de|da|do|das|dos|e)$/i.test(word) && offset > 0) {
      return word.toLocaleLowerCase("pt-BR");
    }
    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
  });
}

function looksLikePerson(value: string) {
  const text = personFromChunk(value);
  if (!text || text.length > 40) return false;
  if (/\d{2,}/.test(text)) return false;
  if (isNote(text)) return false;
  if (/^(norte|sul|leste|oeste|bloco|sala|ph|nat|pix)$/i.test(text)) return false;
  const words = text.split(" ").filter(Boolean);
  const significant = words.filter((word) => !/^(d|dr|sr|sra|da|de|do)\.?$/i.test(word));
  if (significant.length === 0 || significant.length > 5) return false;
  return significant.every((word) => word.replace(/\./g, "").length >= 3);
}

export type ParsedContact = {
  name: string;
  address: string;
  phone: string;
};

function piecesOf(group: string) {
  return group
    .split(/\s*[-–/]\s*/)
    .map(cleanText)
    .filter(Boolean);
}

export function parseStoredContactName(rawName: string): { name: string; address: string } {
  const text = cleanText(rawName);
  const groups: string[] = [];
  const outside = cleanText(
    text
      .replace(/\(([^)]*)\)/g, (_, group: string) => {
        groups.push(group);
        return " ";
      })
      .replace(/[()]/g, " ")
  );

  const notes: string[] = [];
  const people: string[] = [];
  const places: string[] = [];

  for (const group of groups) {
    for (const piece of piecesOf(group)) {
      if (isNote(piece)) notes.push(piece);
      else if (looksLikePerson(piece)) people.push(personFromChunk(piece));
      else places.push(piece);
    }
  }

  const outsideIsEmployee = /\b(func\.?|funcion[aá]ri[ao])\b/i.test(outside);
  const outsidePerson = personFromChunk(outside);
  let name = "";
  let address = "";

  if (looksLikeAddress(outside) && people.length > 0) {
    address = outside;
    name = people[people.length - 1];
  } else if (outsideIsEmployee && people.length > 0) {
    name = people[people.length - 1];
    address = places[0] || "";
  } else if (looksLikePerson(outsidePerson) && !looksLikeAddress(outside)) {
    name = outsidePerson;
    address = places[0] || people.find((person) => person.toLocaleLowerCase("pt-BR") !== name.toLocaleLowerCase("pt-BR")) || "";
  } else if (looksLikeAddress(outside)) {
    const trailingName = outside.match(/^(.*\d+)\s+([A-Za-zÀ-ÿ][\p{L}'.-]+(?:\s+[A-Za-zÀ-ÿ][\p{L}'.-]+){0,2})$/u);
    const leadingPerson = outside.match(
      /^([A-Za-zÀ-ÿ][\p{L}'.-]+(?:\s+[A-Za-zÀ-ÿ][\p{L}'.-]+){0,3})\s+(\p{L}.*\d.*)$/u
    );
    if (
      leadingPerson &&
      looksLikePerson(leadingPerson[1]) &&
      looksLikeAddress(leadingPerson[2])
    ) {
      name = cleanText(leadingPerson[1]);
      address = cleanText(leadingPerson[2]);
    } else if (trailingName && looksLikePerson(trailingName[2])) {
      address = cleanText(trailingName[1]);
      name = cleanText(trailingName[2]);
    } else {
      name = outside;
      address = places[0] || "";
    }
  } else {
    name = outsidePerson || people[0] || text;
    address = places[0] || "";
  }

  if (!name) name = text;
  const usefulNotes = [...new Set(notes)].filter((note) => !/^func(?:ion[aá]ri[ao])?\.?$/i.test(note));
  if (usefulNotes.length > 0) {
    const noteText = usefulNotes.join("; ");
    address = address ? `${address} — ${noteText}` : noteText;
  }

  return { name: titleCaseName(cleanText(name)), address: tidyAddress(cleanText(address)) };
}

function tidyAddress(value: string) {
  return value.replace(/\p{L}[\p{L}'’-]*/gu, (word) => {
    if (word === word.toLocaleUpperCase("pt-BR") && word.length <= 4) return word;
    if (/^(de|da|do|das|dos|e)$/i.test(word)) return word.toLocaleLowerCase("pt-BR");
    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
  });
}
