export const MAX_SESSION_PHOTOS = 3;
export const MAX_SESSION_PHOTO_BYTES = 10 * 1024 * 1024;

export function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
