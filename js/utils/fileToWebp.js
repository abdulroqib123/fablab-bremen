export async function convertToWebP(file, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) reject("WebP conversion failed");
          else resolve(blob);
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => reject("Image load failed");

    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target.result);
    reader.readAsDataURL(file);
  });
}
