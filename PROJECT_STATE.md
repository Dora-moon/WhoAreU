# PROJECT_STATE.md — WhoAreU (Live Wikipedia Gacha)

Persistent AI handoff file. Update at the end of **every** task: list modified file paths and current status.
Last updated: 2026-11-13 (Persistent Character Pool — `api/character-pool.js` + DB hydration & background harvesting)

---

## Persistent Character Pool — `GET/POST /api/character-pool` (2026-11-13)

**Goal:** Every discovered Wikipedia & Fandom character is upserted into a Neon `discovered_characters` table so the Gacha pool continuously grows across sessions and serves instant, image-verified candidates — no per-spin REST round-trip.

**New files / exports:**

- **`api/character-pool.js`** (NEW) — `GET` & `POST` handler:
  - `GET ?universe=...&country=...&gender=...&limit=120` queries `discovered_characters` matching active filters, prioritizes non-null `img_url`, orders with `RANDOM()`, `LIMIT 120`. Falls back to `fallbackStore` when `DATABASE_URL` is absent.
  - `POST { characters: [...] }` batch-upserts up to 60 items, filters out non-person/category titles (`isPersonTitle` mirrors `WikipediaModel.validateEntity`), and executes `INSERT INTO discovered_characters ... ON CONFLICT (char_key) DO UPDATE SET img_url = COALESCE(EXCLUDED.img_url, discovered_characters.img_url), country = COALESCE(NULLIF(EXCLUDED.country, 'any'), discovered_characters.country), updated_at = CURRENT_TIMESTAMP`.
- **`api/_db.js`** — exported `queryDiscoveredCharacters({ universe, country, gender, limit })` and `upsertDiscoveredCharacters(characters)` helpers; `fallbackStore` is now `export`ed for local testing.

**Wiring (`js/models/WikipediaModel.js`):**

- **`schedulePrefetch()`** now fetches `GET /api/character-pool` FIRST to hydrate `_prefetchPool` immediately, then runs a non-blocking background harvester (`_runBackgroundHarvester`) that fires 3–4 randomized Wikipedia + Fandom requests (`gsroffset` `0–45`) and `POST`s newly discovered characters to `/api/character-pool`.
- **`getInstantSpinCandidates()`** fetches the DB pool first when the filter changed or the pool is empty; excludes `_recentPulledIds` (last 30 pulled keys) when sampling 20 cards; merges DB rows via the new `_dbRowToCard(row, inp)` converter (scores them with the same `score()` engine so weighted sampling stays fair).
- **`_dbRowToCard(row, inp)`** — converts a `discovered_characters` row into the card shape the app expects (`title`/`name`/`img`/`url`/`gender`/`targetRole`/...).
- **`_fetchCharacterPoolFromDB(inputs)`** — `GET /api/character-pool` with filter query params; returns `[]` on any failure.

**Guaranteed portrait rendering (`js/views/RouletteView.js`):**

- **`resolveLivePortrait(imgEl, card, onFallback)`** — whenever `card.img` is null or the `<img>` errors, fetches the Wikipedia REST Summary API in the browser, updates `card.img` in memory, swaps `imgEl.src` in-place (`referrerPolicy="no-referrer"`, **no `crossOrigin`**), and on failure falls back to the monogram.
- **`createCardElement`** now always renders an `<img>` inside `.wc .im`: directly when `card.img` exists; a placeholder `<img>` immediately launching the live REST rescue when it doesn't. The 2-letter monogram is only the last resort.
- **`_persistRescuedImage(card, imageUrl)`** — fire-and-forget `POST /api/character-pool` of the rescued portrait so future spins load it in 0ms.

**Verification:**
- `node --check` on `api/_db.js` ✓, `api/character-pool.js` ✓, `js/models/WikipediaModel.js` ✓, `js/views/RouletteView.js` ✓, `js/controllers/GachaController.js` ✓.
- `node ./test_pool.mjs` → **ALL CHARACTER-POOL TESTS PASSED**:
  - POST upserts 2 person characters (1 non-person title filtered out).
  - GET filtered to Einstein (`historical`/`DE`/`male`); no-filter returns all 2.
  - POST does not downgrade existing `img_url` or `country` when the new value is null.
  - OPTIONS → 200, PUT → 405, batch capped at 60.
- `node ./test_roulette.mjs` → **ALL ROULETTE TESTS PASSED**:
  - Card WITH img renders `<img referrerpolicy="no-referrer">` (no `crossOrigin`) with the real portrait.
  - Card WITHOUT img renders a placeholder `<img referrerpolicy="no-referrer">` (monogram is last resort).
  - `renderTrack()` renders 2 cards; `_persistRescuedImage` does not throw when `fetch` is undefined.
- `getInstantSpinCandidates()` in Node returns 20 cards and records 20 pulled IDs.

**Files modified/created:**
- `api/character-pool.js` (NEW)
- `api/_db.js` (added `queryDiscoveredCharacters`, `upsertDiscoveredCharacters`, exported `fallbackStore`)
- `js/models/WikipediaModel.js` (DB hydration + background harvester + `_dbRowToCard`)
- `js/views/RouletteView.js` (`resolveLivePortrait` POST-back + `_persistRescuedImage`)

---

---

## Bugfix — Missing images on Roulette strip & Dossier card (2026-11-13)

**Symptom:** Cards on the top Roulette reel (`MM`, `MT`, `AH`, `BC`, `CH`) and the bottom Dossier card still showed blank/monogram placeholders instead of character portraits.

**Root causes:**
1. Hardcoded `OFFLINE_FICTIONAL` portrait URLs were 404s (`Son_Goku_Adult.png`, `Naruto_Uzumaki.png`, `Darth_Vader.jpg`, `Geralt_of_Rivia_Witcher_3_render.png`, `MarioNintendo.png`) or Fandom URLs that no longer resolved (`Raiden_Shogun_Card.png`).
2. `getInstantSpinCandidates` resolved images per card but never persisted them, so every spin re-hit the REST API and could 429-flood.
3. Offline cards had no `enTitle`/`wikiTitle` fields, so REST thumbnail lookup could not fall back to a clean article title for names with parenthetical suffixes (e.g. `2B (YoRHa No.2 Type B)`, `Bruce Wayne (Batman)`).
4. `RouletteView.createCardElement` fell straight to the 2-letter monogram when `card.img` was null — there was no in-place `<img>` placeholder for the live REST rescue to swap in.

**Fixes:**

1. **`js/models/WikipediaModel.js`** — Verified every `OFFLINE_FICTIONAL` portrait URL against the official REST Summary API and replaced the broken ones with HTTP-200 Wikimedia URLs:
   - `Son_Goku_Adult.png` → `https://upload.wikimedia.org/wikipedia/vi/a/af/Son_Goku_YoungAdult.PNG`
   - `Naruto_Uzumaki.png` → `https://upload.wikimedia.org/wikipedia/vi/9/9a/NarutoUzumaki.png`
   - `Raiden_Shogun_Card.png` (Fandom 404) → `https://upload.wikimedia.org/wikipedia/en/e/e2/Raiden-shogun-arm.png`
   - `Darth_Vader.jpg` (404) → `https://upload.wikimedia.org/wikipedia/en/0/0b/Darth_Vader_in_The_Empire_Strikes_Back.jpg`
   - `Geralt_of_Rivia_Witcher_3_render.png` (404) → `https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Geralt.jpg/330px-Geralt.jpg`
   - `MarioNintendo.png` (404) → `https://upload.wikimedia.org/wikipedia/en/5/5c/Mario_by_Shigehisa_Nakaue.png`
   - `Sherlock_Holmes_Portrait_Paget.jpg/500px-…` → `…/330px-Sherlock_Holmes_Portrait_Paget.jpg`
   - `Naruto` and `Raiden Shogun` `url` fields now point at their real article pages.
2. **`js/models/WikipediaModel.js`** — Added persistent `_imageCache` (`Map` + `localStorage` key `wg_image_cache`): `resolveCardImage` now checks the cache first (0ms) and writes every newly resolved URL back, so future spins never re-hit the REST API for the same character.
3. **`js/models/WikipediaModel.js`** — `resolveCardImage` now tries multiple title candidates (`card.title`, `card.enTitle`, `card.wikiTitle`, and the title with the parenthetical suffix stripped) so names like `2B (YoRHa No.2 Type B)` resolve instead of 404ing. Both `offlineHistoricalPool` and `offlineFictionalPool` now emit `enTitle`/`wikiTitle` on every card.
4. **`js/models/WikipediaModel.js`** — `getInstantSpinCandidates` image resolution is now hard-capped at `3000ms` per call (`Promise.race` with a `setTimeout`) so a slow Wikipedia can never stall the spin animation.
5. **`js/views/RouletteView.js`** — Extracted a shared `resolveLivePortrait(imgEl, card, onFallback)` helper. `createCardElement` now always renders an `<img>` inside `.wc .im`: when `card.img` exists it renders it directly; when `card.img` is null it renders a placeholder `<img>` and immediately launches the live REST rescue, swapping `imgEl.src` in-place and updating `card.img` in memory. The 2-letter monogram is now only the last resort after the REST rescue fails. `crossOrigin` is never added; `referrerPolicy="no-referrer"` is forced.
6. **`js/views/CardView.js`** — `rescueImage` hardened identically: multi-candidate title lookup, in-place `imgElement.src` swap, `card.img` mutation, `referrerPolicy="no-referrer"`, no `crossOrigin`. Used by `renderCardImage`, inventory grid, inventory detail, and the multi-pull modal.

**Verification:**
- `node --check js/models/WikipediaModel.js` ✓
- `node --check js/views/RouletteView.js` ✓
- `node --check js/views/CardView.js` ✓
- `node ./verify_images.mjs` → **ALL CHECKS PASSED**:
  - All 9 hardcoded `OFFLINE_FICTIONAL` portrait URLs return HTTP 200 (with GET fallback + retry for transient 429s).
  - `getInstantSpinCandidates()` returns 20 cards, every one with a valid `https://` `img` URL.
  - `RouletteView` renders `<img referrerpolicy="no-referrer">` inside `.wc .im` (no monogram) when `card.img` is populated, and renders a placeholder `<img>` for cards with no `img`.

---

## Bugfix — `⚠️ Error` in all Target Filter dropdowns (2026-11-13)

**Symptom:** All `<select>` dropdowns in the right-hand Target Filter Console (`Phạm vi Vũ trụ`, `Bản dạng giới`, `Gốc sắc tộc`, `Tôn giáo`, `Quốc gia`) rendered `<option>⚠️ Error</option>` inside `ProfileView.js`'s `renderSelects()` `try/catch` blocks.

**Root cause:** The original `fillSelect()` method was deleted during the country-search refactor, but `safeFill()` still called `this.fillSelect(...)`. Every dropdown therefore threw `TypeError: this.fillSelect is not a function`, which `safeFill` caught and replaced with the `⚠️ Error` placeholder.

**Fix:**
- **`js/views/ProfileView.js`**:
  - Restored a resilient `fillSelect(selectEl, options, currentValue, lang = 'en')` that builds options via `resolveOptionLabel` / `resolveOptionValue` so malformed entries can never throw.
  - Added `resolveOptionLabel(item, lang)` helper:
    `lang === 'en' ? (item.labelEn || item.en || item.label || item.name || item.value) : (item.labelVi || item.vi || item.label || item.name || item.value)`
    with `const val = item.value ?? item.id ?? item.key ?? '';` for objects, and array fallback `[value, labelEn, labelVi]`.
  - Added `resolveOptionValue(item)` helper returning `item.value ?? item.id ?? item.key ?? ''` (arrays → `item[0]`).
  - `safeFill` now passes `L` (the current language) into `fillSelect` and logs `console.error('[ProfileView] Dropdown error:', dropdownId, err)` inside the catch block so errors are never swallowed silently.
  - `fillSelect` only sets `selectEl.value` when the current value actually exists among the options — avoids throwing on numeric era values (e.g. `1900`).
- **`js/models/UserProfileModel.js`**: No code change needed — `UNIVERSES`, `TG`, `ERAS`, `ETHNICITIES`, `RELIGIONS`, `WORLD_COUNTRIES` all use the `[value, labelEn, labelVi]` array shape the helper expects.

**Verification:**
- `node --check js/models/UserProfileModel.js` ✓
- `node --check js/views/ProfileView.js` ✓
- Dropdown population test (VI + EN): all 8 dropdowns (`storyTone`, `universe`, `uRole`, `tGender`, `era`, `ethnicity`, `religion`, `country`) populate cleanly — 4/3/8/8/7/9/7/198 options respectively, no `⚠️ Error` placeholder, correct current-value selection.

---

## Bugfix — Invalid CSS Selector `#chap1.5` (2026-11-12)

**Symptom:** Fractional chapter numbers like `1.5` (used for interlude/mini-game bridges in `StoryController._playNextChapter`) produced invalid CSS selectors (`#chap1.5`), throwing:
`SyntaxError: Failed to execute 'querySelector' on 'Document': '#chap1.5' is not a valid selector.`

**Fix:**
- **`js/views/StoryView.js`** — Added `_chapId(n)` helper that sanitizes fractional chapter numbers by replacing `.` with `_` (`'chap' + String(n).replace(/\./g, '_')`). `getChapterParagraph(n, chapterTitle)` now uses `document.getElementById(id)` instead of `this.$('#chap' + n)` and sets `art.id = id`. `typeChapter` calls `getChapterParagraph` unchanged — the sanitization is centralized in one place.
- **`js/controllers/StoryController.js`** — No code change needed: it passes `this.currentStage + 0.5` to `storyView.typeChapter`, which now safely resolves to `#chap1_5`.
- Verified: `node --check js/views/StoryView.js` ✓, `node --check js/controllers/StoryController.js` ✓.

---

## Completed

### Database / Persistence (Vercel Postgres via Neon)
- `api/_db.js` — Neon `@neondatabase/serverless` driver wiring.
- `api/save-card.js` — persist `user_resources` (gems) and `user_cards` (inventory).
- `api/sync-state.js` — sync full state (gems, cards, exports).
- `api/track-export.js` — track canvas export events.
- Commit `5f872b1` — "Feat: Persist Gems, Card Inventory, and Export status to Vercel Postgres".
- Commit `f03ad13` — "Fix: Switch DB driver to @neondatabase/serverless for Neon DATABASE_URL".

### Phase 1 (DONE)
- Modal `X` close buttons wired to Escape + backdrop click (`js/controllers/AppController.js`).
- Vietnamese fonts locked in (`css/themes.css`, Google Fonts `Be Vietnam Pro`/`Quicksand`).
- Universe selector (`historical` / `fictional` / `multiverse`) — `js/models/UserProfileModel.js` `UNIVERSES`.
- Fandom Wiki integration — `WikipediaModel.fetchFandomCategory`, `fetchFandomSearch`, `parseFandomPages`, `resolveFandomMissingImages`.
- Entity non-person filter — `WikipediaModel.validateEntity` (strict NON_PERSON_PATTERNS + lead checks).
- Wiki image cross-language fix — `WikipediaModel.resolveViMissingThumbnail`, `fetchEnThumbnail`, `fetchWikidataImage`, `normalizeWikiImg`.

### Phase 1.5 — Image CORS / Dossier cleanup (JUST DONE, 2026-11-12)
- **Removed `crossOrigin="anonymous"` from all DOM `<img>` tags** — it blocks Wikimedia/Fandom images when CORS headers are absent.
  - `js/views/CardView.js` — result card, inventory grid, inventory detail, multi-pull grid (4 sites).
  - `js/views/RouletteView.js` — roulette card strip.
  - `js/views/StoryView.js` — dialogue-header target avatar.
  - Kept `referrerPolicy="no-referrer"` everywhere.
  - Canvas export `loadImage()` (`CardView.js:418`) **keeps** `crossOrigin` — that is the only place CORS is needed (drawing onto `<canvas>`).
- **Removed redundant 72×72 `.dossier-portrait-frame` mini-portrait** from the Dossier Card text section (`CardView.js:renderDossierBadge`).
  - `.dossier-bio-header` is now a full-width 1-paragraph bio box.
  - Deleted CSS: `.dossier-portrait-frame`, `.dossier-portrait-img`, `.dossier-portrait-fallback`.
- **Cross-language Wiki & Wikidata image fallback** (`WikipediaModel.js`):
  - `resolveMissingImages` now calls `resolveViMissingThumbnail` for every `vi.wikipedia.org` page missing a thumbnail.
  - Step 1: English equivalent via `langlinks` (`getEnTitle` → `fetchEnThumbnail`, `prop=pageimages|pageprops`, `pithumbsize=500`).
  - Step 2: Wikidata `P18` image property via `wikibase_item` pageprop (`fetchWikidataImage`).
  - All resolved URLs normalized to `https://upload.wikimedia.org/...` (`normalizeWikiImg`).
  - Fallback runs in parallel (`Promise.all`) across the whole page batch.

### Phase 1.6 — normalizeWikiImg host whitelist (2026-11-12)
- **`normalizeWikiImg(url)`** in `js/models/WikipediaModel.js` was rejecting valid thumbnail URLs from `thumb.wikimedia.org` and `static.wikia.nocookie.net` (returning `null` for anything not matching `upload.wikimedia.org`).
- Replaced the restrictive regex with an anchored, prefix-based whitelist:
  - `https://upload.wikimedia.org/...`
  - `https://thumb.wikimedia.org/...`
  - `https://static.wikia.nocookie.net/...`
  - Local/custom `https://` image paths from `SecretRecipes.js` (`./...` and `/assets/...`)
- Stripped the `utm_*` query-param cleaning step (it silently dropped valid Fandom URLs containing `?cb=` cache-busting).
- `parsePage` (line 1366) and `parseFandomPages` (line 1292) both call `normalizeWikiImg` on `p.thumbnail.source`, so they now accept all three hosts.
- Verified: `node --check js/models/WikipediaModel.js` → SYNTAX OK.

### Phase 1.7 — GUARANTEED IMAGE LOADING (REST Summary API + Client Rescue) (2026-11-12)
**Goal:** Every character card renders a verified, HTTP-200 image — no guesswork, no blank portraits.

#### `js/models/WikipediaModel.js` changes:
- **`normalizeWikiImg(url)`** expanded and hardened:
  - Accepts `wikimedia.org`, `wikipedia.org`, `wikia.nocookie.net`, `fandom.com` image URLs.
  - Rejects API endpoints (`/api`, `/rest_v1`, `/w/`) and article pages (`/wiki/`).
  - Strips `/revision/latest/...` from Fandom URLs so the direct `.png`/`.jpg` loads.
  - Supports local custom paths (`./...`, `/assets/...`) for `SecretRecipes.js`.
- **`fetchRestThumbnail(title, domain)`** — new official REST Summary API caller:
  - Calls `https://{domain}/api/rest_v1/page/summary/{encodeURIComponent(title)}`
  - Returns `data.thumbnail?.source || data.originalimage?.source` normalized via `normalizeWikiImg`.
  - Skips disambiguation/redirect pages (`type === 'disambiguation'`).
- **`resolvePageImage(p, domain)`** — unified priority resolver (mutates `p.thumbnail`):
  1. REST summary on page's own domain.
  2. English REST summary via `langlinks`.
  3. Legacy EN `pageimages` API (`fetchEnThumbnail`).
  4. Legacy Wikidata P18 (`fetchWikidataImage`).
- **`resolveMissingImages(pages, domain)`** rewritten:
  - Stage 1: Batch `imageinfo` for local page images (unchanged).
  - Stage 2: **Any page still missing a thumbnail** gets `resolvePageImage` in parallel via `Promise.all`.
- **`resolveCardImage(card)`** — new per-card resolver for `fetchPool`:
  - Tries `card.url` host → `card.urlVi` host → `en.wikipedia.org` via REST summary.
  - Mutates `card.img` so the Gacha roller never receives a blank card.
- **`fetchPool(inp)`** now `await Promise.all(cards.map(c => this.resolveCardImage(c)))` before returning.

#### `js/views/CardView.js` changes:
- **`rescueImage(imgElement, card)`** — client-side browser rescue:
  - On `img.onerror` or missing `card.img`, fetches `https://{domain}/api/rest_v1/page/summary/{card.name}` directly in the browser.
  - Sets `imgElement.src` dynamically in-place — no full re-render.
  - Forces `referrerPolicy="no-referrer"` and **removes `crossOrigin`** (Wikimedia/Fandom images lack CORS headers).
- **`renderCardImage(container, card)`** — unified portrait renderer used by:
  - Result card (`showResultCard`).
  - Inventory grid (`renderInventoryGrid`).
  - Multi-pull modal (`showMultiPullModal`).
  - If `card.img` exists → renders it with `onerror → rescueImage`.
  - If no `card.img` → immediately launches async `rescueImage` before falling back to initials.

#### **Mandatory Live Verification Test — PASSED**
Ran `node ./verify_images.mjs` against 5 characters across both universes:
```
[OK]   Sigmund Freud (historical)   via vi.wikipedia.org → HTTP 200 image/jpeg
[OK]   Trần Hưng Đạo (historical)   via vi.wikipedia.org → HTTP 200 image/jpeg
[OK]   Albert Einstein (historical) via en.wikipedia.org → HTTP 200 image/jpeg
[OK]   Son Goku (fictional)         via vi.wikipedia.org → HTTP 200 image/png
[OK]   Raiden Shogun (fictional)    via en.wikipedia.org → HTTP 200 image/png

ALL 5 PASSED — every card loads a verified HTTP-200 image.
```
- Syntax checks: `node --check js/models/WikipediaModel.js` ✓, `node --check js/views/CardView.js` ✓.

---

### Phase 2 — Mythic Recipes, Profile Sync, Admin Mode & 6 Bugfixes (100% COMPLETE, 2026-11-12)

#### 1. Standalone Custom Mythic Recipe Template — `js/data/SecretRecipes.js`
- Exports `SECRET_RECIPES` array with 2 sample MYTHIC recipes:
  - **Chronomancer** (multiverse, any gender/ethnicity/era, 5% drop chance)
  - **Lưu Vương** (historical, female, vietnamese, any skin/era, 8% drop chance)
- Full `RECIPE_TEMPLATE_GUIDE` comment header documenting all fields:
  - `id`, `name`, `title`, `rarity`, `conditions` (universe, gender, ethnicity, skinTone, era), `dropChance`, `customImage`, `customAudio`, `customIntro`, `goalObjective`, `miniGames`
- `customImage`/`customAudio` support absolute URLs or local paths (`./...`, `/assets/...`) handled by `normalizeWikiImg`
- Recipes evaluated in `GachaModel.onSpin()` AFTER normal rarity roll

#### 2. GachaModel.js — Mythic Hook, Pity Reset, 10x No-Dupes, Secret Recipe Evaluation
- Added `'myth'` tier to `RARITY_WEIGHTS` (weight: 1) and `TIERS` array
- **Fixed `recordWinnerTier`**: Rare+ pulls (rare/myth) now **reset** pity counter; common/mid increment it
- **`forceTierIfNeeded`**: When pity hits PITY_MAX (10), next pull guarantees Rare+ (prefers myth if available, else rare)
- **`buildMultiPulls` rewritten**: Uses `Set` to track used `pageid`/`name` — samples **without replacement** so same character never appears twice in a 10-pull
- **`evaluateSecretRecipes(inputs)`**: Checks profile against all recipe conditions + hardcoded Admin trigger (name=datmtp12345, age=20, role=dev, hobby=code game) → sets `window.__WHOAREU_ADMIN_MODE__=true` and dispatches `whoareu:admin-unlocked` event
- **`buildSecretCard(recipe, inputs)`**: Builds fully-formed Mythic card object with all custom fields (`customImage`, `customAudio`, `customIntro`, `goalObjective`, `miniGames`, `isSecretRecipe: true`, `rarity: 'MYTHIC'`)
- **`buildWheel` updated** to include `myth` tier in sorting/fallback logic
- All modified `.js` files pass `node --check` syntax validation

#### 3. Database Profile Name Sync — `user_name` column
- **`api/_db.js`**: Added `user_name VARCHAR(200) DEFAULT ''` to `user_resources` table via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `ensureTables`; fixed nested try-catch syntax error; updated `getUserResources` and `updateUserResources` to handle `user_name`
- **`api/sync-state.js`**: Added `user_name` to GET response and POST body handling
- **`js/models/UserProfileModel.js`**: Added `user_name: this.fields.uName || ''` to `syncStateToRemote` POST body
- Migration safe: `ADD COLUMN IF NOT EXISTS` no-ops on subsequent deployments

#### 4. Secret Admin Dev Mode
- **Trigger**: Exact profile match (case-insensitive, trimmed):
  - Name: `datmtp12345`
  - Age: `20`
  - Role: `dev` — **select value** OR **custom input** ("✍️ Tự nhập…" → `uRoleCustom` = "dev")
  - Hobby: `code game`
- **Effects when unlocked**:
  - `UserProfileModel.isAdmin = true` + `window.__WHOAREU_ADMIN_MODE__ = true`
  - Dispatches `CustomEvent('whoareu:admin-unlocked')`
  - **Header badge**: "🛠️ DEV ADMIN MODE UNLOCKED" shown in topbar via `AppController.updateAdminBadge()`
  - **Infinite Gems**: Clicking 💎 gem button sets `999,999,999` gems + syncs to Neon via existing `syncStateToRemote` pipeline
  - **Admin Pool Inspector button**: "👁️ Soi Pool Gacha" revealed in spin-actions (`#btnAdminPool`, hidden by default)
- **Files**:
  - `js/models/UserProfileModel.js`: `isAdmin` field, static `ADMIN_TRIGGER`, `checkAdminTrigger()` evaluates effective role from `uRoleCustom` when `uRole === 'custom'`; called from `setField` on uName/uAge/uRole/uHobby/uRoleCustom
  - `js/controllers/AppController.js`: initial load calls `checkAdminTrigger()` + `updateAdminBadge()`; `window.addEventListener('whoareu:admin-unlocked')`; `btnGems` onclick for admin mode; `btnAdminPool` onclick → `openAdminPool()`
  - `js/views/ProfileView.js`: `btnSaveProfile` onclick calls `checkAdminTrigger()` before closing dialog
  - `index.html`: `<button class="pull admin-pool-btn" id="btnAdminPool" hidden>👁️ Soi Pool Gacha</button>`
  - `css/components.css`: `.admin-pool-drawer` styles for the dialog

#### 5. Bugfix #1 — Block Category:/List: Pages
- **`js/models/WikipediaModel.js`**: Added `NON_PERSON_PREFIXES` array with strict prefixes:
  - `Category:`, `List of`, `Template:`, `Portal:`, `Disambiguation`, `Draft:`, `Wikipedia:`, `File:`, `Help:`, `Module:`
  - Vietnamese: `Thể loại:`, `Danh sách`, `Bản mẫu:`, `Cổng thông tin:`, `Trang hướng dẫn:`, `Thảo luận:`, `Wikipedia:`, `Tập tin:`, `Trợ giúp:`, `Mô-đun:`
- **`validateEntity`** now rejects any page whose title (or `viTitle`) starts with any of these prefixes → prevents category/list/template pages from entering the gacha pool

#### 6. Bugfix #2 — Reset Pity Bar on Rare+ / 10-Pull Guarantee
- **`GachaModel.recordWinnerTier(tier)`**: Explicitly calls `this.resetPity()` when `tier === 'rare' || tier === 'myth'`; increments only on `mid`/`common`
- **`forceTierIfNeeded`**: Returns `'rare'` or `'myth'` when `pity >= PITY_MAX` (10) and pool has those tiers — guarantees Rare+ on 10th pull

#### 7. Bugfix #3 — No Duplicates in 10x Pull via Set Sampling
- **`GachaModel.buildMultiPulls`**: Creates `const used = new Set()` tracking `pageid` (or `name` fallback); `pickUnique` only returns cards whose key not in `used`; falls back gracefully if tier exhausted

#### 8. Bugfix #4 — Clean Vietnamese Translation via Google Translate GTX
- **`js/models/WikipediaModel.js`**: Replaced massive `phraseMap`/`natMap`/`profMap` word-by-word dictionaries with minimal fallback `phraseMap` + new **`async translateTextToVietnamese()`** using Google Translate GTX free endpoint:
  - `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q={encodeURIComponent(text)}`
  - Returns clean sentence-level translation (no mangled word-swaps)
- Kept synchronous `translateLeadToVietnamese` for SSR/offline fallback using minimal `phraseMap`

#### 9. Bugfix #5 — Uniform 3/4 Aspect-Ratio Card Frames with Face-Centered Crop
- **`css/themes.css`**: Added CSS variables `--cw-h: 220px`, `--cw-img-h: 145px` for roulette card dimensions
- **`css/components.css`**:
  - `.rimg` aspect-ratio changed from `4/5` → `3/4`
  - `.wc .im` → `aspect-ratio: 3/4` with `flex-shrink: 0`
  - `.tile .im` → `aspect-ratio: 3/4`
  - **All card images**: `.rimg img, .tile .im img, .wc .im img { object-fit: cover; object-position: center 20%; }` (roulette uses `center 15%` in JS)
  - **Winner highlight fixed**: `.wc.win` now uses `border`/`box-shadow`/`filter` instead of `transform: scale(1.08)` — no layout jump
- **`js/views/RouletteView.js`**: Added `objectPosition = 'center 15%'` for reel images; `getMetrics` parses `--cw` CSS variable for consistent layout math

#### 10. Bugfix #6 — "Xem thêm/Thu gọn" Toggle for Bios/Notable Events >140 chars
- **`js/views/CardView.js`**:
  - **Bio header** (`renderDossierBadge`): Collapsible toggle button ("Xem thêm ▾" / "Thu gọn ▴") when bio text exceeds 140 chars
  - **Claim-to-fame row** (dossier grid): Same toggle for notable event text >140 chars
- **`css/components.css`**:
  - `.dossier-bio-toggle` button styles (blue pill, hover fill)
  - `.dossier-bio-text.expanded p` disables `-webkit-line-clamp` to show full text
- Works for both EN/VI languages (labels localized via `profileModel.lang`)

---

### Phase 3 — Story Tones, Dialogue Avatar, Goal Quest & 6 Mini-Games (100% COMPLETE, 2026-11-12)

#### 1. Story Tone Selector (4 tones) — `UserProfileModel` + `ProfileView` + `index.html`
- **`js/models/UserProfileModel.js`**:
  - Added `storyTone` field persisted via `localStorage` key `wg_tone` (default: `comedy`)
  - Added `setStoryTone(tone)`, `getStoryTone()`, `getToneLabel(tone, lang)` methods
  - Added static `STORY_TONE_TRIGGER` mirroring admin trigger
  - Added I18N strings (EN/VI) for tone labels: `comedy: 😂 Comedy & Absurd / Hài hước / Bựa`, `epic: ⚔️ Epic & Heroic / Hào hùng / Sử thi`, `tragic: 😢 Tragic & Melancholic / Bi tráng / Cảm động`, `mystery: 🔍 Mystery & Thriller / Bí ẩn / Kinh dị`
- **`js/views/ProfileView.js`**:
  - Added `this.toneSelect = this.$('#storyTone')` in constructor
  - `renderSelects()` populates tone dropdown with 4 options
  - `bindInputEvents()` binds `change` event → calls `profileModel.setStoryTone(value)`
- **`index.html`**: Added `<label for="storyTone">` + `<select id="storyTone">` inside Profile Dialog

#### 2. 1-Paragraph Concise Intro + Corner Avatar — `StoryModel` + `StoryView`
- **`js/models/StoryModel.js`** (`offlineStory`):
  - Returns `intro` field (3–4 sentences, single paragraph) for both EN/VI
  - Intro dynamically interpolates user role, target, era, etc.
- **`js/views/StoryView.js`**:
  - Added `renderIntro(introText, targetCard)` — renders a `.story-intro` block prepended to story body
  - Corner avatar (72px, `object-fit: cover`, `object-position: center 20%`, `referrerPolicy="no-referrer"`, no `crossOrigin`) beside the intro paragraph
  - CSS: `.story-intro`, `.intro-corner-avatar` styles in `components.css`

#### 3. Shared Goal Objective & Rarity-Scaled Hybrid Loop — `StoryController`
- **`js/controllers/StoryController.js`** (complete rewrite):
  - `_getTotalChapters(tier)`: Common=1, Mid=2, Rare=3, Mythic=4 chapters
  - `_getMiniGameForChapter(idx)`: Cycles through 6 mini-games
  - `_getGemReward(tier, perfect)`: Rarity-scaled bonus Gems
    - Common: 100 (200 perfect), Mid: 200 (400 perfect), Rare: 350 (700 perfect), Mythic: 500 (1000 perfect)
  - Chapter loop (`_playNextChapter`): Types chapter → plays mini-game (if not last) → narrative bridge → next chapter
  - `_playMiniGame(gameKey)`: Uses `MiniGameView.start()` with Promise-based completion
  - `_generateContinuationChapter()`: Tone-aware filler chapters for Rare/Mythic
  - `_generateBridgeText()`: Success/failure/perfect narrative bridges
  - `handleChoiceSelection()`: Calculates gem reward based on mini-game performance, calls `userProfileModel.addGems()`, `syncStateToRemote()`
  - Entry object stores `chapterResults` for persistence

#### 4. 6 HTML5 Mini-Games — `js/views/MiniGameView.js` (NEW FILE, ~1100 lines)
All games support **mouse/touch + keyboard** (Space, arrows, D/F/J/K, WASD):
- **`dino_runner`**: Endless runner — jump over obstacles (Space/Tap), speed increases, survive 20s+
- **`green_zone_timing`**: Rotating needle — press when in green zone (5 rounds, speeding up)
- **`puzzle_unlock`**: 3×3 slide puzzle — click/drag or arrow keys to solve, move counter
- **`rhythm_catcher`**: 4-lane falling notes (D F J K) — hit on green line, judgement (PERFECT/GOOD/MISS)
- **`mash_clash`**: Rapid tap mash — 60 taps in 8s, particle feedback, progress bar
- **`lockpick_dial`**: Rotating dial + pick — drag/arrows to align, Space/Click to try, 3 attempts, tension bar

Architecture:
- `MiniGameView` class manages arena UI, canvas resize, game registry
- `BaseMiniGame` abstract class handles loop, input, callbacks
- `GAME_CLASSES` registry maps keys to constructors
- `GAME_META` provides labels, descriptions, controls hints
- `start(gameKey, {onComplete, onSkip})` API used by `StoryController`

#### 5. Branching Outcomes & Gem Rewards (DB Sync) — `StoryController` + `UserProfileModel`
- **Critical success (all perfect)**: Double gem reward + `syncStateToRemote()` → POST `/api/sync-state`
- **Partial success (some perfect)**: Base reward + 50 bonus + sync
- **Completion (no perfect)**: Small base reward + sync
- `UserProfileModel.addGems()` already calls `scheduleSyncState()` → debounced `syncStateToRemote()`
- Toast shows reward amount and type (`perfect`/`partial`/`completion`)

#### 6. Corner Avatar Beside Dialogue Choices — `StoryView`
- `renderChoices(choices, onChoose, selectedIndex, targetCard)` now accepts `targetCard`
- Each choice button gets a `.choice-corner-avatar` (64px, framed, `object-fit: cover`, `center 20%`, `referrerPolicy="no-referrer"`)
- CSS: `.choice-corner-avatar` in `components.css`

#### 7. CSS Styles — `css/components.css`
- Story Tone selector in Profile Dialog
- `.story-intro` + `.intro-corner-avatar` (72px)
- `.choice-corner-avatar` (64px)
- `.minigame-arena` + `#minigameCanvas` + HUD + controls (responsive)

---

### Modified / Created Files in Phase 3

**Models:**
- `js/models/UserProfileModel.js` — storyTone field, set/get/label methods, I18N strings
- `js/models/StoryModel.js` — `STORY_TONE_CONFIG`, `STORY_TONE_FRAGMENTS`, `TONE_EN_PREFIX`, `TONE_VI_PREFIX`, tone-aware `buildCtx`, `offlineStory` (intro), `llmStory` (tone in prompt)

**Views:**
- `js/views/ProfileView.js` — toneSelect binding in constructor, renderSelects, bindInputEvents
- `js/views/StoryView.js` — `renderIntro()`, `renderChoices()` with corner avatar parameter
- `js/views/MiniGameView.js` — **NEW** (6 mini-games, BaseMiniGame, registry)

**Controllers:**
- `js/controllers/AppController.js` — imports MiniGameView, passes to StoryController
- `js/controllers/StoryController.js` — **COMPLETE REWRITE**: rarity-scaled chapters, mini-game orchestration, gem rewards + DB sync, tone-aware continuations

**HTML / CSS:**
- `index.html` — Story Tone selector in Profile Dialog, Mini-Game Arena in Story Section
- `css/components.css` — Story intro styles, corner avatars (intro + choices), mini-game arena styles

---

### Syntax Validation
All `.js` files in `js/` pass `node --check`:
- `js/models/UserProfileModel.js` ✓
- `js/models/StoryModel.js` ✓
- `js/models/WikipediaModel.js` ✓
- `js/models/GachaModel.js` ✓
- `js/models/InventoryModel.js` ✓
- `js/controllers/AppController.js` ✓
- `js/controllers/GachaController.js` ✓
- `js/controllers/StoryController.js` ✓
- `js/views/ProfileView.js` ✓
- `js/views/StoryView.js` ✓
- `js/views/MiniGameView.js` ✓
- `js/views/CardView.js` ✓
- `js/views/RouletteView.js` ✓
- `js/views/AudioView.js` ✓
- `js/views/SettingsView.js` ✓

---

### FIX POST /api/save-card HTTP 500 & USER_CARDS PERSISTENCE FLOW (2026-11-13)

In production, `POST /api/save-card` from `InventoryModel.js` was returning HTTP 500, preventing rolled cards from being saved into `user_cards` in Neon Postgres.

#### Root causes fixed
1. **Foreign key failure (`user_cards_user_id_fkey`)** — `insertUserCard` relied on `getUserResources()` to create the parent `user_resources` row, which could race or skip, so the `user_cards` insert failed with a 500.
2. **Payload parsing** — `req.body` could arrive as a raw JSON string on Vercel; the handler now parses it safely and returns 400 on invalid JSON instead of a 500.
3. **Field aliases** — the handler now accepts both `camelCase` and `snake_case` keys (`userId`/`user_id`, `targetName`/`target_name`, etc.) and sanitizes all values with length caps.
4. **Missing portrait column** — `user_cards` had no `img_url` column, so cards reloaded from the DB lost their portrait.

#### Changes
- **`api/save-card.js`** — safe body parsing; flexible alias extraction with sanitization; embeds `img` into `storyJson.img`; passes `img_url` to `insertUserCard`; returns `{ success: true, cardId, card_id }`.
- **`api/_db.js`** — `ensureTables()` now `CREATE TABLE IF NOT EXISTS user_cards ... img_url TEXT` and `ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS img_url TEXT` (migration-safe); `getUserCards()` selects `img_url`; `insertUserCard()` accepts `img_url`, **always** runs `INSERT INTO user_resources (user_id, user_name, gems) VALUES (...) ON CONFLICT (user_id) DO NOTHING` before the card insert, and `ON CONFLICT (card_id) DO UPDATE SET ... img_url = COALESCE(EXCLUDED.img_url, user_cards.img_url)`; fallback store normalizes `story_json` to a parsed object.
- **`js/models/InventoryModel.js`** — `saveCardToRemote()` now sends `userName`, `img_url` (from `card.img`/`entry.imgUrl`/`entry.img`), and updates the local entry's `card_id`/`id` from the response so subsequent `POST /api/track-export` hits the exact row; `syncFromRemoteCards()` maps `row.img_url` → `card.img` so saved cards keep their portrait after reload.

#### Verification
- `node --check` passes on `api/save-card.js`, `api/_db.js`, `api/sync-state.js`, `api/track-export.js`, `api/character-pool.js`, `js/models/InventoryModel.js`, `js/models/UserProfileModel.js`.
- End-to-end test (built-in `fallbackStore`, no `DATABASE_URL` needed) confirms:
  - `POST /api/save-card` → 200, returns `{ success: true, cardId, card_id }`.
  - `GET /api/sync-state?userId=...` → 200, returns the saved card with `target_name`, `rarity`, `img_url`, and `story_json.img` all persisted.
  - `POST` with snake_case aliases + nulls → 200.
  - `POST` with missing `userId` → 200 (defaults to `'guest'`).
  - `POST` with invalid JSON body → 400.
  - `OPTIONS` → 200; `GET` → 405.

---

### All-in-One Fix (2026-11-12): 10X Pity Lockup, ~195 Searchable Countries, 5x Character Pool, Story-Integrated Mini-Games

#### 1. FIX 10X Multi-Pull Soft-Lock / Hang at Pity >= 6 — `GachaModel.js` & `GachaController.js`
**Root Cause:** When `pityCounter` >= 6 and user clicks **Spin 10X**, `buildMultiPulls` hit `PITY_MAX (10)` mid-batch while enforcing strict `Set` deduplication. If pool lacked enough `rare`/`myth` cards when pity triggered, sampling loop or UI animation could hang.
**Fix:**
- **`GachaModel.buildMultiPulls`**: Bounded `for (let i = 0; i < count; i++)` loop; increments `pityCounter` per pull inside the 10-pull batch; when `pityCounter >= PITY_MAX`, forces unused `rare`/`myth` card if available, otherwise falls back gracefully to highest-score unused card (allows reuse only if `pool.length < count`), then immediately resets `pityCounter = 0`.
- **`GachaController.handleMultiPull`**: Wrapped 10X spin calculation and modal render in `try...catch...finally` so `isBusy = false` is ALWAYS released and 10-card showcase modal always opens cleanly.
- **Verified**: Edge-case Node tests at `pity=6, 9, 10` and pools with no rare/myth or <10 unique cards — all complete in <1ms without hanging.

#### 2. SEARCHABLE COUNTRY DROPDOWN WITH ALL ~195 WORLD COUNTRIES — `UserProfileModel.js`, `ProfileView.js`, `index.html`, `components.css`
- **Dataset (`UserProfileModel.js`)**: `WORLD_COUNTRIES` covering **all ~195 UN-recognized countries** grouped into 6 regions (`Asia`, `Europe`, `Americas`, `Africa`, `Oceania`), plus default `'any'` (`🌍 Mọi quốc gia / Any Country`). Each entry has `value`, `labelVi`, `labelEn`, `queryEn`, `queryVi`, `flag`.
- **Searchable Dropdown UI (`index.html`, `ProfileView.js`, `components.css`)**:
  - Kept standard `<select id="country">` grouped with `<optgroup>` by continent for normal browsing/clicking.
  - Added compact inline **Search Filter Input** (`<input type="text" id="countrySearchInput" placeholder="🔍 Gõ tên nước để lọc nhanh...">`) right above `#fCountry` inside the Country card.
  - Typing in `#countrySearchInput` (case-insensitive & Vietnamese accent-insensitive: `"viet"` matches `"Việt Nam"`, `"nhat"` matches `"Nhật Bản"`) dynamically filters `<option>` items inside `#country` in real time; clearing input restores all ~195 countries.
  - Updated Random Country (`🎲`) button to roll across all ~195 countries.

#### 3. EXPAND CHARACTER POOL 5X: ALL COUNTRIES, CULTURES, GAMES, ANIME & FANTASY — `WikipediaModel.js`
- **Dynamic Global Country Query**: Removed hardcoded 10–15 country switch/if-else. Uses selected country's `queryEn`/`queryVi` to query Wikipedia (`"people from {queryEn}"`, `"người {queryVi}"`, `"nhân vật {queryVi}"`). When `'any'` selected, samples 5–6 diverse countries across continents per spin.
- **Increased Query Volume (3x–5x larger)**: MediaWiki `srlimit`/`cmlimit` up to `50` per query; parallel category/search requests so each spin builds deep `60–120+` valid character pool.
- **Massive Fictional, Gaming, Anime & Fantasy Expansion**:
  - 25+ Fandom Wiki endpoints: `genshin-impact`, `honkai-star-rail`, `leagueoflegends`, `finalfantasy`, `zelda`, `naruto`, `onepiece`, `dragonball`, `bleach`, `attackontitan`, `marvel`, `dc`, `starwars`, `harrypotter`, `lotr`, `witcher`, `villains`, `hero`, `anime`, `gaming`, `fantasy`, `mythology`.
  - Wikipedia categories: `Video game characters`, `Anime and manga characters`, `Fantasy characters`, `Mythological figures`, `Superhero characters`, `Literary characters`, `Television characters`, `Film characters` (EN & VI).
  - Search queries: `fictional character OR video game character OR anime character`, `superhero OR supervillain OR fantasy character`, `nhân vật hoạt hình OR nhân vật anime OR nhân vật game`, `siêu anh hùng OR nhân vật giả tưởng OR thần thoại`.

#### 4. TIE MINI-GAMES DIRECTLY TO STORY PLOT & CHARACTER LORE — `StoryModel.js` & `MiniGameView.js`
- **Contextual Mini-Game Framing (`StoryModel.js`)**:
  - Added `miniGameContext` object generation for every chapter in both LLM JSON output and offline template engine, tied to character's lore, era, and player's chosen action.
  - Fields: `gameId` (maps narrative action → mini-game), `missionTitle` (story-specific headline), `objectiveHint` (1-sentence explanation), `winConsequence` & `loseConsequence` (specific plot outcomes injected into next chapter).
  - Narrative action → game mapping: fleeing/chasing → `dino_runner`; dueling/forging/persuading → `green_zone_timing`; deciphering code/invention → `puzzle_unlock`; catching mana/intel/relics → `rhythm_catcher`; overpowering foe/gate → `mash_clash`; picking vault/hacking → `lockpick_dial`.
- **Render Story Mission Banner Inside Mini-Game (`MiniGameView.js`)**:
  - Mini-game arena now displays character's corner portrait, `missionTitle`, and `objectiveHint` at top so every mini-game feels organically woven into the story.
  - HUD shows mission context above score/timer.

#### 5. VERIFICATION
- `node --check` on all modified `.js` files: `UserProfileModel.js` ✓, `ProfileView.js` ✓, `GachaModel.js` ✓, `GachaController.js` ✓, `WikipediaModel.js` ✓, `StoryModel.js` ✓, `StoryController.js` ✓, `MiniGameView.js` ✓
- 10X pity edge-case tests at `pity=6, 9, 10` + pools without rare/myth + pools <10 cards — **ALL PASS**

---

## Emergency Fix — Page Freeze, Empty Dropdowns & Runtime JS Crash (2026-11-13)

**Symptom:** Web app froze mid-spin; all `<select>` dropdowns (`Phạm vi Vũ trụ`, `Target Gender Identity`, `Ethnicity`, `Religion`, `Country`) rendered empty.

**Root causes:**
1. `fetchPool` with 5-6 countries × 8 queries each could take 3-6 minutes when Wikipedia is slow — froze the UI mid-spin.
2. `renderSelects` had no per-dropdown `try/catch` — one failure killed all subsequent dropdowns.
3. `spinTo` could hang if `m.step === 0` or `wheelVp === 0` (layout not yet rendered).
4. `WORLD_COUNTRIES` entry for `'any'` had empty `queryEn`/`queryVi`.

**Fixes:**
1. **`js/models/WikipediaModel.js`** — `fetchPool` now wraps `_fetchPoolImpl` in a hard `Promise.race` with a 6000ms `setTimeout` timeout. If Wikipedia is slow, `fetchPool` rejects with `'fetchPool timeout'` and the caller (`GachaController.handlePull`/`handleMultiPull`) falls back to the offline pool instead of hanging.
2. **`js/views/ProfileView.js`** — `renderSelects` now uses a `safeFill()` helper that wraps every `fillSelect()` call in its own `try/catch`. A failure in one dropdown never blocks the others; on failure it re-populates with a single placeholder option so the dropdown is never empty.
3. **`js/views/RouletteView.js`** — `spinTo` now guards against `m.step === 0` or `m.vw === 0`. If the layout hasn't rendered, it defers one frame and retries; if still broken it resolves immediately instead of hanging the animation loop.
4. **`js/models/UserProfileModel.js`** — `WORLD_COUNTRIES` `'any'` entry now has `queryEn: 'any'` and `queryVi: 'mọi'` (was empty `''`).

**Verification:**
- `node --check` on all 14 `.js` files in `js/` → **ALL SYNTAX CHECKS PASSED**
- `WORLD_COUNTRIES` data integrity test → 198 entries, all fields valid, 0 errors
- `CRX` regex construction test → 198 entries, all valid RegExp, 0 empty regexes
- Accent-insensitive matching test → `"viet"` matches `"Việt Nam"` ✓

---

## Rule for Future Sessions
At the end of every task, update `PROJECT_STATE.md` with the modified file paths and current status.