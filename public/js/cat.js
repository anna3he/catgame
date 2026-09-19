// Cat player for Cat Runner (adapted from Chromium Trex)
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
