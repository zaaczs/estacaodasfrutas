import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseStoredContactName } from "../lib/customerContact";

const require = createRequire(import.meta.url);
const runtimeModules = join(process.env.TEMP ?? "", "pg-import", "node_modules");

type PdfItem = { x: number; y: number; str: string };

const PDF_PATH = process.argv[2];
const APPLY = process.argv.includes("--apply");

function cleanLine(line: string) {
  return line
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoise(line: string) {
  if (!line) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) return true;
  if (/icloud\.com/i.test(line)) return true;
  if (/^contactos em icloud$/i.test(line)) return true;
  if (/^(nome|endere[cç]o|e-mail|telem[oó]vel|telefone|celular)$/i.test(line)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(line)) return true;
  if (/of\s+\d+/i.test(line)) return true;
  return false;
}

function normalizeStoredPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  if (digits.length === 8 || digits.length === 9) digits = `85${digits}`;
  return digits;
}

function rowsInRange(items: PdfItem[], minX: number, maxX: number) {
  const grouped = new Map<number, PdfItem[]>();
  for (const item of items) {
    if (item.x < minX || item.x >= maxX) continue;
    const y = Math.round(item.y);
    const row = grouped.get(y) ?? [];
    row.push(item);
    grouped.set(y, row);
  }

  return [...grouped.entries()]
    .map(([y, row]) => ({
      y,
      text: cleanLine(row.sort((a, b) => a.x - b.x).map((item) => item.str).join(" ")),
    }))
    .filter((row) => row.text && !isNoise(row.text))
    .sort((a, b) => b.y - a.y);
}

function contactsFromItems(items: PdfItem[]) {
  const nameRows = rowsInRange(items, 0, 180);
  const addressRows = rowsInRange(items, 180, 390);
  const phoneRows = rowsInRange(items, 390, 2000).filter((row) => /\d{8,}/.test(row.text));
  const contacts: { rawName: string; name: string; address: string | null; phone: string }[] = [];

  for (let index = 0; index < phoneRows.length; index += 1) {
    const top = phoneRows[index].y + 1;
    const bottom = phoneRows[index + 1] ? phoneRows[index + 1].y + 1 : Number.NEGATIVE_INFINITY;
    const rawName = nameRows
      .filter((row) => row.y <= top && row.y > bottom)
      .map((row) => row.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const columnAddress = addressRows
      .filter((row) => row.y <= top && row.y > bottom)
      .map((row) => row.text)
      .join(" ")
      .trim();
    const phone = normalizeStoredPhone(phoneRows[index].text);
    if (!rawName || phone.length < 8) continue;

    const parsed = parseStoredContactName(rawName);
    const address = [parsed.address, columnAddress].filter(Boolean).join(" — ") || null;
    contacts.push({
      rawName,
      name: parsed.name || rawName,
      address,
      phone,
    });
  }

  return contacts;
}

function extractContacts(pages: PdfItem[][]) {
  const contacts = pages.flatMap(contactsFromItems);

  const byPhone = new Map<string, (typeof contacts)[number]>();
  for (const contact of contacts) {
    const current = byPhone.get(contact.phone);
    if (!current) {
      byPhone.set(contact.phone, contact);
      continue;
    }
    if (contact.name.length < current.name.length && contact.name.length > 1) {
      byPhone.set(contact.phone, {
        ...contact,
        address: contact.address || current.address,
      });
    }
  }

  return [...byPhone.values()];
}

async function extractPdfPages(pdfPath: string) {
  const pdfjs = await import(pathToFileURL(join(runtimeModules, "pdfjs-dist", "legacy", "build", "pdf.mjs")).href);
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const pages: PdfItem[][] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !("transform" in item) || !item.str.trim()) continue;
      items.push({ x: item.transform[4], y: item.transform[5], str: item.str });
    }
    pages.push(items);
  }

  return pages;
}

async function main() {
  if (!PDF_PATH) {
    console.error("Informe o caminho do PDF.");
    process.exit(1);
  }

  const pages = await extractPdfPages(PDF_PATH);
  const contacts = extractContacts(pages);
  const invalid = contacts.filter((contact) => contact.phone.length < 10 || contact.phone.length > 11);
  const preview = contacts.filter(
    (contact) =>
      contact.name.length > 45 ||
      /regiane|amanda \(ventura|academia ayo|ana maria|alabama, 401|douvina/i.test(contact.rawName)
  );

  console.log(
    JSON.stringify(
      {
        total: contacts.length,
        invalidPhones: invalid.length,
        longNames: contacts.filter((contact) => contact.name.length > 45).length,
        suspicious: contacts
          .filter((contact) => /^(sul|norte|ph|f)$/i.test(contact.name))
          .map((contact) => ({ name: contact.name, rawName: contact.rawName, phone: contact.phone })),
        withAddress: contacts.filter((contact) => contact.address).length,
        preview,
        invalid: invalid.slice(0, 20),
      },
      null,
      2
    )
  );

  if (!APPLY) return;

  const databaseUrl = process.env.PROD_DATABASE_URL;
  if (!databaseUrl) {
    console.error("PROD_DATABASE_URL ausente.");
    process.exit(1);
  }

  type QueryResult<T> = { rows: T[] };
  type DbClient = {
    connect: () => Promise<void>;
    end: () => Promise<void>;
    query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;
  };
  const { Client } = require(join(runtimeModules, "pg")) as {
    Client: new (config: object) => DbClient;
  };
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; name: string; phone: string; orders: number }>(
      `SELECT c.id, c.name, c.phone, COUNT(o.id)::int AS orders
       FROM "Customer" c
       LEFT JOIN "Order" o ON o."customerId" = c.id
       GROUP BY c.id`
    );

    const removed: string[] = [];
    for (const row of existing.rows) {
      const digits = String(row.phone).replace(/\D/g, "");
      const isSeed =
        /jo[aã]o silva|maria santos/i.test(row.name) ||
        ["11999991111", "11988882222"].includes(digits);
      if (!isSeed || row.orders > 0) continue;
      await client.query(`DELETE FROM "Customer" WHERE id = $1`, [row.id]);
      removed.push(row.name);
    }

    let inserted = 0;
    let updated = 0;
    for (const contact of contacts) {
      if (contact.phone.length < 8) continue;
      const match = await client.query<{ id: string }>(
        `SELECT id FROM "Customer" WHERE regexp_replace(phone, '\\D', '', 'g') = $1 LIMIT 1`,
        [contact.phone]
      );
      if (match.rows[0]) {
        await client.query(`UPDATE "Customer" SET name = $1, phone = $2, address = $3 WHERE id = $4`, [
          contact.name,
          contact.phone,
          contact.address,
          match.rows[0].id,
        ]);
        updated += 1;
      } else {
        await client.query(
          `INSERT INTO "Customer" (id, name, phone, address, "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
          [randomUUID(), contact.name, contact.phone, contact.address]
        );
        inserted += 1;
      }
    }

    const total = await client.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM "Customer"`);
    await client.query("COMMIT");
    console.log(JSON.stringify({ removed, inserted, updated, productionCustomers: total.rows[0].total }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
