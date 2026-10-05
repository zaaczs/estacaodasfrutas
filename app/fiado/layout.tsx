import { InternalAppLayout } from "@/components/layout/InternalAppLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InternalAppLayout adminOnly>{children}</InternalAppLayout>;
}
