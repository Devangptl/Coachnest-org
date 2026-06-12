// Run once: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "../public/icon.png");
const OUT = join(__dirname, "../public/icons");

mkdirSync(OUT, { recursive: true });

const DARK_BG  = { r: 26,  g: 26,  b: 26,  alpha: 1 };
const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

// Composite the logo (with padding) onto a solid background.
// padFraction = fraction of canvas size used as padding on each side.
// e.g. padFraction 0.15 → logo fills the inner 70% of the canvas.
async function makeIcon(size, bg, filename, padFraction = 0.15) {
  const logoSize = Math.round(size * (1 - padFraction * 2));

  // 1. Resize logo to fit within logoSize × logoSize (no cropping, no bars)
  const logoBuf = await sharp(SRC)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 2. Get actual rendered size after contain-resize
  const meta = await sharp(logoBuf).metadata();
  const offsetX = Math.round((size - meta.width)  / 2);
  const offsetY = Math.round((size - meta.height) / 2);

  // 3. Composite logo centered on a solid background canvas
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: logoBuf, left: offsetX, top: offsetY }])
    .flatten({ background: bg })
    .png()
    .toFile(join(OUT, filename));

  console.log(`✓ ${filename}`);
}

// Regular icons — 15% padding on each side (logo fills 70% of canvas)
const REGULAR_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of REGULAR_SIZES) {
  await makeIcon(size, DARK_BG, `icon-${size}x${size}.png`, 0.15);
}

// Maskable icons — 20% safe zone (Android adaptive icon safe area)
const MASKABLE_SIZES = [192, 512];
for (const size of MASKABLE_SIZES) {
  await makeIcon(size, DARK_BG, `icon-maskable-${size}x${size}.png`, 0.20);
}

// Apple touch icon — white background for iOS
await makeIcon(180, WHITE_BG, "apple-touch-icon.png", 0.15);

console.log("\nAll PWA icons generated in public/icons/");
