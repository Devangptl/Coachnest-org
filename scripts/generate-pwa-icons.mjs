// Run once: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "../public/icon.png");
const OUT = join(__dirname, "../public/icons");

mkdirSync(OUT, { recursive: true });

const DARK_BG = { r: 26, g: 26, b: 26, alpha: 1 };
const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

const REGULAR_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

async function makeIcon(size, bg, filename, safePadFraction = 0) {
  if (safePadFraction > 0) {
    // Maskable icons: shrink to safe zone then extend with bg padding
    const iconSize = Math.round(size * (1 - safePadFraction * 2));
    await sharp(SRC)
      .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.round((size - iconSize) / 2),
        bottom: size - iconSize - Math.round((size - iconSize) / 2),
        left: Math.round((size - iconSize) / 2),
        right: size - iconSize - Math.round((size - iconSize) / 2),
        background: bg,
      })
      .flatten({ background: bg })
      .png()
      .toFile(join(OUT, filename));
  } else {
    // Regular icons: cover-fill the square so no letterbox bars appear
    await sharp(SRC)
      .resize(size, size, { fit: "cover", position: "centre" })
      .flatten({ background: bg })
      .png()
      .toFile(join(OUT, filename));
  }
  console.log(`✓ ${filename}`);
}

// Regular icons (dark background)
for (const size of REGULAR_SIZES) {
  await makeIcon(size, DARK_BG, `icon-${size}x${size}.png`);
}

// Maskable icons (20% safe zone padding, dark background)
for (const size of MASKABLE_SIZES) {
  await makeIcon(size, DARK_BG, `icon-maskable-${size}x${size}.png`, 0.2);
}

// Apple touch icon (180×180, white background for iOS light mode)
await makeIcon(180, WHITE_BG, "apple-touch-icon.png");

console.log("\nAll PWA icons generated in public/icons/");
