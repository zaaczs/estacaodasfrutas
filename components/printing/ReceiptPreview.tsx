import { RECEIPT_COLUMNS } from "@/lib/printing/receiptConfig";
import type { ReceiptLine } from "@/lib/printing/formatReceipt";

function lineClass(line: Extract<ReceiptLine, { kind: "text" }>): string {
  const classes = [];
  if (line.align === "center" || line.scale === "double") classes.push("cupom-center");
  if (line.bold || line.scale === "tall") classes.push("cupom-bold");
  if (line.scale === "double") classes.push("cupom-double");
  if (line.scale === "tall") classes.push("cupom-tall");
  return classes.join(" ");
}

export function ReceiptPreview({ lines }: { lines: ReceiptLine[] }) {
  return (
    <div className="mx-auto w-full max-w-full overflow-x-auto print:overflow-visible">
    <pre id="cupom" className="cupom" aria-label="Prévia do cupom">
      {lines.map((line, index) => {
        if (line.kind === "blank") {
          return (
            <span key={index} className="cupom-blank">
              {" "}
            </span>
          );
        }
        if (line.kind === "rule") {
          return <span key={index}>{"-".repeat(RECEIPT_COLUMNS)}</span>;
        }
        const className = lineClass(line);
        return (
          <span key={index} className={className || undefined}>
            {line.text || " "}
          </span>
        );
      })}
    </pre>
    </div>
  );
}
