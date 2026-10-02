const { execSync } = require("child_process");

const databaseUrl = process.env.DATABASE_URL || "";

if (databaseUrl.startsWith("postgres://")) {
  process.env.DATABASE_URL = databaseUrl.replace("postgres://", "postgresql://");
}

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

run("npx prisma db push --skip-generate");
run("npx tsx prisma/seed.ts");
