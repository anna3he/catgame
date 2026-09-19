#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SOURCE = path.join(__dirname, '../public/sprites/source');
const OUT = path.join(__dirname, '../public/sprites');

const SLOT_W = 60;
const SLOT_H = 54;
const DUCK_W = SLOT_W; // same width slot as standing ù duck lowers, not shrinks
const DUCK_H = SLOT_H;
const BG = 255;

const OFFSETS = {
  standing: 0,
  blink: 60,
  runA: 120,
  runB: 180,
  crashed: 300,
  duckA: 360,
  duckB: 420,
};

const SHEET_W = OFFSETS.duckB + DUCK_W;
const SHEET_H = SLOT_H;

function loadPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function isForeground(r, g, b, a) {
  if (a < 128) return false;
  if (r > 240 && g > 240 && b > 240) return false;
  return true;
}

function stripGroundLine(png) {
  let cutAt = png.height;
  const maxRows = 6;
  for (let n = 0; n < maxRows; n++) {
    const y = png.height - 1 - n;
    if (y < 0) break;
    let dark = 0;
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      if (isForeground(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3])) dark++;
    }
    if (dark / png.width > 0.55) cutAt = y;
    else break;
  }
  if (cutAt >= png.height) return png;
  const out = new PNG({ width: png.width, height: cutAt });
  for (let y = 0; y < cutAt; y++) {
    for (let x = 0; x < png.width; x++) {
      const si = (y * png.width + x) << 2;
      const di = (y * png.width + x) << 2;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function cropToContent(png) {
  let minX = png.width, minY = png.height, maxX = 0, maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) << 2;
      const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
      if (isForeground(r, g, b, a)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) return png;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y + minY) * png.width + (x + minX)) << 2;
      const di = (y * w + x) << 2;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function toGrayscale(png) {
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
    if (!isForeground(r, g, b, a)) {
      png.data[i] = png.data[i + 1] = png.data[i + 2] = BG;
      png.data[i + 3] = 0;
      continue;
    }
    const gray = Math.round((r + g + b) / 3);
    png.data[i] = png.data[i + 1] = png.data[i + 2] = gray;
    png.data[i + 3] = 255;
  }
  return png;
}

function scaleNearest(png, tw, th) {
  const out = new PNG({ width: tw, height: th, fill: true });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = out.data[i + 1] = out.data[i + 2] = BG;
    out.data[i + 3] = 0;
  }
  const scaleX = png.width / tw;
  const scaleY = png.height / th;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(png.width - 1, Math.floor(x * scaleX));
      const sy = Math.min(png.height - 1, Math.floor(y * scaleY));
      const si = (sy * png.width + sx) << 2;
      if (png.data[si + 3] === 0) continue;
      const di = (y * tw + x) << 2;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
}

function slotScale(png, slotW, slotH) {
  return Math.min(slotW / png.width, slotH / png.height);
}

function fitInSlot(png, slotW, slotH, scale = null) {
  const s = scale ?? slotScale(png, slotW, slotH);
  const tw = Math.max(1, Math.round(png.width * s));
  const th = Math.max(1, Math.round(png.height * s));
  const scaled = scaleNearest(png, tw, th);
  const out = new PNG({ width: slotW, height: slotH, fill: true });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = out.data[i + 1] = out.data[i + 2] = BG;
    out.data[i + 3] = 255;
  }
  const ox = Math.floor((slotW - tw) / 2);
  const oy = slotH - th;
  blit(out, scaled, ox, oy);
  return out;
}

/** Duck at standing scale, right-aligned so the head (facing right) is not clipped. */
function fitDuck(png, standingScale) {
  const tw = Math.max(1, Math.round(png.width * standingScale));
  const th = Math.max(1, Math.round(png.height * standingScale));
  const scaled = scaleNearest(png, tw, th);
  const out = new PNG({ width: SLOT_W, height: SLOT_H, fill: true });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = out.data[i + 1] = out.data[i + 2] = BG;
    out.data[i + 3] = 255;
  }
  const ox = SLOT_W - tw;
  const oy = SLOT_H - th;
  blit(out, scaled, ox, oy);
  return out;
}

function blit(dest, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= dest.width || dy >= dest.height) continue;
      const si = (y * src.width + x) << 2;
      if (src.data[si + 3] === 0) continue;
      const di = (dy * dest.width + dx) << 2;
      const g = src.data[si];
      if (g >= BG) continue;
      dest.data[di] = dest.data[di + 1] = dest.data[di + 2] = g;
      dest.data[di + 3] = 255;
    }
  }
}

function blitGray(dest, destW, src, srcW, srcH, ox, oy) {
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= destW || dy >= SHEET_H) continue;
      const v = src[y * srcW + x];
      if (v < BG) dest[dy * destW + dx] = v;
    }
  }
}

function pngToGray(png) {
  const gray = new Uint8Array(png.width * png.height).fill(BG);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      if (png.data[i + 3] === 0) continue;
      const g = png.data[i];
      if (g < BG) gray[y * png.width + x] = g;
    }
  }
  return gray;
}

function countRowSegments(gray, w, y) {
  const segments = [];
  let start = -1;
  for (let x = 0; x < w; x++) {
    const dark = gray[y * w + x] < BG;
    if (dark && start < 0) start = x;
    if (!dark && start >= 0) {
      segments.push([start, x - 1]);
      start = -1;
    }
  }
  if (start >= 0) segments.push([start, w - 1]);
  return segments;
}

function findLegTop(gray, w, h) {
  const searchFrom = Math.floor(h * 0.65);
  for (let y = searchFrom; y < h; y++) {
    if (countRowSegments(gray, w, y).length >= 2) return y;
  }
  return Math.floor(h * 0.8);
}

/** Split front/back blobs into 4 legs using foot-row x segments. */
function identifyFourLegs(gray, w, h, legTop) {
  let segments = [];
  for (let y = h - 1; y >= legTop; y--) {
    const row = countRowSegments(gray, w, y).filter(([a, b]) => b - a >= 1);
    if (row.length >= 2) {
      segments = row;
      if (row.length >= 4) break;
    }
  }

  let ranges = [];
  if (segments.length >= 4) {
    ranges = segments.slice(0, 4).map(([a, b]) => ({ min: a, max: b, cx: (a + b) / 2 }));
  } else {
    for (const [a, b] of segments) {
      const mid = Math.floor((a + b) / 2);
      ranges.push({ min: a, max: mid, cx: (a + mid) / 2 });
      ranges.push({ min: mid + 1, max: b, cx: (mid + 1 + b) / 2 });
    }
  }
  ranges.sort((a, b) => a.cx - b.cx);
  ranges = ranges.slice(0, 4);

  const legs = ranges.map((range) => ({ range, pixels: [] }));
  for (let y = legTop; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x] >= BG) continue;
      let best = -1;
      let bestDist = Infinity;
      for (let i = 0; i < legs.length; i++) {
        const r = legs[i].range;
        if (x >= r.min - 2 && x <= r.max + 2) {
          const dist = Math.abs(x - r.cx);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
      }
      if (best >= 0) {
        legs[best].pixels.push({ x, y, v: gray[y * w + x] });
      }
    }
  }
  return legs.filter((leg) => leg.pixels.length >= 2);
}

/** Close 1px pinholes inside the leg silhouette after shifting pixels. */
function fillLegGaps(gray, w, h, legTop) {
  const out = new Uint8Array(gray);
  for (let y = legTop; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x] < BG) continue;
      const neighbors = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < legTop || nx >= w || ny >= h) continue;
        const v = gray[ny * w + nx];
        if (v < BG) neighbors.push(v);
      }
      if (neighbors.length >= 3) out[y * w + x] = neighbors[0];
    }
  }
  return out;
}

/**
 * Quadruped diagonal walk: phase 0 = FL+BR swing, phase 1 = FR+BL swing.
 * Torso rows are preserved; only foot/leg pixels below the split row move.
 */
function makeRunFrame(standingGray, w, h, phase) {
  const legTop = findLegTop(standingGray, w, h);
  const moveFrom = Math.min(h - 1, legTop + 2);
  const legs = identifyFourLegs(standingGray, w, h, moveFrom);
  if (legs.length < 4) return new Uint8Array(standingGray);

  const swing = [2, -3];
  const stance = [0, 0];
  const phases = [
    [swing, stance, stance, swing],
    [stance, swing, swing, stance],
  ];
  const offsets = phases[phase % 2];

  const out = new Uint8Array(standingGray);
  for (const leg of legs) {
    for (const p of leg.pixels) {
      if (p.y >= moveFrom) out[p.y * w + p.x] = BG;
    }
  }

  for (let i = 0; i < 4; i++) {
    const [dx, dy] = offsets[i];
    for (const p of legs[i].pixels) {
      if (p.y < moveFrom) continue;
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (nx < 0 || nx >= w || ny < moveFrom || ny >= h) continue;
      out[ny * w + nx] = p.v;
    }
  }
  return fillLegGaps(out, w, h, moveFrom);
}

function makeBlinkFrame(standingGray, crashedGray, w, h) {
  const out = new Uint8Array(standingGray);
  const eyeTop = Math.floor(h * 0.12);
  const eyeBottom = Math.floor(h * 0.38);
  for (let y = eyeTop; y < eyeBottom; y++) {
    for (let x = 0; x < w; x++) {
      if (crashedGray[y * w + x] < BG) out[y * w + x] = crashedGray[y * w + x];
    }
  }
  return out;
}

function buildFrames() {
  const defaultPng = toGrayscale(stripGroundLine(cropToContent(loadPng(path.join(SOURCE, 'default.png')))));
  const duckPng = toGrayscale(stripGroundLine(cropToContent(loadPng(path.join(SOURCE, 'duck.png')))));
  const crashedPng = toGrayscale(stripGroundLine(cropToContent(loadPng(path.join(SOURCE, 'crashed.png')))));

  const standingScale = slotScale(defaultPng, SLOT_W, SLOT_H);
  const standing = fitInSlot(defaultPng, SLOT_W, SLOT_H, standingScale);
  const standingGray = pngToGray(standing);
  const crashedSlot = fitInSlot(crashedPng, SLOT_W, SLOT_H, standingScale);
  const crashedGray = pngToGray(crashedSlot);
  const duckSlot = fitDuck(duckPng, standingScale);
  const duckGray = pngToGray(duckSlot);

  const runAGray = makeRunFrame(standingGray, SLOT_W, SLOT_H, 0);
  const runBGray = makeRunFrame(standingGray, SLOT_W, SLOT_H, 1);
  const blinkGray = makeBlinkFrame(standingGray, crashedGray, SLOT_W, SLOT_H);

  return {
    standing: standingGray,
    blink: blinkGray,
    runA: runAGray,
    runB: runBGray,
    crashed: crashedGray,
    duckA: duckGray,
    duckB: duckGray,
  };
}

function buildSheet(frames) {
  const sheet = new Uint8Array(SHEET_W * SHEET_H).fill(BG);
  for (const [name, offset] of Object.entries(OFFSETS)) {
    const fw = SLOT_W;
    const fh = SLOT_H;
    const oy = 0;
    blitGray(sheet, SHEET_W, frames[name], fw, fh, offset, oy);
  }
  return sheet;
}

function scaleSheet(sheet, scale) {
  const w = SHEET_W * scale;
  const h = SHEET_H * scale;
  const out = new Uint8Array(w * h).fill(BG);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = sheet[Math.floor(y / scale) * SHEET_W + Math.floor(x / scale)];
    }
  }
  return { pixels: out, width: w, height: h };
}

function writeTransparentSpritePNG(filename, width, height, pixels) {
  const zlib = require('zlib');
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const crc32 = (buf) => {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const v = pixels[y * width + x];
      const di = y * stride + 1 + x * 4;
      if (v >= BG) {
        raw[di] = raw[di + 1] = raw[di + 2] = 255;
        raw[di + 3] = 0;
      } else {
        raw[di] = raw[di + 1] = raw[di + 2] = v;
        raw[di + 3] = 255;
      }
    }
  }
  fs.writeFileSync(filename, Buffer.concat([
    signature, chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

const frames = buildFrames();
const ldpi = buildSheet(frames);
writeTransparentSpritePNG(path.join(OUT, 'cat-sprite.png'), SHEET_W, SHEET_H, ldpi);
const hdpi = scaleSheet(ldpi, 2);
writeTransparentSpritePNG(path.join(OUT, 'cat-sprite-2x.png'), hdpi.width, hdpi.height, hdpi.pixels);

const config = {
  WIDTH: SLOT_W,
  HEIGHT: SLOT_H,
  WIDTH_DUCK: DUCK_W,
  HEIGHT_DUCK: DUCK_H,
  OFFSETS,
  SHEET_W,
};
fs.writeFileSync(path.join(OUT, 'cat-config.json'), JSON.stringify(config, null, 2));
console.log('Generated cat sprites:', config);
