import Link from "next/link";
import { itemImage } from "@/lib/images";
import { rarityMeta } from "@/lib/constants";
import SafeImage from "./SafeImage";

export default function ItemIcon({
  itemId,
  itemName,
  rarityCode,
  size = 28,
  linkable = true,
}: {
  itemId?: string;
  itemName?: string;
  rarityCode?: string;
  size?: number;
  linkable?: boolean;
}) {
  const rarity = rarityMeta(rarityCode);
  const content = (
    <span
      className="inline-block overflow-hidden rounded border"
      style={{
        width: size,
        height: size,
        borderColor: rarity?.color ?? "#2a2e3a",
      }}
      title={itemName}
    >
      <SafeImage
        src={itemImage(itemId)}
        alt={itemName ?? "item"}
        fallbackText={itemName?.slice(0, 1)}
        className="h-full w-full object-cover"
      />
    </span>
  );

  if (linkable && itemId) {
    return <Link href={`/items/${itemId}`}>{content}</Link>;
  }
  return content;
}
