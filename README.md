# Cat Runner

A Chrome T-Rex offline game clone with a black pixel cat as the player. Same controls and mechanics as the original ù Space/? to jump, ? to duck ù but the cat closes its eyes on crash instead of widening them.

## Play locally

**You must use a local web server** ó opening `index.html` directly in the browser will not work reliably.

```bash
cd ~/Projects/cat-runner
npm start
```

Open **http://localhost:3456** for the standalone page, or **http://localhost:3456/404.html** for the minimal embed.

Press **Space** or **Up** to start. The cat, ground, cacti, and score should all be visible once the game is running.

## Project structure

- `index.html` ù standalone playable page
- `404.html` ù minimal embed for custom error/offline pages
- `public/js/runner.js` ù game engine (adapted from Chromium offline runner)
- `public/js/cat.js` ù cat player sprite animation
- `public/js/sprite-defs.js` ù sprite sheet coordinates
- `public/sprites/` ù Chrome obstacle sheet + cat sprite strip
- `tools/compose-sprite-sheet.js` ù regenerate cat PNGs from pixel logic
- `tools/cat-sprite-editor.html` ù live pixel grid preview for sprite tweaks

## Embed in a 404 page

Copy the `public/` folder to your site and include:

```html
<link rel="stylesheet" href="/cat-runner/public/css/runner.css">
<div id="main-frame-error" class="interstitial-wrapper">
  <div id="main-content"><div class="icon icon-offline"></div></div>
  <div id="offline-resources" style="display:none">
    <img id="offline-resources-1x" src="/cat-runner/public/sprites/100-offline-sprite.png">
    <img id="offline-resources-2x" src="/cat-runner/public/sprites/200-offline-sprite-2x.png">
    <img id="cat-sprite-1x" src="/cat-runner/public/sprites/cat-sprite.png">
    <img id="cat-sprite-2x" src="/cat-runner/public/sprites/cat-sprite-2x.png">
  </div>
  <template id="audio-resources"></template>
</div>
<script src="/cat-runner/public/js/sprite-defs.js"></script>
<script src="/cat-runner/public/js/cat.js"></script>
<script src="/cat-runner/public/js/runner.js"></script>
```

### Vercel

Add `404.html` at the project root or configure `vercel.json`:

```json
{ "routes": [{ "handle": "filesystem" }, { "src": "/(.*)", "dest": "/404.html" }] }
```

### Netlify

Add to `_redirects`:

```
/* /404.html 404
```

## Regenerate cat sprites

```bash
node tools/compose-sprite-sheet.js
node tools/build-runner.js
```

## License

Game engine adapted from Chromium's offline runner (BSD). Cat sprites and project layout are MIT.
