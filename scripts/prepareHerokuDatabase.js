const fs = require("fs");

/**
 * No Heroku o filesystem é efêmero, então SQLite se perde a cada deploy.
 * Este script só roda no build do Heroku, onde DATABASE_URL já vem no ambiente.
 * Localmente o schema continua SQLite e o arquivo do desenvolvedor não é alterado.
 */
const databaseUrl = process.env.DATABASE_URL || "";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

if (!isPostgres) {
  process.exit(0);
}

const schemaPath = "prisma/schema.prisma";
const schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes('provider = "sqlite"')) {
  process.exit(0);
}

const nextSchema = schema
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('url      = "file:./dev.db"', 'url      = env("DATABASE_URL")');

fs.writeFileSync(schemaPath, nextSchema);
console.log("Schema Prisma ajustado para PostgreSQL no build do Heroku.");
