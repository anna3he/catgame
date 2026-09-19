'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const scripts = ['runner.js', 'sprite-defs.js', 'cat.js'].map((f) =>
  fs.readFileSync(path.join(root, 'public/js', f), 'utf8')
);

const images = {};
const dom = {
  complete: true,
  addEventListener() {},
};

const document = {
  scripts: [],
  readyState: 'complete',
  querySelector(sel) {
    if (sel === '.interstitial-wrapper') return outer;
    if (sel === '.icon-offline' || sel === '.icon') return { style: {} };
    return null;
  },
  getElementById(id) {
    if (id.includes('offline-resources')) return dom;
    if (id.includes('cat-sprite')) return dom;
    if (id === 'audio-resources') return null;
    return null;
  },
  createElement() {
    return {
      className: '',
      width: 600,
      height: 150,
      style: {},
      appendChild() {},
      addEventListener() {},
      getContext() {
        return {
          fillStyle: '',
          fillRect() {},
          drawImage() {},
          clearRect() {},
          save() {},
          restore() {},
          translate() {},
          fillText() {},
        };
      },
    };
  },
  styleSheets: [{ insertRule() {} }],
};

const outer = {
  querySelector() { return null; },
  appendChild() {},
  offsetWidth: 600,
  classList: { add() {}, remove() {} },
};

const context = {
  document,
  window: {
    document,
    devicePixelRatio: 1,
    navigator: { userAgent: '' },
    addEventListener() {},
    setInterval: clearInterval,
    clearInterval() {},
    requestAnimationFrame: (cb) => cb(0),
  },
  console,
  setTimeout,
  clearTimeout,
  getTimeStamp: () => Date.now(),
};
context.window.window = context.window;

vm.runInNewContext(scripts.join('\n'), context);
vm.runInNewContext("new Runner('.interstitial-wrapper');", context);

console.log('Runner instance:', !!context.Runner.instance_);
console.log('Sprite CLOUD:', !!context.Runner.spriteDefinition?.LDPI?.CLOUD);
console.log('Cat sprite loaded:', !!context.Runner.catSprite);
