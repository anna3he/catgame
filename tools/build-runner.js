#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const base = fs.readFileSync(path.join(__dirname, '../public/js/runner-base.js'), 'utf8');

const catJs = `// Cat player for Cat Runner (adapted from Chromium Trex)
function Cat(canvas, spritePos) {
  this.canvas = canvas;
  this.canvasCtx = canvas.getContext('2d');
  this.spritePos = spritePos;
  this.xPos = 0;
  this.yPos = 0;
  this.groundYPos = 0;
  this.currentFrame = 0;
  this.currentAnimFrames = [];
  this.blinkDelay = 0;
  this.animStartTime = 0;
  this.timer = 0;
  this.msPerFrame = 1000 / FPS;
  this.config = Cat.config;
  this.status = Cat.status.WAITING;
  this.jumping = false;
  this.ducking = false;
  this.jumpVelocity = 0;
  this.reachedMinHeight = false;
  this.speedDrop = false;
  this.jumpCount = 0;
  this.jumpspotX = 0;
  this.init();
}

Cat.config = {
  DROP_VELOCITY: -5,
  GRAVITY: 0.6,
  HEIGHT: 47,
  HEIGHT_DUCK: 25,
  INIITAL_JUMP_VELOCITY: -10,
  INTRO_DURATION: 1500,
  MAX_JUMP_HEIGHT: 30,
  MIN_JUMP_HEIGHT: 30,
  SPEED_DROP_COEFFICIENT: 3,
  SPRITE_WIDTH: 262,
  START_X_POS: 50,
  WIDTH: 44,
  WIDTH_DUCK: 59
};

Cat.collisionBoxes = {
  DUCKING: [new CollisionBox(1, 18, 55, 25)],
  RUNNING: [
    new CollisionBox(22, 0, 17, 16),
    new CollisionBox(1, 18, 30, 9),
    new CollisionBox(10, 35, 14, 8),
    new CollisionBox(1, 24, 29, 5),
    new CollisionBox(5, 30, 21, 4),
    new CollisionBox(9, 34, 15, 4)
  ]
};

Cat.status = {
  CRASHED: 'CRASHED',
  DUCKING: 'DUCKING',
  JUMPING: 'JUMPING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING'
};

Cat.BLINK_TIMING = 7000;

Cat.animFrames = {
  WAITING: { frames: [44, 0], msPerFrame: 1000 / 3 },
  RUNNING: { frames: [88, 132], msPerFrame: 1000 / 12 },
  CRASHED: { frames: [220], msPerFrame: 1000 / 60 },
  JUMPING: { frames: [0], msPerFrame: 1000 / 60 },
  DUCKING: { frames: [262, 321], msPerFrame: 1000 / 8 }
};

Cat.prototype = {
  init: function() {
    this.blinkDelay = this.setBlinkDelay();
    this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
        Runner.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
    this.draw(0, 0);
    this.update(0, Cat.status.WAITING);
  },
  setJumpVelocity: function(setting) {
    this.config.INIITAL_JUMP_VELOCITY = -setting;
    this.config.DROP_VELOCITY = -setting / 2;
  },
  update: function(deltaTime, opt_status) {
    this.timer += deltaTime;
    if (opt_status) {
      this.status = opt_status;
      this.currentFrame = 0;
      this.msPerFrame = Cat.animFrames[opt_status].msPerFrame;
      this.currentAnimFrames = Cat.animFrames[opt_status].frames;
      if (opt_status == Cat.status.WAITING) {
        this.animStartTime = getTimeStamp();
        this.setBlinkDelay();
      }
    }
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
      this.xPos += Math.round((this.config.START_X_POS /
          this.config.INTRO_DURATION) * deltaTime);
    }
    if (this.status == Cat.status.WAITING) {
      this.blink(getTimeStamp());
    } else {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }
    if (this.timer >= this.msPerFrame) {
      this.currentFrame = this.currentFrame ==
          this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
      this.timer = 0;
    }
    if (this.speedDrop && this.yPos == this.groundYPos) {
      this.speedDrop = false;
      this.setDuck(true);
    }
  },
  draw: function(x, y) {
    var sourceX = x;
    var sourceY = y;
    var sourceWidth = this.ducking && this.status != Cat.status.CRASHED ?
        this.config.WIDTH_DUCK : this.config.WIDTH;
    var sourceHeight = this.config.HEIGHT;
    if (IS_HIDPI) {
      sourceX *= 2;
      sourceY *= 2;
      sourceWidth *= 2;
      sourceHeight *= 2;
    }
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;
    var sprite = Runner.catSprite;
    if (this.ducking && this.status != Cat.status.CRASHED) {
      this.canvasCtx.drawImage(sprite, sourceX, sourceY,
          sourceWidth, sourceHeight,
          this.xPos, this.yPos,
          this.config.WIDTH_DUCK, this.config.HEIGHT);
    } else {
      if (this.ducking && this.status == Cat.status.CRASHED) {
        this.xPos++;
      }
      this.canvasCtx.drawImage(sprite, sourceX, sourceY,
          sourceWidth, sourceHeight,
          this.xPos, this.yPos,
          this.config.WIDTH, this.config.HEIGHT);
    }
  },
  setBlinkDelay: function() {
    this.blinkDelay = Math.ceil(Math.random() * Cat.BLINK_TIMING);
  },
  blink: function(time) {
    var deltaTime = time - this.animStartTime;
    if (deltaTime >= this.blinkDelay) {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
      if (this.currentFrame == 1) {
        this.setBlinkDelay();
        this.animStartTime = time;
      }
    }
  },
  startJump: function(speed) {
    if (!this.jumping) {
      this.update(0, Cat.status.JUMPING);
      this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY - (speed / 10);
      this.jumping = true;
      this.reachedMinHeight = false;
      this.speedDrop = false;
    }
  },
  endJump: function() {
    if (this.reachedMinHeight &&
        this.jumpVelocity < this.config.DROP_VELOCITY) {
      this.jumpVelocity = this.config.DROP_VELOCITY;
    }
  },
  updateJump: function(deltaTime, speed) {
    var msPerFrame = Cat.animFrames[this.status].msPerFrame;
    var framesElapsed = deltaTime / msPerFrame;
    if (this.speedDrop) {
      this.yPos += Math.round(this.jumpVelocity *
          this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
    } else {
      this.yPos += Math.round(this.jumpVelocity * framesElapsed);
    }
    this.jumpVelocity += this.config.GRAVITY * framesElapsed;
    if (this.yPos < this.minJumpHeight || this.speedDrop) {
      this.reachedMinHeight = true;
    }
    if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
      this.endJump();
    }
    if (this.yPos > this.groundYPos) {
      this.reset();
      this.jumpCount++;
    }
    this.update(deltaTime);
  },
  setSpeedDrop: function() {
    this.speedDrop = true;
    this.jumpVelocity = 1;
  },
  setDuck: function(isDucking) {
    if (isDucking && this.status != Cat.status.DUCKING) {
      this.update(0, Cat.status.DUCKING);
      this.ducking = true;
    } else if (this.status == Cat.status.DUCKING) {
      this.update(0, Cat.status.RUNNING);
      this.ducking = false;
    }
  },
  reset: function() {
    this.yPos = this.groundYPos;
    this.jumpVelocity = 0;
    this.jumping = false;
    this.ducking = false;
    this.update(0, Cat.status.RUNNING);
    this.midair = false;
    this.speedDrop = false;
    this.jumpCount = 0;
  }
};
`;

const spriteDefs = `// Sprite sheet coordinates for Cat Runner (load after runner.js)
Runner.spriteDefinition = {
  LDPI: {
    CACTUS_LARGE: {x: 332, y: 2},
    CACTUS_SMALL: {x: 228, y: 2},
    CLOUD: {x: 86, y: 2},
    HORIZON: {x: 2, y: 54},
    MOON: {x: 484, y: 2},
    PTERODACTYL: {x: 134, y: 2},
    RESTART: {x: 2, y: 2},
    TEXT_SPRITE: {x: 655, y: 2},
    CAT: {x: 0, y: 0},
    STAR: {x: 645, y: 2}
  },
  HDPI: {
    CACTUS_LARGE: {x: 652, y: 2},
    CACTUS_SMALL: {x: 446, y: 2},
    CLOUD: {x: 166, y: 2},
    HORIZON: {x: 2, y: 104},
    MOON: {x: 954, y: 2},
    PTERODACTYL: {x: 260, y: 2},
    RESTART: {x: 2, y: 2},
    TEXT_SPRITE: {x: 1294, y: 2},
    CAT: {x: 0, y: 0},
    STAR: {x: 1276, y: 2}
  }
};
`;

let runner = base;

// Remove Trex block (Cat class lives in cat.js)  lines before DistanceMeter
{
  const lines = runner.split('\n');
  const trexStart = lines.findIndex((l) => l.includes('T-rex game character'));
  const distStart = lines.findIndex((l) => l.startsWith('function DistanceMeter'));
  if (trexStart >= 0 && distStart > trexStart) {
    lines.splice(trexStart - 2, distStart - trexStart + 2, catJs.trim(), '');
    runner = lines.join('\n');
  }
}

runner = runner
  .replace(/this\.tRex/g, 'this.cat')
  .replace(/Trex\./g, 'Cat.')
  .replace(/new Trex/g, 'new Cat')
  .replace(/function checkForCollision\(obstacle, tRex,/g,
    'function checkForCollision(obstacle, cat,')
  .replace(/\/\/ Draw t-rex/, '// Draw cat')
  .replace(/T-Rex runner\./, 'Cat Runner.')
  .replace(/Game intro animation, T-rex moves/, 'Game intro animation, cat moves');

// Fix collision detection parameter references
runner = runner.replace(
  /function checkForCollision\(obstacle, cat, opt_canvasCtx\) \{[\s\S]*?return false;\n\};/,
  `function checkForCollision(obstacle, cat, opt_canvasCtx) {
  var obstacleBoxXPos = Runner.defaultDimensions.WIDTH + obstacle.xPos;
  var catBox = new CollisionBox(
      cat.xPos + 1,
      cat.yPos + 1,
      cat.config.WIDTH - 2,
      cat.config.HEIGHT - 2);
  var obstacleBox = new CollisionBox(
      obstacle.xPos + 1,
      obstacle.yPos + 1,
      obstacle.typeConfig.width * obstacle.size - 2,
      obstacle.typeConfig.height - 2);
  if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, catBox, obstacleBox);
  }
  if (boxCompare(catBox, obstacleBox)) {
    var collisionBoxes = obstacle.collisionBoxes;
    var catCollisionBoxes = cat.ducking ?
        Cat.collisionBoxes.DUCKING : Cat.collisionBoxes.RUNNING;
    for (var t = 0; t < catCollisionBoxes.length; t++) {
      for (var i = 0; i < collisionBoxes.length; i++) {
        var adjCatBox =
            createAdjustedCollisionBox(catCollisionBoxes[t], catBox);
        var adjObstacleBox =
            createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
        var crashed = boxCompare(adjCatBox, adjObstacleBox);
        if (opt_canvasCtx) {
          drawCollisionBoxes(opt_canvasCtx, adjCatBox, adjObstacleBox);
        }
        if (crashed) {
          return [adjCatBox, adjObstacleBox];
        }
      }
    }
  }
  return false;
};`
);

// Replace sprite definition block
runner = runner.replace(
  /Runner\.spriteDefinition = \{[\s\S]*?\};/,
  `Runner.spriteDefinition = {
  LDPI: {
    CACTUS_LARGE: {x: 332, y: 2},
    CACTUS_SMALL: {x: 228, y: 2},
    CLOUD: {x: 86, y: 2},
    HORIZON: {x: 2, y: 54},
    MOON: {x: 484, y: 2},
    PTERODACTYL: {x: 134, y: 2},
    RESTART: {x: 2, y: 2},
    TEXT_SPRITE: {x: 655, y: 2},
    CAT: {x: 0, y: 0},
    STAR: {x: 645, y: 2}
  },
  HDPI: {
    CACTUS_LARGE: {x: 652, y: 2},
    CACTUS_SMALL: {x: 446, y: 2},
    CLOUD: {x: 166, y: 2},
    HORIZON: {x: 2, y: 104},
    MOON: {x: 954, y: 2},
    PTERODACTYL: {x: 260, y: 2},
    RESTART: {x: 2, y: 2},
    TEXT_SPRITE: {x: 1294, y: 2},
    CAT: {x: 0, y: 0},
    STAR: {x: 1276, y: 2}
  }
};`
);

// Fix isDisabled
runner = runner.replace(
  /isDisabled: function\(\) \{[\s\S]*?\},/,
  'isDisabled: function() { return false; },'
);

// Fix loadImages for dual sprites
runner = runner.replace(
  /loadImages: function\(\) \{[\s\S]*?\n  \},/,
  `loadImages: function() {
    var imagesLoaded = 0;
    var onLoad = function() {
      imagesLoaded++;
      if (imagesLoaded >= 2) {
        this.init();
      }
    }.bind(this);

    if (IS_HIDPI) {
      Runner.imageSprite = document.getElementById('offline-resources-2x');
      Runner.catSprite = document.getElementById('cat-sprite-2x');
      this.spriteDef = Runner.spriteDefinition.HDPI;
    } else {
      Runner.imageSprite = document.getElementById('offline-resources-1x');
      Runner.catSprite = document.getElementById('cat-sprite-1x');
      this.spriteDef = Runner.spriteDefinition.LDPI;
    }

    [Runner.imageSprite, Runner.catSprite].forEach(function(img) {
      if (img.complete) {
        onLoad();
      } else {
        img.addEventListener(Runner.events.LOAD, onLoad);
      }
    });
  },`
);

// Fix init cat reference
runner = runner.replace(
  'this.cat = new Cat(this.canvas, this.spriteDef.TREX);',
  'this.cat = new Cat(this.canvas, this.spriteDef.CAT);'
);

// Make sounds optional when audio template is absent
runner = runner.replace(
  /loadSounds: function\(\) \{[\s\S]*?\n  \},/,
  `loadSounds: function() {
    if (!IS_IOS) {
      var tpl = document.getElementById(this.config.RESOURCE_TEMPLATE_ID);
      if (!tpl || !tpl.content) return;
      this.audioContext = new AudioContext();
      var resourceTemplate = tpl.content;
      for (var sound in Runner.sounds) {
        var el = resourceTemplate.getElementById(Runner.sounds[sound]);
        if (!el || !el.src) continue;
        var soundSrc = el.src.substr(el.src.indexOf(',') + 1);
        var buffer = decodeBase64ToArrayBuffer(soundSrc);
        this.audioContext.decodeAudioData(buffer, function(index, audioData) {
          this.soundFx[index] = audioData;
        }.bind(this, sound));
      }
    }
  },`
);

// Show full game canvas immediately with ground + waiting cat
runner = runner.replace(
  /this\.outerContainerEl\.appendChild\(this\.containerEl\);/,
  `this.outerContainerEl.appendChild(this.containerEl);
    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
    this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
    this.horizon.update(0, 0, false);
    this.cat.draw(0, 0);`
);

runner = runner.replace(
  /if \(!this\.crashed\) \{\n\s+this\.cat\.update\(deltaTime\);\n\s+this\.raq\(\);\n\s+\}/,
  `if (!this.crashed) {
      if (!this.activated) {
        this.clearCanvas();
        this.horizon.update(0, 0, false);
      }
      this.cat.update(deltaTime);
      this.raq();
    }`
);

// Cross-browser intro animation
runner = runner.replace(
  "this.containerEl.addEventListener(Runner.events.ANIM_END,\n          this.startGame.bind(this));",
  `this.containerEl.addEventListener('animationend', this.startGame.bind(this));
      this.containerEl.addEventListener(Runner.events.ANIM_END,
          this.startGame.bind(this));`
);
runner = runner.replace(
  "this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';",
  `this.containerEl.style.animation = 'intro .4s ease-out 1 both';
      this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';`
);
runner = runner.replace(
  "this.containerEl.style.webkitAnimation = '';",
  `this.containerEl.style.animation = '';
      this.containerEl.style.webkitAnimation = '';`
);

// Keep runner.js as IIFE only; bootstrap lives in main.js

const jsDir = path.join(__dirname, '../public/js');
fs.writeFileSync(path.join(jsDir, 'sprite-defs.js'), spriteDefs);
fs.writeFileSync(path.join(jsDir, 'cat.js'), catJs);
fs.writeFileSync(path.join(jsDir, 'runner.js'), runner);

// Extract helper modules as stubs pointing to runner for plan layout
// (Horizon, DistanceMeter, GameOverPanel remain in runner.js for v1)
console.log('Built runner.js, cat.js, sprite-defs.js');
