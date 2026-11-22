# Thunk! Pin It to the Wall

An HTML5 dart game. Objects fall in front of a wooden wall, and you throw darts to pin them to it. Darts take time to fly, so you have to aim where things are going to be. It's an installable PWA that also works offline on phones, tablets and computers.

## Play locally

There's no build step and nothing to install. It only needs a static web server (service workers don't run from `file://`):

```bash
cd Darts
python3 -m http.server 8000
# or: npx serve .
```

Then open http://localhost:8000.

To try it on a phone on the same Wi-Fi, open `http://<your-computer-ip>:8000`. Note that offline/install mode needs HTTPS or `localhost`, so for a real install on a phone, host it somewhere with HTTPS (GitHub Pages works: Settings → Pages → deploy from branch).

## How to play

- **Mouse:** move to aim, then click to throw.
- **Touch:** tap to throw at that spot. To aim precisely, hold and drag: the reticle floats above your finger, and the dart goes when you let go.
- **Keys:** `Esc`/`P` pauses, `M` mutes.

Pin objects to complete each level's objectives before time (and sometimes darts) runs out.

| | |
|---|---|
| **Multiplier targets** (x2 / x3 / x5) | Pin a falling object while it passes over one to multiply its points |
| **Firecrackers** | Don't hit them. KABOOM blows everything you've pinned off the wall and takes away those points |
| **Animals** (raccoons, squirrels, cats, gulls, bats, owls, penguins) | Hitting one costs points. In Beach Shack, hitting one ends the level |
| **Shooting gallery** | Targets slide along brass rails. Knock them down |
| **Streaks & bullseyes** | Pins in a row build a streak multiplier. Hitting an object dead-centre gives a bonus |
| **Picket fences** | Darts fly straight through the gaps |

You earn 1 to 3 stars per level, and the time left and darts left count as bonus points. Progress is saved in the browser.

## Levels

1. Sweet Start: candy, picket fence
2. Trash Day: garbage, weathered barn boards, raccoons
3. Party Time: balloons and streamers, painted shiplap, first multipliers
4. Fruit Stand: tossed fruit, log cabin, first firecrackers
5. Autumn Breeze: fluttering leaves, autumn fence, squirrels
6. Toy Box: toys, nursery wall, first shooting gallery
7. Mahogany Manor: jewels, carved mahogany panelling, cats
8. Kitchen Chaos: food, herringbone butcher block
9. Spooky Night: Halloween, barn at night, bats and owls
10. Beach Shack: driftwood, seagulls, two gallery rails, no animal hits allowed
11. Winter Lodge: ornaments, knotty pine with garland, penguins
12. Grand Finale: everything at once, gilded ballroom, x5 target

## Tech

- Plain ES modules with no dependencies. All art is drawn procedurally on a canvas, and all sound (including the thunk) is synthesized with Web Audio, so there are no asset downloads.
- The game uses a fixed 1280×800 logical playfield that is letterboxed to fit any screen, so every device sees the same field.
- `sw.js` caches the app shell for offline play. Bump `CACHE` in `sw.js` when you ship changes.
- `tools/make-icons.mjs` regenerates the PNG icons from the game art (needs Playwright).

```
index.html, manifest.webmanifest, sw.js, css/style.css
js/main.js       loop, scaling, input, menus
js/game.js       gameplay, physics, scoring, HUD
js/levels.js     level definitions
js/sprites.js    object art
js/creatures.js  animals
js/wood.js       procedural wood backgrounds
js/audio.js      synthesized sound effects
```
