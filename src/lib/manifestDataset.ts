type ManifestFile = {
  relative_path: string;
  signed_url: string;
};

export type ManifestDataset = {
  dataset_id?: string;
  files: ManifestFile[];
};

let cachedSearch: string | null = null;
let cachedManifest: ManifestDataset | null = null;
let cachedFileMap: Map<string, string> = new Map();
let cachedError: Error | null = null;

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/^\/+/, "");
}

function buildManifestError(message: string, cause?: unknown): Error {
  const error = new Error(message);
  if (cause !== undefined) {
    (error as Error & { cause?: unknown }).cause = cause;
  }
  return error;
}

function decodeManifest(param: string): unknown {
  const base64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4 || 4)) % 4);
  const json = decodeURIComponent(
    Array.prototype.map
      .call(atob(base64 + padding), (c: string) => {
        return `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`;
      })
      .join(""),
  );

  return JSON.parse(json);
}

function parseManifestParam(manifestParam: string): ManifestDataset {
  let parsed: unknown;
  try {
    parsed = decodeManifest(manifestParam);
  } catch (error) {
    throw buildManifestError(
      "Invalid manifest parameter: failed to decode base64 payload.",
      error,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw buildManifestError(
      "Invalid manifest parameter: manifest payload must be a JSON object.",
    );
  }

  const manifest = parsed as Partial<ManifestDataset>;
  if (!Array.isArray(manifest.files)) {
    throw buildManifestError(
      "Invalid manifest parameter: manifest.files must be an array.",
    );
  }

  for (const file of manifest.files) {
    if (
      !file ||
      typeof file !== "object" ||
      typeof file.relative_path !== "string" ||
      typeof file.signed_url !== "string" ||
      file.relative_path.length === 0 ||
      file.signed_url.length === 0
    ) {
      throw buildManifestError(
        "Invalid manifest parameter: each file entry must include relative_path and signed_url strings.",
      );
    }
  }

  return {
    dataset_id:
      typeof manifest.dataset_id === "string" ? manifest.dataset_id : undefined,
    files: manifest.files as ManifestFile[],
  };
}

function refreshManifestCache(): ManifestDataset | null {
  if (typeof window === "undefined") {
    cachedSearch = null;
    cachedManifest = null;
    cachedFileMap = new Map();
    cachedError = null;
    return null;
  }

  const search = window.location.search;
  if (search === cachedSearch) {
    if (cachedError) throw cachedError;
    return cachedManifest;
  }

  cachedSearch = search;
  cachedManifest = null;
  cachedFileMap = new Map();
  cachedError = null;

  const manifestParam = new URLSearchParams(search).get("manifest");
  if (!manifestParam) {
    return null;
  }

  try {
    const manifest = parseManifestParam(manifestParam);
    for (const file of manifest.files) {
      cachedFileMap.set(
        normalizeRelativePath(file.relative_path),
        file.signed_url,
      );
    }
    cachedManifest = manifest;
    console.log("Manifest dataset mode enabled", manifest);
    return cachedManifest;
  } catch (error) {
    console.error("Invalid manifest parameter:", error);
    cachedError = buildManifestError(
      "Invalid manifest parameter: failed to decode base64 payload.",
      error,
    );
    throw cachedError;
  }
}

export function loadManifest(): ManifestDataset | null {
  return refreshManifestCache();
}

export function getFileUrl(relativePath: string): string | null {
  const manifest = refreshManifestCache();
  if (!manifest) {
    return null;
  }

  const normalizedPath = normalizeRelativePath(relativePath);
  const fileUrl = cachedFileMap.get(normalizedPath);
  if (!fileUrl) {
    throw buildManifestError(
      `Manifest file not found for path: ${normalizedPath}`,
    );
  }

  return fileUrl;
}
