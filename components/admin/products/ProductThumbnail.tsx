import Image from "next/image";

// Small product image for the admin pages. next/image serves a resized copy
// (e.g. a 44px thumbnail, not the full upload) and loads it lazily.
export default function ProductThumbnail({ url, name, size }: { url: string | null; name: string; size: number }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-md bg-slate-100" style={{ width: size, height: size }}>
      {url && <Image src={url} alt={name} width={size} height={size} className="h-full w-full object-cover" />}
    </div>
  );
}
