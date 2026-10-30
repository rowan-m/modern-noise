import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import {
  buildingUrls,
  NOISE_MODES,
  screamingUrls,
  spookyAmbienceUrls,
  spookyUrls,
  trafficUrls,
} from "../public/js/audio-assets.js";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "../public");
const ROOT_DIR = path.resolve(import.meta.dirname, "..");

test("every configured audio clip URL exists on disk in public/, with no orphan files or missing README credits", () => {
  const allUrls = [
    ...screamingUrls,
    ...trafficUrls,
    ...buildingUrls,
    ...spookyAmbienceUrls,
    ...spookyUrls,
  ];
  expect(allUrls).toHaveLength(103);

  for (const url of allUrls) {
    const filePath = path.join(PUBLIC_DIR, url);
    expect(fs.existsSync(filePath), `Missing audio asset: ${url}`).toBe(true);
  }

  const audioDirs = ["screams", "traffic", "construction", "spooky"];
  const filesOnDisk = [];
  for (const dir of audioDirs) {
    const entries = fs.readdirSync(path.join(PUBLIC_DIR, "audio", dir));
    for (const entry of entries) {
      if (entry.endsWith(".aac")) {
        filesOnDisk.push(`/audio/${dir}/${entry}`);
      }
    }
  }
  expect(filesOnDisk.sort()).toEqual([...allUrls].sort());

  const readme = fs.readFileSync(path.join(ROOT_DIR, "README.md"), "utf8");
  for (const url of allUrls) {
    const match = url.match(/\/(\d+)__/);
    expect(match, `Invalid Freesound filename format: ${url}`).not.toBeNull();
    expect(
      readme.includes(`/sounds/${match[1]}/`),
      `Missing Freesound credit in README.md for clip ${url}`,
    ).toBe(true);
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

test("social preview metadata images and emoji font subset in index.html are valid", () => {
  const indexHtml = fs.readFileSync(
    path.join(PUBLIC_DIR, "index.html"),
    "utf8",
  );
  const doc = new DOMParser().parseFromString(indexHtml, "text/html");

  const ogImage = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");
  const twitterImage = doc
    .querySelector('meta[name="twitter:image"]')
    ?.getAttribute("content");
  const ogImageAlt = doc
    .querySelector('meta[property="og:image:alt"]')
    ?.getAttribute("content");
  const twitterCard = doc
    .querySelector('meta[name="twitter:card"]')
    ?.getAttribute("content");

  expect(ogImage).toBe(
    "https://modern-noise.web.app/img/modern-noise-preview.jpg",
  );
  expect(twitterImage).toBe(ogImage);
  expect(ogImageAlt).toBeTruthy();
  expect(twitterCard).toBe("summary_large_image");

  const previewRelativePath = new URL(ogImage).pathname;
  expect(fs.existsSync(path.join(PUBLIC_DIR, previewRelativePath))).toBe(true);

  const fontLink = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
    .map((el) => el.getAttribute("href"))
    .find((href) => href?.includes("Noto+Emoji"));
  expect(fontLink).toBeTruthy();

  const textParam = new URL(fontLink).searchParams.get("text");
  const fontGlyphs = Array.from(textParam).sort();
  const bodyEmojiMatches =
    doc.body.textContent.match(/\p{Extended_Pictographic}/gu) ?? [];
  const uniqueBodyEmojis = Array.from(new Set(bodyEmojiMatches)).sort();
  expect(fontGlyphs).toEqual(uniqueBodyEmojis);
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
