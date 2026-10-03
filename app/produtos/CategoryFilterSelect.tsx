"use client";

import { useEffect, useState } from "react";
import {
  mergeCategoryNames,
  PRODUCT_CATEGORIES_UPDATED,
} from "./categorySync";

type Props = {
  categories: string[];
  value: string;
};

export function CategoryFilterSelect({ categories, value }: Props) {
  const [options, setOptions] = useState(categories);
  const [selected, setSelected] = useState(value || "__all__");

  useEffect(() => {
    setOptions(categories);
  }, [categories]);

  useEffect(() => {
    setSelected(value || "__all__");
  }, [value]);

  useEffect(() => {
    function onCategoriesUpdated(event: Event) {
      const names = (event as CustomEvent<string[]>).detail ?? [];
      setOptions((current) => mergeCategoryNames(current, names));
    }

    window.addEventListener(PRODUCT_CATEGORIES_UPDATED, onCategoriesUpdated);
    return () =>
      window.removeEventListener(PRODUCT_CATEGORIES_UPDATED, onCategoriesUpdated);
  }, []);

  return (
    <select
      id="category"
      name="category"
      value={selected}
      onChange={(event) => setSelected(event.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      <option value="__all__">Todas categorias</option>
      {options.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
}
