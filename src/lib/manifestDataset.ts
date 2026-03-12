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

function parseManifestParam(manifestParam: string): ManifestDataset {
  let decoded: string;
  try {
    decoded = atob(manifestParam);
  } catch (error) {
    throw buildManifestError(
      "Invalid manifest parameter: failed to decode base64 payload.",
      error,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch (error) {
    throw buildManifestError(
      "Invalid manifest parameter: failed to parse manifest JSON.",
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
    console.log("Manifest dataset mode enabled");
    return cachedManifest;
  } catch (error) {
    cachedError =
      error instanceof Error
        ? error
        : buildManifestError("Invalid manifest parameter.", error);
    console.error(cachedError.message);
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
