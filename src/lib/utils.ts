import type { ShoppingItemRow } from "@/lib/types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function calculateItemSubtotal(item: Pick<ShoppingItemRow, "quantity" | "unit_price">) {
  return item.quantity * item.unit_price;
}

export function calculateListTotal(items: ShoppingItemRow[]) {
  return items.reduce((total, item) => total + calculateItemSubtotal(item), 0);
}

export function getTotalUnits(items: ShoppingItemRow[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}
