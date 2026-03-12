import { afterEach, describe, expect, test } from "bun:test";
import {
  getFileUrl,
  loadManifest,
  type ManifestDataset,
} from "@/lib/manifestDataset";

function setWindowSearch(search: string) {
  Object.defineProperty(globalThis, "window", {
    value: { location: { search } },
    configurable: true,
    writable: true,
  });
}

function encodeManifest(manifest: ManifestDataset): string {
  return btoa(JSON.stringify(manifest));
}

function encodeManifestUrlSafe(manifest: ManifestDataset): string {
  return btoa(
    encodeURIComponent(JSON.stringify(manifest)).replace(
      /%([0-9A-F]{2})/g,
      (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { window?: Window }).window;
});

describe("manifestDataset", () => {
  test("returns null when manifest param is not present", () => {
    setWindowSearch("");

    expect(loadManifest()).toBeNull();
    expect(getFileUrl("meta/info.json")).toBeNull();
  });

  test("loads manifest and resolves signed file URLs", () => {
    const manifest = {
      dataset_id: "dataset-123",
      files: [
        {
          relative_path: "meta/info.json",
          signed_url: "https://signed.example/meta-info",
        },
        {
          relative_path: "videos/front_cam_episode_000001.mp4",
          signed_url: "https://signed.example/video-1",
        },
      ],
    };

    setWindowSearch(`?manifest=${encodeURIComponent(encodeManifest(manifest))}`);

    expect(loadManifest()).toEqual(manifest);
    expect(getFileUrl("meta/info.json")).toBe(
      "https://signed.example/meta-info",
    );
    expect(getFileUrl("/videos/front_cam_episode_000001.mp4")).toBe(
      "https://signed.example/video-1",
    );
  });

  test("loads URL-safe base64 manifests with stripped padding", () => {
    const manifest = {
      dataset_id: "dataset-unicode",
      files: [
        {
          relative_path: "meta/info.json",
          signed_url: "https://signed.example/meta-info?label=robot_%E2%9C%93",
        },
      ],
    };

    setWindowSearch(
      `?manifest=${encodeURIComponent(encodeManifestUrlSafe(manifest))}`,
    );

    expect(loadManifest()).toEqual(manifest);
    expect(getFileUrl("meta/info.json")).toBe(
      "https://signed.example/meta-info?label=robot_%E2%9C%93",
    );
  });

  test("throws a clear error for invalid base64 payloads", () => {
    setWindowSearch("?manifest=%%%not-base64%%");

    expect(() => loadManifest()).toThrow(
      "Invalid manifest parameter: failed to decode base64 payload.",
    );
  });

  test("throws a clear error when a requested manifest file is missing", () => {
    const manifest = {
      dataset_id: "dataset-123",
      files: [
        {
          relative_path: "meta/info.json",
          signed_url: "https://signed.example/meta-info",
        },
      ],
    };

    setWindowSearch(`?manifest=${encodeURIComponent(encodeManifest(manifest))}`);

    expect(() => getFileUrl("meta/stats.json")).toThrow(
      "Manifest file not found for path: meta/stats.json",
    );
  });
});
