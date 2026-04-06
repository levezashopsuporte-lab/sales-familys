import type { ProductIcon, ProductRow } from "@/lib/types";

const categoryIconMap: Record<string, ProductIcon> = {
  alimentos_basicos: "rice",
  laticinios: "milk",
  proteinas: "egg",
  frutas: "apple",
  legumes: "carrot",
  padaria: "bread",
  bebidas: "milk",
  limpeza: "sparkles",
  higiene: "sparkles",
  congelados: "tomato",
  mercearia: "tomato",
};

export function getCategoryIcon(category: string | null | undefined): ProductIcon {
  if (!category) {
    return "sparkles";
  }

  return categoryIconMap[category] ?? "sparkles";
}

export function formatCategoryLabel(category: string) {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getProductSubtitle(product: Pick<ProductRow, "category" | "unit">) {
  return `${formatCategoryLabel(product.category)} - ${product.unit}`;
}
