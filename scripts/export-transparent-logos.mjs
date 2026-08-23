import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  { input: "public/logo-original-live.png", output: "public/logo.png" },
  { input: "public/logo-mark-original-live.png", output: "public/logo-mark.png" },
];

function processPixel(r, g, b, a) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  const saturation = max - min;

  if (a < 8) {
    return { r, g, b, a: 0 };
  }

  // Remove white / ivory paper texture backgrounds.
  if (saturation < 36 && avg > 200) {
    const key = Math.min(1, (avg - 200) / 55);
    const nextAlpha = Math.round(a * (1 - key));
    if (nextAlpha <= 0) {
      return { r, g, b, a: 0 };
    }

    const clean = 1 - key * 0.88;
    return {
      r: Math.min(255, Math.round(r * clean)),
      g: Math.min(255, Math.round(g * clean)),
      b: Math.min(255, Math.round(b * clean)),
      a: nextAlpha,
    };
  }

  return { r, g, b, a };
}

async function makeTransparent(inputPath, outputPath) {
  const input = join(root, inputPath);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const next = processPixel(
      pixels[i],
      pixels[i + 1],
      pixels[i + 2],
      pixels[i + 3],
    );
    pixels[i] = next.r;
    pixels[i + 1] = next.g;
    pixels[i + 2] = next.b;
    pixels[i + 3] = next.a;
  }

  const png = await sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(join(root, outputPath), png);
  console.log(`Wrote ${outputPath} (${info.width}x${info.height}, transparent)`);
}

for (const target of targets) {
  await makeTransparent(target.input, target.output);
}
