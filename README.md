# Wish & Grateful — StreamElements Overlay Widget

A two-in-one stream overlay that turns viewer messages into a living star chart and an ink-painted garden scroll. Designed to encourage positive mental well-being by giving viewers a beautiful visual space to share their goals and gratitude with the community.

---

## What it does

### `!wish`
1. A midnight-blue parchment unfurls at the centre of screen showing the viewer's username and wish text.
2. The parchment closes and the wish becomes a glowing star on the chart.
3. Stars are automatically grouped into named constellations that grow as more wishes accumulate.
4. Oldest stars fade out when the configurable cap is reached.

### `!grateful`
1. A Japanese-art painted scroll rolls down from the top of the screen.
2. The viewer's gratitude message is shown in the entry card at the bottom of the scroll.
3. A new ink-style garden element is added to the scene (plum blossom, koi fish, stepping stone, bridge, bamboo, water ripple — cycling in order).
4. The scroll rolls back up, leaving the garden permanently painted in the background.

---

## Setup in StreamElements

1. Go to **StreamElements Dashboard → My Overlays → New Overlay** (or open an existing one).
2. Add a **Custom Widget** layer and set it to **1920 × 1080** (or your stream canvas size).
3. Open the widget editor (pencil icon) — you will see four tabs: **HTML / CSS / JS / Fields**.
4. Paste each file into the matching tab:

| File | SE Tab |
|------|--------|
| `widget.html` | HTML |
| `widget.css`  | CSS  |
| `widget.js`   | JS   |
| `widget.json` | Fields (paste the whole JSON array) |

5. Click **Save** and then **Done**.
6. Configure the widget via the **Fields** panel on the right.

---

## Configuration Reference

All options are exposed as SE Fields so you can change them without touching code.

| Field | Default | Notes |
|-------|---------|-------|
| Persistence Mode | Session | `Persistent` uses SE KV Store to save stars/gratitude across streams |
| Trigger Type | Both | Controls whether chat commands, channel points, or both fire the widget |
| Wish Command | `!wish` | Must include the `!` prefix |
| Grateful Command | `!grateful` | Must include the `!` prefix |
| Wish Redemption Name | `wish` | Partial case-insensitive match against your reward title |
| Grateful Redemption Name | `grateful` | Partial case-insensitive match against your reward title |
| Max Stars | 50 | When reached, the oldest star fades as new ones appear |
| Wish Display Duration | 6 s | How long the parchment stays open |
| Grateful Display Duration | 8 s | How long the scroll stays open |
| Animation Speed Multiplier | 1× | 0.5 = slow & dramatic, 2 = snappy |
| Star Chart Background | `#0a0a2e` | Deep midnight blue |
| Star Colour | `#ffffff` | |
| Star Glow Colour | `#88aaff` | Halo bloom around each star |
| Constellation Line Colour | `#4466aa` | Dashed lines connecting stars |
| Parchment Background | `#0d0d2b` | |
| Parchment Text | `#d4af37` | Gold |
| Scroll Paper | `#f4e8c1` | Aged cream |
| Scroll Ink | `#1a0a00` | Near-black ink |
| Blossom Colour | `#ffb7c5` | Plum/cherry blossom petals |
| Star Shape | `star` | `star` / `circle` / `sparkle` |
| Nebula Effect | `subtle` | `none` / `subtle` / `vibrant` |
| Background Star Count | 200 | Twinkling micro-stars filling the sky |
| Font Name | `Cinzel` | Any Google Fonts name, or `default` |
| Scroll Position | Top Centre | `top-center` / `top-left` / `top-right` |
| Scroll Width | 600 px | |
| Show Username Labels | on | Brief flash above star after appearing |
| Show Constellation Names | on | Appears once group has 3+ stars |
| Show Hover Tooltip | on | Username + wish text on mouse-over |
| Enable Sound | off | Toggle on and supply URLs below |
| Wish Sound URL | — | `.mp3` or `.ogg` hosted on a CDN |
| Grateful Sound URL | — | `.mp3` or `.ogg` hosted on a CDN |

---

## Channel Points Setup

1. Create two Channel Point rewards in your Twitch dashboard:
   - e.g. **"Cast a Wish"** — require viewer input
   - e.g. **"Share Gratitude"** — require viewer input
2. In the widget Fields, set **Trigger Type** to `Channel Points only` (or `Both`).
3. Set **Wish Redemption Name** to a unique word in your reward title (e.g. `wish`).
4. Set **Grateful Redemption Name** similarly (e.g. `grateful`).
5. Ensure your SE overlay has the **Channel Points** event source enabled.

---

## Persistence Notes

- **Session only** (default): Stars and gratitude elements reset when the overlay reloads or stream ends. No storage required.
- **Persistent**: Uses the StreamElements Key-Value Store (`SE_API.store`). Stars and garden elements accumulate across streams. The store is per-overlay so it will not collide with other widgets.

> **Tip**: To manually clear the store, temporarily switch to Session mode and reload the overlay, then switch back to Persistent.

---

## Constellations

Eight named groups are built in — stars are assigned round-robin as they are added:

| Constellation | Screen Zone |
|---------------|-------------|
| The Dreamers  | Top-left |
| The Seekers   | Top-right |
| The Hopeful   | Top-centre |
| The Brave     | Bottom-left |
| The Creators  | Bottom-right |
| The Wanderers | Bottom-centre |
| The Guardians | Mid-left |
| The Luminous  | Mid-right |

Connecting lines appear once a group has 2+ stars. The name plate appears at 3+ stars.

---

## Garden Elements

Each `!grateful` entry adds the next element in this cycle:

1. Plum blossom branch with 5-petal flowers
2. Koi fish with water ripple
3. Stepping stone (engraved with username)
4. Arched bridge with balusters
5. Bamboo stalk with leaves
6. Lotus / water ripple

The cycle repeats, so an active stream builds a richly layered scene.
