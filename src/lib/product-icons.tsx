import type { LucideIcon } from "lucide-react";
import { Apple, Carrot, Croissant, Egg, Milk, Sparkles, Soup, Wheat } from "lucide-react";

import type { ProductIcon } from "@/lib/types";

const iconMap: Record<ProductIcon, LucideIcon> = {
  apple: Apple,
  milk: Milk,
  bread: Croissant,
  tomato: Soup,
  rice: Wheat,
  egg: Egg,
  carrot: Carrot,
  sparkles: Sparkles,
};

const toneMap: Record<ProductIcon, string> = {
  apple: "bg-emerald-100 text-emerald-700",
  milk: "bg-sky-100 text-sky-700",
  bread: "bg-amber-100 text-amber-700",
  tomato: "bg-rose-100 text-rose-700",
  rice: "bg-stone-100 text-stone-700",
  egg: "bg-yellow-100 text-yellow-700",
  carrot: "bg-orange-100 text-orange-700",
  sparkles: "bg-brand/15 text-brand-dark",
};

export function getProductIcon(icon: ProductIcon) {
  return iconMap[icon] ?? Sparkles;
}

export function getProductTone(icon: ProductIcon) {
  return toneMap[icon] ?? toneMap.sparkles;
}
