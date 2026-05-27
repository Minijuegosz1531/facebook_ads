"use client";

import type { Ad } from "../types";

export function AdPreview({ ad }: { ad: Ad }) {
  return (
    <div data-testid="ad-card-preview" className="max-w-sm rounded-lg border border-gray-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ad.image_url} alt={ad.headline} className="aspect-square w-full rounded-t-lg object-cover" />
      <div className="p-3">
        <div className="font-semibold">{ad.headline}</div>
        <p className="text-sm text-gray-600">{ad.body}</p>
        <button className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">
          {ad.cta.replace("_", " ")}
        </button>
      </div>
    </div>
  );
}
