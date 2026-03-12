"use client";

import { useEffect } from "react";
import { loadManifest } from "@/lib/manifestDataset";

export default function ManifestDatasetInit() {
  useEffect(() => {
    try {
      loadManifest();
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Invalid manifest parameter.",
      );
    }
  }, []);

  return null;
}
