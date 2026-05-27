"use client";

import { cn } from "@/shared/lib/utils";

export function ImageSelector({
  images,
  selected,
  onSelect,
}: {
  images: string[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Imágenes generadas</h3>
      <div className="grid grid-cols-5 gap-3" data-testid="image-grid">
        {images.map((url, i) => (
          <button
            type="button"
            key={url}
            data-testid={`image-option-${i}`}
            aria-pressed={selected === i}
            onClick={() => onSelect(i)}
            className={cn(
              "aspect-square overflow-hidden rounded border-2",
              selected === i ? "border-blue-600" : "border-transparent",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Opción ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
