export type StoredCartItem = {
  key: string;
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  notes?: string;
};

const CART_KEY = "store_cart_v1";

export function loadCartFromStorage(): StoredCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i) => i && typeof i === "object") as StoredCartItem[];
  } catch {
    return [];
  }
}

export function saveCartToStorage(items: StoredCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function clearCartStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_KEY);
}

export function addItemToStorage(item: StoredCartItem) {
  const current = loadCartFromStorage();
  const existing = current.find((x) => x.key === item.key);
  let next: StoredCartItem[];
  if (existing) {
    next = current.map((x) =>
      x.key === item.key ? { ...x, quantity: x.quantity + item.quantity } : x
    );
  } else {
    next = [...current, item];
  }
  saveCartToStorage(next);
}
