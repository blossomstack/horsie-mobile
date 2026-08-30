import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `src/core` must not reach React Native.
 *
 * It holds the parts carried over from horsie's web client — the transcript
 * fold, the tree and graph layouts — so that the two clients can eventually
 * share one implementation. That only works while the code is plain
 * TypeScript: the moment something here imports a module that pulls the
 * platform in, it stops being portable *and* stops being testable, because
 * vitest cannot parse React Native's Flow-typed entry point.
 *
 * That already happened once. `agentTree.ts` imported a single one-line
 * constant from `@/api/client`, which reaches `expo-secure-store`, and the
 * ported test suite failed to parse at all rather than failing an assertion.
 *
 * Scanned rather than listed, so a file added tomorrow is covered — a
 * hardcoded list is blind to exactly the case this exists for.
 */

const CORE = join(__dirname);

/** What core may import: itself, and the generated wire types (which are pure
 * `interface` and `enum` declarations with no runtime at all). */
const ALLOWED = [/^\.\/?/, /^@\/api\/types$/, /^@\/lib\/time$/, /^node:/, /^vitest$/];

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("src/core", () => {
  it("imports nothing that reaches React Native", () => {
    const offenders: string[] = [];
    for (const file of sources(CORE)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = match[1];
        if (!ALLOWED.some((ok) => ok.test(spec))) {
          offenders.push(`${file.slice(CORE.length + 1)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds the files it is meant to be scanning", () => {
    // A scan that silently matched nothing would pass the check above forever.
    expect(sources(CORE).length).toBeGreaterThan(4);
  });
});
