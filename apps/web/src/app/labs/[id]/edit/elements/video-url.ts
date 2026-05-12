// Parse a pasted URL into a recognized video platform + ID. Used by both the
// video renderer (to pick a thumbnail) and the sidebar (to surface "couldn't
// parse this URL" feedback). Vimeo thumbnails need an oEmbed API call which
// we skip — Vimeo falls back to a generic dark placeholder in the editor and
// resolves to a real iframe at session time.

export type VideoPlatform = "youtube" | "vimeo";

export interface ParsedVideo {
  platform: VideoPlatform;
  id: string;
}

const YT_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function parseVideoUrl(input: string): ParsedVideo | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  // YouTube short link: https://youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id ? { platform: "youtube", id } : null;
  }

  if (YT_HOSTS.has(host)) {
    // /watch?v=ID is the canonical share form
    const watchId = url.searchParams.get("v");
    if (watchId) return { platform: "youtube", id: watchId };
    // /embed/ID, /shorts/ID, /v/ID, /live/ID — single-segment paths after the prefix
    const segs = url.pathname.split("/").filter(Boolean);
    if (segs.length >= 2 && ["embed", "shorts", "v", "live"].includes(segs[0]!)) {
      return { platform: "youtube", id: segs[1]! };
    }
    return null;
  }

  if (VIMEO_HOSTS.has(host)) {
    // vimeo.com/<id> and player.vimeo.com/video/<id> are the two forms we accept.
    const segs = url.pathname.split("/").filter(Boolean);
    const id = host === "player.vimeo.com" ? segs[1] : segs[0];
    return id && /^\d+$/.test(id) ? { platform: "vimeo", id } : null;
  }

  return null;
}

/** Pick a thumbnail URL for the editor preview. Returns null for Vimeo (no
 *  cheap server-side lookup) — caller renders a generic placeholder instead. */
export function videoThumbnailUrl(parsed: ParsedVideo): string | null {
  if (parsed.platform === "youtube") {
    // hqdefault is 480×360 — sharp enough to fill an editor box without
    // requiring a Next/Image domain whitelist.
    return `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`;
  }
  return null;
}
