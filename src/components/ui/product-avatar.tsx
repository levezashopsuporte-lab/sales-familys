import { cn } from "@/lib/utils";
import { getProductIcon, getProductTone } from "@/lib/product-icons";
import type { ProductIcon } from "@/lib/types";

type ProductAvatarProps = {
  icon: ProductIcon;
  className?: string;
};

export function ProductAvatar({ icon, className }: ProductAvatarProps) {
  const Icon = getProductIcon(icon);

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 shadow-sm",
        getProductTone(icon),
        className,
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2.1} />
    </div>
  );
}
