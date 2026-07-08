# Ziko's Crystal Quest

Welcome to **Ziko's Crystal Quest**, a bright, colorful, and action-packed 2D side-scrolling platformer game built from scratch using HTML5 Canvas, Vanilla CSS3, and Vanilla JavaScript (ES6+). 

The game features completely original visual themes, procedural audio synthesis, physics-driven platforming controls, and an exciting storyline.

---

## 📖 Story

The peaceful Adventure Kingdom has been plunged into darkness by the mysterious **Shadow King**, who has stolen the magical crystals of power from every region. 

Our hero, **Ziko** — a curious, brave, and energetic 5-year-old boy in a red T-shirt, yellow shorts, and blue shoes — begins an epic journey across 13 distinct worlds to reclaim the crystals. 

In the final battle inside the Shadow King's Throne Room, Ziko is joined by **Bolt**, a loyal blue robotic companion equipped with shields, lasers, and healing rays, to defeat the Shadow King and restore light to the kingdom!

---

## 🎮 Game Controls

### 💻 Desktop Keyboard
* **A / D** or **Left / Right Arrows**: Move Left / Right
* **W / S** or **Up / Down Arrows**: Climb Up / Down (on Ladders and Vines)
* **Space**: Jump / Double Jump / Wall Jump (when sliding on a wall)
* **Shift**: Hold to Sprint
* **X** or **J**: Attack / Swipe Slash
* **C** or **L**: Trigger Companion's Special Shield (Level 15 only)
* **Esc** or **P**: Pause / Unpause Game

### 📱 Mobile / Tablet Touch Controls
* **On-screen D-Pad** (Bottom-Left): Move Left, Right, or slide down.
* **Button B** (Bottom-Right): Jump
* **Button X** (Bottom-Right): Attack
* **Button Y** (Bottom-Right): Sprint
* **Button A** (Bottom-Right): Companion Ability
* **Pause (⏸)** and **Fullscreen (⛶)** buttons are located at the top-right corner.
* **Touch Swipe**: Swipe Up anywhere on the screen to jump.

---

## 🌟 Game Features

* **13 Worlds / 15 Levels**: Travel through Green Hills, Mystic Forest, River Valley, Mountain Peaks, Underground Caves, Scorched Deserts, Frozen Tundras, Wild Jungles, Volcano Peaks, Haunted Forests, Sky Kingdoms, Castle dungeons, and the Final Fortress.
* **Dynamic Physics Engine**: Features accurate gravity, momentum, sliding friction, wall jumps, jump buffering (100ms), coyote time (120ms), and slope walking.
* **Procedural Sound Engine**: Powered by the **Web Audio API** — generates all sound effects and looping background music tracks procedurally on-the-fly. No external audio files or loading buffers are required!
* **8 Enemy Types**: Defeat bouncy Slimes, swooping Bats, fireball-shooting Fire Sprites, freezing Ice Golems, Shield Knights (block front attacks), Giant Brutes (ground slam shockwaves), Jumping Frogs (extendable tongue hitboxes), and Flying Dragons.
* **Ally System**: Partner with Bolt the hovering robot companion who automatically heals Ziko, triggers energy shields to block boss ultimate attacks, and shoots crystal weak points.
* **Save/Load System**: Autosaves progress automatically at checkpoints via browser `LocalStorage`. Supports multiple difficulty presets (Easy, Medium, Hard).
* **8 Achievements**: Unlock rewards like *First Victory*, *Coin Collector*, *Treasure Hunter*, *Boss Slayer*, *Explorer*, and *Master Adventurer*.

---

## ⚡ Power-Ups Guide

Collect floating containers to activate temporary boosts:
* ⚡ **Speed Boost (Yellow)**: Significantly increases running speed.
* 🛡 **Shield (Blue)**: Blocks one incoming attack completely.
* 🧲 **Magnet (Pink)**: Pulls nearby coins toward you automatically.
* 🪙 **Double Coin (Orange)**: Doubles the score and coin values collected.
* 💜 **Invincibility (Purple)**: Immune to all damage, flashing rainbow aura.
* 💚 **Heal (Green)**: Restores 1 full heart (2 HP) instantly.

---

## 🛠 Technical Details

* **Canvas Render Pipeline**: High-performance requestAnimationFrame game loop with fixed delta-time physics accumulator step.
* **Procedural Graphics**: All character sprites, tiles, backdrops, and particle bursts are drawn procedurally using 2D canvas context primitives (arcs, Bezier curves, and radial gradients).
* **Retina / High-DPI support**: Automatically detects device pixel ratios and scales coordinates to prevent blurriness.
* **Frustum Culling**: Culled draw routines only render active viewport segments to maintain a solid **60 FPS** target.

---

## 🚀 How to Run the Game

To play the game instantly, simply open the `index.html` file in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).

No installation, compilation, server setup, or npm installations are necessary!

```bash
# Simply double click index.html or open via command line:
start index.html
```

---

*Original Game Concept and Implementation by Antigravity.*
