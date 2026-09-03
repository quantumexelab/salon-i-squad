/** Crop helpers for profile photo (1:1 JPEG). */

export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: CropAreaPixels,
  fileName = "profile.jpg",
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = Math.max(1, Math.round(Math.min(pixelCrop.width, pixelCrop.height)));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image.");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not export cropped image."))),
      "image/jpeg",
      0.92,
    );
  });

  if (blob.size > 2 * 1024 * 1024) {
    const smaller = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Could not export cropped image.")),
        "image/jpeg",
        0.75,
      );
    });
    return new File([smaller], fileName, { type: "image/jpeg" });
  }

  return new File([blob], fileName, { type: "image/jpeg" });
}
