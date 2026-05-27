"use client";

import type { Copy } from "../types";

// Live Facebook-style preview of the chosen image + copy.
export function AssetCombiner({
  image,
  copy,
}: {
  image: string | null;
  copy: Copy | null;
}) {
  if (!image || !copy) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Selecciona una imagen y un copy para ver el preview.
      </div>
    );
  }

  return (
    <div data-testid="ad-preview" className="max-w-sm rounded-lg border border-gray-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="preview" className="aspect-square w-full rounded-t-lg object-cover" />
      <div className="p-3">
        <div className="font-semibold">{copy.headline}</div>
        <p className="text-sm text-gray-600">{copy.body}</p>
        <button className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">
          {copy.cta.replace("_", " ")}
        </button>
      </div>
    </div>
  );
}
