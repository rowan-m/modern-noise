import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import {
  buildingUrls,
  NOISE_MODES,
  screamingUrls,
  spookyUrls,
  trafficUrls,
} from "../public/js/audio-assets.js";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "../public");

test("every configured audio clip URL exists on disk in public/", () => {
  const allUrls = [
    ...screamingUrls,
    ...trafficUrls,
    ...buildingUrls,
    ...spookyUrls,
  ];
  expect(allUrls).toHaveLength(93);

  for (const url of allUrls) {
    const filePath = path.join(PUBLIC_DIR, url);
    expect(fs.existsSync(filePath), `Missing audio asset: ${url}`).toBe(true);
  }
});

test("every noise mode artwork image exists on disk in public/", () => {
  for (const mode of NOISE_MODES.values()) {
    const artworkPath = path.join(PUBLIC_DIR, mode.artwork);
    expect(
      fs.existsSync(artworkPath),
      `Missing artwork for ${mode.id}: ${mode.artwork}`,
    ).toBe(true);
  }
});

test("manifest.json icons exist on disk", () => {
  const manifestRaw = fs.readFileSync(
    path.join(PUBLIC_DIR, "manifest.json"),
    "utf8",
  );
  const manifest = JSON.parse(manifestRaw);

  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThan(0);

  for (const icon of manifest.icons) {
    const iconPath = path.join(PUBLIC_DIR, icon.src);
    expect(fs.existsSync(iconPath), `Missing manifest icon: ${icon.src}`).toBe(
      true,
    );
  }
});
