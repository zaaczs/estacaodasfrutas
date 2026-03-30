const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), ".next");
try {
  fs.rmSync(dir, {
    recursive: true,
    force: true,
    maxRetries: 15,
    retryDelay: 150,
  });
  console.log("Pasta .next removida com sucesso.");
} catch (e) {
  if (e.code === "ENOENT") return;
  console.error(e.message);
  console.error(
    "\nFeche o servidor Next (Ctrl+C), feche abas em localhost e tente de novo.\n" +
      "Se usar OneDrive, pausar sincronização ou mover o projeto ajuda (arquivos em .next podem travar)."
  );
  process.exitCode = 1;
}
