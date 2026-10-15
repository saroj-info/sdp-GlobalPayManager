/**
 * Business logo rules shared by the server (upload endpoint, public image
 * route) and the client (uploader pre-checks, help text).
 *
 * Pure, no DB. The bytes are stored in `business_logos` and served by
 * `GET /api/businesses/:id/logo`; `businesses.logoUrl` holds that URL.
 */

export const BUSINESS_LOGO_MAX_BYTES = 1024 * 1024; // 1 MiB

/**
 * Raster formats only. SVG is refused on purpose: the public image URL can be
 * opened directly, and an SVG served from the app origin would run scripts.
 */
export const BUSINESS_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type BusinessLogoType = (typeof BUSINESS_LOGO_TYPES)[number];

/** Value for the file input's `accept` attribute. */
export const BUSINESS_LOGO_ACCEPT = BUSINESS_LOGO_TYPES.join(',');

export const BUSINESS_LOGO_HELP = 'PNG, JPEG or WebP, up to 1 MB. Wide logos fit the sidebar best.';

/** Bytes needed for `detectImageType` (the WebP header is 12 bytes). */
export const BUSINESS_LOGO_SNIFF_BYTES = 12;

/**
 * Image type from the file's first bytes, ignoring whatever type the browser
 * or the upload declared. `null` when the bytes are not PNG, JPEG or WebP.
 */
export function detectImageType(bytes: Uint8Array): BusinessLogoType | null {
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 // RIFF
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) { // WEBP
    return 'image/webp';
  }
  return null;
}

/**
 * The public URL stored in `businesses.logoUrl`. The hash prefix is a
 * cache-buster only: the route ignores `v`.
 */
export function buildBusinessLogoUrl(businessId: string, sha256: string): string {
  return `/api/businesses/${businessId}/logo?v=${sha256.slice(0, 16)}`;
}
