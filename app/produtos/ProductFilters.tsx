"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryFilterSelect } from "./CategoryFilterSelect";

const SEARCH_DEBOUNCE_MS = 250;

type Props = {
  query: string;
  category: string;
  categories: string[];
};

function buildProductsHref(query: string, category: string) {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/produtos?${qs}` : "/produtos";
}

export function ProductFilters({ query, category, categories }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const [isPending, startTransition] = useTransition();
  const categoryRef = useRef(category);
  const draftRef = useRef(draft);
  const lastRequestedQuery = useRef(query);
  const filterGeneration = useRef(0);

  draftRef.current = draft;

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    if (query === lastRequestedQuery.current) return;
    lastRequestedQuery.current = query;
    setDraft(query);
  }, [query]);

  const applyFilters = useCallback(
    (nextQuery: string, nextCategory: string) => {
      filterGeneration.current += 1;
      const trimmed = nextQuery.trim();
      lastRequestedQuery.current = trimmed;
      const href = buildProductsHref(trimmed, nextCategory);
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [router]
  );

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === lastRequestedQuery.current) return;

    const generation = filterGeneration.current;
    const timer = window.setTimeout(() => {
      if (generation !== filterGeneration.current) return;
      applyFilters(trimmed, categoryRef.current);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [applyFilters, draft]);

  return (
    <form
      className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto] md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters(draftRef.current, categoryRef.current);
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="q">Buscar produto</Label>
          {isPending ? (
            <span className="text-xs text-muted-foreground">Buscando...</span>
          ) : null}
        </div>
        <Input
          id="q"
          name="q"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Digite nome ou parte do nome"
          autoComplete="off"
          aria-busy={isPending}
        />
      </div>
      <div>
        <Label htmlFor="category">Categoria</Label>
        <CategoryFilterSelect
          categories={categories}
          value={category}
          onValueChange={(value) => {
            categoryRef.current = value;
            applyFilters(draftRef.current, value);
          }}
        />
      </div>
      <Button type="submit">Filtrar</Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          filterGeneration.current += 1;
          categoryRef.current = "";
          lastRequestedQuery.current = "";
          setDraft("");
          startTransition(() => {
            router.replace("/produtos", { scroll: false });
          });
        }}
      >
        Limpar
      </Button>
    </form>
  );
}
