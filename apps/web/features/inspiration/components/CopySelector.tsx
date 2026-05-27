"use client";

import { cn } from "@/shared/lib/utils";
import type { Copy } from "../types";

export function CopySelector({
  copies,
  selected,
  onSelect,
}: {
  copies: Copy[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Copies generados</h3>
      <ul className="space-y-2" data-testid="copy-list">
        {copies.map((copy, i) => (
          <li key={i}>
            <button
              type="button"
              data-testid={`copy-option-${i}`}
              aria-pressed={selected === i}
              onClick={() => onSelect(i)}
              className={cn(
                "w-full rounded border p-3 text-left",
                selected === i ? "border-blue-600 bg-blue-50" : "border-gray-200",
              )}
            >
              <div className="font-medium">{copy.headline}</div>
              <div className="text-sm text-gray-600">{copy.body}</div>
              <div className="mt-1 text-xs uppercase text-gray-400">{copy.cta}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
