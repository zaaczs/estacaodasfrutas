import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { STORE_INFO } from "@/lib/constants/storeInfo";
import { STORE_PRESENTATION_FRUIT_IMAGE } from "@/lib/constants/presentationAssets";
import { Button } from "@/components/ui/button";
import { StoreLogo } from "@/components/storefront/StoreLogo";

export function StorePresentation() {
  return (
    <section className="mb-8 rounded-2xl border border-[#2e7d32]/20 bg-white shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,220px)_1fr] gap-0">
        <div className="relative bg-gradient-to-b from-[#e8f5e9] to-white p-4 md:p-6 flex flex-col items-center justify-center gap-4 border-b md:border-b-0 md:border-r border-[#2e7d32]/15">
          <StoreLogo
            alt={STORE_INFO.fullName}
            className="w-full max-w-[180px] h-auto object-contain drop-shadow-sm"
            width={180}
            height={200}
          />
          <div className="w-full max-w-[200px] overflow-hidden rounded-xl border border-[#2e7d32]/20 shadow-sm bg-white">
            <img
              src={STORE_PRESENTATION_FRUIT_IMAGE}
              alt="Frutas frescas"
              className="w-full aspect-square object-cover"
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className="p-5 md:p-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2e7d32] mb-1">
            Mercadinho
          </p>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{STORE_INFO.fullName}</h2>
          <ul className="space-y-2 text-sm text-gray-700 mb-4">
            {STORE_INFO.taglines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[#2e7d32] shrink-0" aria-hidden>
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
            <span className="text-[#2e7d32] shrink-0 mt-0.5" aria-hidden>
              📅
            </span>
            {STORE_INFO.feiraSchedule}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 mb-3">
            <Phone className="h-4 w-4 text-[#2e7d32] shrink-0" aria-hidden />
            <span className="font-medium">Faça seu pedido:</span>
            <a
              href={STORE_INFO.telLinks[0]}
              className="text-[#2e7d32] font-semibold hover:underline"
            >
              {STORE_INFO.orderPhonesDisplay.split(" ou ")[0]}
            </a>
            <span className="text-gray-400">ou</span>
            <a
              href={STORE_INFO.telLinks[1]}
              className="text-[#2e7d32] font-semibold hover:underline"
            >
              98762-7978
            </a>
          </div>
          <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
            <MapPin className="h-4 w-4 text-[#2e7d32] shrink-0 mt-0.5" aria-hidden />
            <span>{STORE_INFO.addressLine}</span>
          </p>
          <Button
            asChild
            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2"
          >
            <Link
              href={STORE_INFO.whatsappOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Pedir pelo WhatsApp
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
