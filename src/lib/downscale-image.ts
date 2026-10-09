const DOWNSCALE_QUALITY = 0.82;

/**
 * Re-encodes a photo to a bounded resolution/quality before it ever reaches
 * the upload — storage and egress cost scale with what we keep, and a phone
 * photo is routinely 10-50x bigger than the thumbnail it's displayed at.
 * Falls back to the original file if decoding fails (e.g. an exotic format
 * the browser can't decode) or if the "optimized" output somehow came out
 * bigger. Browser-only (canvas + createImageBitmap).
 */
export async function downscaleImage(file: File, maxDimension: number): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", DOWNSCALE_QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}
