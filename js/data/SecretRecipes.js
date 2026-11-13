/**
 * @file SecretRecipes.js
 * @description Custom MYTHIC card recipes for the WhoAreU Gacha.
 *
 * RECIPE TEMPLATE GUIDE
 * ---------------------
 * Each recipe is a plain object. Add a new Mythic card by pushing a new
 * object into SECRET_RECIPES below — no other file needs to change.
 *
 * Fields:
 *   id            string   Unique recipe id (used as the inventory card id).
 *   name          string   Short display name (used on the card / roulette).
 *   title         string   Full title shown on the dossier card.
 *   rarity        string   Always "MYTHIC" for these recipes.
 *   conditions    object   Trigger conditions evaluated on every spin.
 *     universe    string   "historical" | "fictional" | "multiverse" | "any"
 *     gender      string   "male" | "female" | "any" | "helicopter" | "washer" | "alien" | "toaster" | "printer"
 *     ethnicity   string   Any ETHNICITIES key (e.g. "jewish", "slavic") or "any".
 *     skinTone    string   "#rrggbb" hex color or "any" — matched against the player's skin preset.
 *     era         string   An ERAS key (e.g. "century_19") or "any".
 *   dropChance    number   0-1 weight; the gacha evaluates recipes in order and
 *                            the first one whose conditions match wins.
 *   customImage   string   URL or local path (./... or /assets/...) for the card portrait.
 *   customAudio   string   URL or local path to an audio file. Auto-played when the
 *                            Mythic card is pulled; a mute/stop toggle is rendered on the card.
 *   customIntro   string   Short intro line shown under the card title.
 *   goalObjective string   The "quest" text for the story engine.
 *   miniGames     string[] Array of mini-game keys the card unlocks
 *                            (dino_runner, green_zone_timing, puzzle_unlock,
 *                             rhythm_catcher, mash_clash, lockpick_dial).
 *
 * Notes:
 *   - `customImage` / `customAudio` may be absolute https URLs or local paths
 *     relative to the app root (./ and /assets/ are supported by normalizeWikiImg).
 *   - Recipes are evaluated in GachaModel.onSpin() AFTER the normal rarity roll.
 */

export const SECRET_RECIPES = [
  {
    id: 'myth-001-chronomancer',
    name: 'The Chronomancer',
    title: 'The Chronomancer of the Multiversal Archive',
    rarity: 'MYTHIC',
    conditions: {
      universe: 'multiverse',
      gender: 'any',
      ethnicity: 'any',
      skinTone: 'any',
      era: 'any'
    },
    dropChance: 0.05,
    customImage: '/assets/mythic/chronomancer.png',
    customAudio: '/assets/mythic/chronomancer.mp3',
    customIntro: 'A rogue archivist who stitches timelines back together with pocket-watch thread.',
    goalObjective: 'Recover the missing hour from the Timeline before it collapses.',
    miniGames: ['dino_runner', 'puzzle_unlock', 'rhythm_catcher']
  },
  {
    id: 'myth-002-viet-queens',
    name: 'Lưu Vương',
    title: 'Lưu Vương — The Forgotten Queen of the Mekong',
    rarity: 'MYTHIC',
    conditions: {
      universe: 'historical',
      gender: 'female',
      ethnicity: 'vietnamese',
      skinTone: 'any',
      era: 'any'
    },
    dropChance: 0.08,
    customImage: '/assets/mythic/luu_vuong.png',
    customAudio: '/assets/mythic/luu_vuong.mp3',
    customIntro: 'A queen erased from the official annals, remembered only by the river spirits.',
    goalObjective: 'Help her reclaim her name from the river of forgetting.',
    miniGames: ['green_zone_timing', 'lockpick_dial', 'mash_clash']
  }
];

export default SECRET_RECIPES;