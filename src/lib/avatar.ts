/**
 * Square-crop and shrink a chosen photo to a small data URL.
 * Done entirely in-page — the photo never leaves the device.
 */
const SIZE = 256;

export async function fileToAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const cv = document.createElement("canvas");
  cv.width = SIZE;
  cv.height = SIZE;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  // JPEG keeps the stored string small enough to sit comfortably in IndexedDB.
  return cv.toDataURL("image/jpeg", 0.85);
}
