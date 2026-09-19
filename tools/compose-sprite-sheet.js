#!/usr/bin/env node
/**
 * Generates cat sprite sheets for Cat Runner.
 * Frame layout matches Chrome T-Rex offsets: 0, 44, 88, 132, 220, 262, 321
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BODY = 83;
const EYE = 247;
const BG = 255;

const FRAME_W = 44;
const FRAME_H = 47;
const DUCK_W = 59;
const DUCK_H = 25;
const SHEET_W = 380;
const SHEET_H = 47;

const FRAME_OFFSETS = {
  standing: 0,
  blink: 44,
  runA: 88,
  runB: 132,
  crashed: 220,
  duckA: 262,
  duckB: 321,
};

function createSheet() {
  return new Uint8Array(SHEET_W * SHEET_H).fill(BG);
}

function setPixel(sheet, x, y, color) {
  if (x < 0 || y < 0 || x >= SHEET_W || y >= SHEET_H) return;
  sheet[y * SHEET_W + x] = color;
}

function fillRect(sheet, ox, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(sheet, ox + x + dx, y + dy, color);
    }
  }
}

function drawTail(sheet, ox, lift = 0) {
  const pts = [
    [4, 40 - lift], [3, 36 - lift], [2, 32 - lift], [3, 26 - lift],
    [5, 22 - lift], [8, 19 - lift], [10, 18 - lift], [11, 20 - lift],
    [9, 24 - lift], [8, 28 - lift], [10, 32 - lift], [12, 36 - lift],
  ];
  for (const [x, y] of pts) setPixel(sheet, ox + x, y, BODY);
}

function drawBody(sheet, ox, yTop = 30) {
  fillRect(sheet, ox, 10, yTop, 24, 10, BODY);
  fillRect(sheet, ox, 28, yTop - 4, 12, 14, BODY);
}

function drawHead(sheet, ox, eyesOpen, yTop = 26, crashed = false) {
  fillRect(sheet, ox, 30, yTop, 12, 12, BODY);
  fillRect(sheet, ox, 38, yTop + 4, 4, 4, BODY);
  setPixel(sheet, ox + 41, yTop + 6, BODY);
  // Ears
  setPixel(sheet, ox + 31, yTop - 2, BODY);
  setPixel(sheet, ox + 32, yTop - 3, BODY);
  setPixel(sheet, ox + 33, yTop - 2, BODY);
  setPixel(sheet, ox + 36, yTop - 2, BODY);
  setPixel(sheet, ox + 37, yTop - 3, BODY);
  setPixel(sheet, ox + 38, yTop - 2, BODY);

  const eyeY = yTop + 4;
  if (crashed || !eyesOpen) {
    fillRect(sheet, ox, 36, eyeY + 1, 4, 1, BODY);
    if (crashed) fillRect(sheet, ox, 35, eyeY + 2, 6, 1, BODY);
  } else {
    setPixel(sheet, ox + 37, eyeY, EYE);
    setPixel(sheet, ox + 38, eyeY, EYE);
  }
}

function drawLegs(sheet, ox, phase) {
  const groundY = 42;
  const configs = [
    [[14, groundY, 3, 5], [22, groundY, 3, 5], [28, groundY - 2, 3, 7], [34, groundY - 4, 3, 9]],
    [[14, groundY - 3, 3, 8], [22, groundY - 1, 3, 6], [28, groundY, 3, 5], [34, groundY, 3, 5]],
  ];
  const legs = configs[phase % 2];
  for (const [x, y, w, h] of legs) fillRect(sheet, ox, x, y, w, h, BODY);
}

function drawStandingFrame(sheet, ox, eyesOpen, runPhase = 0, crashed = false) {
  drawTail(sheet, ox, crashed ? 1 : 0);
  drawBody(sheet, ox, 30);
  drawHead(sheet, ox, eyesOpen, 26, crashed);
  drawLegs(sheet, ox, runPhase);
}

function drawDuckFrame(sheet, ox, phase) {
  const baseY = 22;
  fillRect(sheet, ox, 4, baseY + 8, 50, 14, BODY);
  fillRect(sheet, ox, 42, baseY + 4, 14, 12, BODY);
  fillRect(sheet, ox, 52, baseY + 8, 5, 4, BODY);
  // Flat ears
  fillRect(sheet, ox, 44, baseY + 2, 4, 2, BODY);
  fillRect(sheet, ox, 49, baseY + 2, 4, 2, BODY);
  setPixel(sheet, ox + 54, baseY + 6, EYE);
  setPixel(sheet, ox + 55, baseY + 6, EYE);
  const legSets = [
    [[10, baseY + 20, 4, 5], [22, baseY + 20, 4, 5], [34, baseY + 20, 4, 5], [46, baseY + 20, 4, 5]],
    [[12, baseY + 20, 4, 5], [24, baseY + 20, 4, 5], [36, baseY + 20, 4, 5], [48, baseY + 20, 4, 5]],
  ];
  for (const [x, y, w, h] of legSets[phase % 2]) fillRect(sheet, ox, x, y, w, h, BODY);
}

function buildSheet() {
  const sheet = createSheet();
  drawStandingFrame(sheet, FRAME_OFFSETS.standing, true, 0, false);
  drawStandingFrame(sheet, FRAME_OFFSETS.blink, false, 0, false);
  drawStandingFrame(sheet, FRAME_OFFSETS.runA, true, 0, false);
  drawStandingFrame(sheet, FRAME_OFFSETS.runB, true, 1, false);
  drawStandingFrame(sheet, FRAME_OFFSETS.crashed, false, 0, true);
  drawDuckFrame(sheet, FRAME_OFFSETS.duckA, 0);
  drawDuckFrame(sheet, FRAME_OFFSETS.duckB, 1);
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

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writeGrayscalePNG(filename, width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) raw[y * stride + 1 + x] = pixels[y * width + x];
  }

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filename, png);
}

const outDir = path.join(__dirname, '..', 'public', 'sprites');
fs.mkdirSync(outDir, { recursive: true });

const ldpi = buildSheet();
writeGrayscalePNG(path.join(outDir, 'cat-sprite.png'), SHEET_W, SHEET_H, ldpi);

const hdpi = scaleSheet(ldpi, 2);
writeGrayscalePNG(path.join(outDir, 'cat-sprite-2x.png'), hdpi.width, hdpi.height, hdpi.pixels);

console.log('Wrote cat-sprite.png and cat-sprite-2x.png');
