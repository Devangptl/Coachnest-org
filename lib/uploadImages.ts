/**
 * processContentImages — scans editor HTML for embedded base64 data-URL images,
 * uploads each one to /api/upload, and returns the HTML with real URLs in place.
 *
 * A module-level cache avoids re-uploading the same image when autosave fires
 * multiple times before the editor state is refreshed.
 */

const uploadCache = new Map<string, string>(); // dataUrl → uploadedUrl

export async function processContentImages(
  html: string,
  folder: "courses" | "blogs" | "misc",
): Promise<string> {
  if (!html || !html.includes("data:image/")) return html;

  const matches = Array.from(html.matchAll(/src="(data:image\/[^"]+)"/g));
  if (matches.length === 0) return html;

  let result = html;

  for (const match of matches) {
    const dataUrl = match[1];

    // Cache hit — already uploaded this session
    if (uploadCache.has(dataUrl)) {
      result = result.replace(dataUrl, uploadCache.get(dataUrl)!);
      continue;
    }

    try {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const ext = blob.type.split("/")[1] || "jpg";
      const file = new File([blob], `image.${ext}`, { type: blob.type });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string };

      if (res.ok && data.url) {
        uploadCache.set(dataUrl, data.url);
        result = result.replace(dataUrl, data.url);
      }
    } catch {
      // Keep the data URL if upload fails — content is still usable
    }
  }

  return result;
}
