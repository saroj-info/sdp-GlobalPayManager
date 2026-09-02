/**
 * On-disk registry of platform primers (short markdown docs used to ground
 * the AI's how-to answers). Loaded lazily on first access and cached for
 * the process lifetime.
 *
 * Each primer file lives under `./primers/<slug>.md` and MUST begin with a
 * simple `---` frontmatter block:
 *
 *   ---
 *   title: How to approve a timesheet
 *   audience: business_user, sdp_internal
 *   updated: 2026-08-25
 *   summary: Two-line description used in the primer index.
 *   ---
 *
 *   Markdown body here…
 *
 * `audience` is a comma-separated list of roles that may see the primer;
 * `*` means everyone.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { CallerRole } from "./types";

// Search order for the primers/ directory:
//   1. Relative to this module (works in dev when tsx runs the .ts files in place).
//   2. Relative to process.cwd() at the source path (works in prod when the
//      server is launched from the project root and the source tree is on disk).
// Falls back to an empty index if neither exists so search still works —
// Q&A answers just lose their grounding.

export interface PrimerFront {
  slug: string;
  title: string;
  audience: string[]; // ['*'] | ['sdp_internal', 'business_user'] | ...
  updated: string;
  summary: string;
}

export interface Primer extends PrimerFront {
  body: string;
}

let INDEX: PrimerFront[] | null = null;
const BODY_CACHE = new Map<string, Primer>();

function primersDir(): string | null {
  const candidates: string[] = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    candidates.push(join(here, "primers"));
  } catch {
    // import.meta.url unavailable — fall through to cwd candidates.
  }
  candidates.push(join(process.cwd(), "server", "modules", "ai", "search", "primers"));
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c;
    } catch {
      // ignore
    }
  }
  return null;
}

function parseFront(raw: string, slug: string): { front: PrimerFront; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      front: { slug, title: slug, audience: ["*"], updated: "", summary: "" },
      body: raw.trim(),
    };
  }
  const headerBlock = match[1];
  const body = match[2].trim();
  const front: Record<string, string> = {};
  for (const line of headerBlock.split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    front[kv[1].trim()] = kv[2].trim();
  }
  const audience = (front.audience || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    front: {
      slug,
      title: front.title || slug,
      audience: audience.length ? audience : ["*"],
      updated: front.updated || "",
      summary: front.summary || "",
    },
    body,
  };
}

function loadIndex(): PrimerFront[] {
  if (INDEX) return INDEX;
  const out: PrimerFront[] = [];
  const dir = primersDir();
  if (!dir) {
    console.warn("[ai/search] no primers directory found — Q&A answers will be ungrounded");
    INDEX = out;
    return INDEX;
  }
  try {
    const entries = readdirSync(dir);
    for (const name of entries) {
      if (!name.endsWith(".md")) continue;
      const slug = name.replace(/\.md$/, "");
      try {
        const raw = readFileSync(join(dir, name), "utf8");
        const { front, body } = parseFront(raw, slug);
        out.push(front);
        BODY_CACHE.set(slug, { ...front, body });
      } catch (err) {
        console.error(`[ai/search] failed to read primer ${name}:`, (err as Error)?.message);
      }
    }
  } catch (err) {
    console.error(`[ai/search] failed to list primers dir:`, (err as Error)?.message);
  }
  INDEX = out;
  return INDEX;
}

export function listPrimersForRole(role: CallerRole, topic?: string): PrimerFront[] {
  const idx = loadIndex();
  const q = (topic ?? "").trim().toLowerCase();
  return idx
    .filter((p) => p.audience.includes("*") || p.audience.includes(role))
    .filter((p) =>
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q),
    );
}

export function getPrimer(slug: string, role: CallerRole): Primer | null {
  loadIndex();
  const primer = BODY_CACHE.get(slug);
  if (!primer) return null;
  if (!primer.audience.includes("*") && !primer.audience.includes(role)) return null;
  return primer;
}

export function primerIndexHash(role: CallerRole): string {
  const idx = listPrimersForRole(role);
  return idx.map((p) => `${p.slug}:${p.updated}`).join("|");
}
