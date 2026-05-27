"use client";

import { useState } from "react";

export function useAssetSelection() {
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [copyIndex, setCopyIndex] = useState<number | null>(null);

  return {
    imageIndex,
    copyIndex,
    setImageIndex,
    setCopyIndex,
    isComplete: imageIndex !== null && copyIndex !== null,
  };
}
