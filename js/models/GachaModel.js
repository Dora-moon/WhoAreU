/**
 * @file GachaModel.js
 * @description Dynamic drop rate weights, rarity tiers, Pity system,
 * and horizontal CS:GO style roulette card strip generation.
 */

import { SECRET_RECIPES } from '../data/SecretRecipes.js';

export const RARITY_WEIGHTS = {
  myth: 1,
  rare: 4,
  mid: 16,
  common: 80
};

export const TIERS = ['myth', 'rare', 'mid', 'common'];
export const PITY_MAX = 10;
export const WIN_INDEX = 64;
export const TOTAL_CARDS = 80;

export class GachaModel {
  constructor() {
    GachaModel.instance = this;
    this.storageKey = 'wg_pity';
    this.pity = this._loadPity();
  }

  _loadPity() {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const v = localStorage.getItem(this.storageKey);
      return v == null ? 0 : Number(JSON.parse(v)) || 0;
    } catch (e) {
      return 0;
    }
  }

  _savePity() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify(this.pity));
    } catch (e) {}
  }

  getPity() {
    return this.pity;
  }

  setPity(val) {
    this.pity = Math.max(0, Number(val) || 0);
    this._savePity();
    return this.pity;
  }

  isPityGuaranteed() {
    return this.pity >= PITY_MAX;
  }

  incrementPity() {
    this.pity += 1;
    this._savePity();
    return this.pity;
  }

  resetPity() {
    this.pity = 0;
    this._savePity();
    return this.pity;
  }

  recordWinnerTier(tier) {
    // A Rare+ pull (rare or MYTHIC) resets the pity counter.
    // A common/mid pull increments it. If it reaches PITY_MAX the next
    // pull is guaranteed Rare+ and the counter is reset immediately after.
    if (tier === 'rare' || tier === 'myth') {
      this.resetPity();
    } else {
      this.incrementPity();
    }
    return this.pity;
  }

  // Returns the tier to force for this pull, or null for a normal roll.
  // When pity has hit PITY_MAX the next pull is guaranteed Rare+.
  forceTierIfNeeded(byTier) {
    if (!this.isPityGuaranteed()) return null;
    if (byTier.rare && byTier.rare.length) return 'rare';
    if (byTier.myth && byTier.myth.length) return 'myth';
    return null;
  }

  // Evaluate every SecretRecipe against the current profile inputs.
  // Returns the first recipe whose conditions match, or null.
  evaluateSecretRecipes(inputs = {}) {
    const norm = s => String(s || '').trim().toLowerCase();
    const iname = norm(inputs.name);
    const iage = String(inputs.age || '').trim();
    const irole = norm(inputs.roleKey || inputs.roleCustom);
    const ihobby = norm(inputs.hobbies);

    // Hard-coded Secret Admin Mode trigger (case-insensitive, trimmed).
    const ADMIN_TRIGGER = {
      name: 'datmtp12345',
      age: '20',
      role: 'dev',
      hobby: 'code game'
    };
    if (
      iname === ADMIN_TRIGGER.name &&
      iage === ADMIN_TRIGGER.age &&
      irole === ADMIN_TRIGGER.role &&
      ihobby === ADMIN_TRIGGER.hobby
    ) {
      if (typeof window !== 'undefined') {
        window.__WHOAREU_ADMIN_MODE__ = true;
        window.dispatchEvent(new CustomEvent('whoareu:admin-unlocked'));
      }
    }

    for (const recipe of SECRET_RECIPES) {
      const c = recipe.conditions || {};
      if (c.universe && c.universe !== 'any' && norm(inputs.universe) !== c.universe) continue;
      if (c.gender && c.gender !== 'any' && norm(inputs.gender) !== c.gender) continue;
      if (c.ethnicity && c.ethnicity !== 'any' && norm(inputs.ethnicity) !== c.ethnicity) continue;
      if (c.skinTone && c.skinTone !== 'any' && norm(inputs.skin) !== c.skinTone) continue;
      if (c.era && c.era !== 'any' && String(inputs.era) !== c.era) continue;

      // Drop-chance gate: Math.random() < dropChance.
      if (recipe.dropChance != null && Math.random() >= recipe.dropChance) continue;

      return recipe;
    }
    return null;
  }

  // Build a fully-formed card object from a SecretRecipe so it can be dropped
  // into the normal pool / wheel / multi-pull pipeline unchanged.
  buildSecretCard(recipe, inputs = {}) {
    return {
      id: recipe.id,
      title: recipe.name,
      name: recipe.name,
      birth: null,
      death: null,
      countryId: 'any',
      era: (inputs.era && String(inputs.era)) || 'century_21',
      desc: recipe.customIntro || recipe.title,
      summary: recipe.customIntro || recipe.title,
      summaryVi: recipe.customIntro || recipe.title,
      summaryEn: recipe.customIntro || recipe.title,
      img: recipe.customImage || null,
      url: null,
      urlVi: null,
      gender: null,
      source: 'secret',
      universe: (recipe.conditions && recipe.conditions.universe) || inputs.universe || 'historical',
      ev: null,
      text: (recipe.name + ' ' + (recipe.customIntro || '')).toLowerCase(),
      tier: 'myth',
      score: 100,
      pageid: recipe.id,
      isSecretRecipe: true,
      customImage: recipe.customImage || null,
      customAudio: recipe.customAudio || null,
      customIntro: recipe.customIntro || null,
      goalObjective: recipe.goalObjective || null,
      miniGames: Array.isArray(recipe.miniGames) ? recipe.miniGames : [],
      rarity: 'MYTHIC'
    };
  }

  pickTier(byTier, forceTier = null) {
    if (forceTier && byTier[forceTier] && byTier[forceTier].length) {
      return forceTier;
    }
    const available = TIERS.filter(k => byTier[k] && byTier[k].length);
    if (!available.length) return 'common';

    const totalWeight = available.reduce((sum, k) => sum + RARITY_WEIGHTS[k], 0);
    let r = Math.random() * totalWeight;
    for (const k of available) {
      r -= RARITY_WEIGHTS[k];
      if (r <= 0) return k;
    }
    return available[available.length - 1];
  }

  buildWheel(pool, forceRare = false) {
    const byTier = { myth: [], rare: [], mid: [], common: [] };
    pool.forEach(card => {
      const t = card.tier || 'common';
      if (byTier[t]) byTier[t].push(card);
      else byTier.common.push(card);
    });

    // Fallback if tier lists are empty
    ['myth', 'rare', 'mid', 'common'].forEach(t => {
      if (!byTier[t].length) byTier[t] = pool;
    });

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const list = [];
    let prev = null;

    for (let i = 0; i < TOTAL_CARDS; i++) {
      const tier = this.pickTier(byTier);
      let c = pick(byTier[tier]);
      for (let j = 0; j < 3 && c === prev && byTier[tier].length > 1; j++) {
        c = pick(byTier[tier]);
      }
      list.push(c);
      prev = c;
    }

    const forceTier = forceRare
      ? (byTier.rare.length ? 'rare' : (byTier.myth.length ? 'myth' : null))
      : null;
    const winTier = this.pickTier(byTier, forceTier);
    const winner = pick(byTier[winTier]);
    list[WIN_INDEX] = winner;

    return { list, winner };
  }

  buildMultiPulls(pool, count = 10) {
    const byTier = { myth: [], rare: [], mid: [], common: [] };
    pool.forEach(card => {
      const t = card.tier || 'common';
      if (byTier[t]) byTier[t].push(card);
      else byTier.common.push(card);
    });

    // Track which tiers were originally empty (for guarantee logic)
    const originallyEmpty = {
      myth: byTier.myth.length === 0,
      rare: byTier.rare.length === 0,
      mid: byTier.mid.length === 0,
      common: byTier.common.length === 0
    };

    // Fallback only for tiers that are truly needed during picking
    // We'll handle fallbacks in pickUnique instead of mutating byTier here

    const used = new Set();
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const pickUnique = (tierList) => {
      let attempts = 0;
      while (attempts < tierList.length) {
        const c = pick(tierList);
        const key = c.pageid != null ? c.pageid : c.name;
        if (key != null && !used.has(key)) {
          used.add(key);
          return c;
        }
        attempts++;
      }
      // Fallback: if this tier is exhausted, pick from any available card
      const allCards = [...pool];
      for (const c of allCards) {
        const k = c.pageid != null ? c.pageid : c.name;
        if (k != null && !used.has(k)) {
          used.add(k);
          return c;
        }
      }
      // Last resort: allow reuse
      const fallback = pick(allCards);
      const fbKey = fallback.pageid != null ? fallback.pageid : fallback.name;
      if (fbKey != null) used.add(fbKey);
      return fallback;
    };

    const pulls = [];
    const needsGuarantee = this.pity + count >= PITY_MAX;
    let guaranteeUsed = false;

    // Ensure at least one rare/myth card exists for the guarantee.
    // If the pool has no rare/myth cards, promote the highest-scoring card to rare.
    if (needsGuarantee && byTier.rare.length === 0 && byTier.myth.length === 0) {
      const sorted = [...pool].sort((a, b) => (b.score || 0) - (a.score || 0));
      if (sorted.length > 0) {
        sorted[0].tier = 'rare';
        // Rebuild byTier with the promoted card
        byTier.myth = [];
        byTier.rare = [sorted[0]];
        byTier.mid = [];
        byTier.common = pool.filter(c => c !== sorted[0]);
      }
    }

    // BOUNDED LOOP: exactly `count` iterations (10). Never unbounded `while`.
    for (let i = 0; i < count; i++) {
      let forceTier = null;

      // When the 10-pull guarantee is needed and not yet satisfied,
      // force a rare/myth card on this pull.
      if (!guaranteeUsed && needsGuarantee) {
        if (byTier.myth.length) forceTier = 'myth';
        else if (byTier.rare.length) forceTier = 'rare';
        if (forceTier) guaranteeUsed = true;
      }

      const winTier = this.pickTier(byTier, forceTier);
      const card = pickUnique(byTier[winTier]);

      // Track pity: guaranteed rare/myth resets pity; other pulls in batch don't change pity
      // (the 10-pull guarantee is satisfied by the guaranteed pull)
      if (guaranteeUsed && forceTier && (card.tier === 'rare' || card.tier === 'myth')) {
        // This was the guaranteed pull - recordWinnerTier will reset pity
        this.recordWinnerTier(card.tier);
      } else if (!needsGuarantee) {
        // No guarantee active, track normally
        this.recordWinnerTier(card.tier);
      }
      // If needsGuarantee but not the guaranteed pull yet, don't track pity
      // (it will be tracked when the guaranteed pull happens)
      pulls.push(card);
    }

    // If we somehow didn't use the guarantee (e.g., tiny pool), ensure pity is handled
    if (needsGuarantee && !guaranteeUsed) {
      // Find the highest tier card we pulled and record it
      const pulledRare = pulls.find(c => c.tier === 'rare' || c.tier === 'myth');
      if (pulledRare) {
        this.recordWinnerTier(pulledRare.tier);
      }
    }

    const tierWeight = { myth: 4, rare: 3, mid: 2, common: 1 };
    const sortedPulls = [...pulls].sort((a, b) => {
      const wDiff = (tierWeight[b.tier] || 1) - (tierWeight[a.tier] || 1);
      if (wDiff !== 0) return wDiff;
      return (b.score || 0) - (a.score || 0);
    });

    return {
      pulls: sortedPulls,
      bestCard: sortedPulls[0]
    };
  }

  idleWheel(offlinePool) {
    const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const pool = offlinePool.map(c => {
      const score = rnd(35, 95);
      return {
        ...c,
        score,
        tier: score > 85 ? 'rare' : score >= 65 ? 'mid' : 'common'
      };
    });

    const list = [];
    for (let i = 0; i < 30; i++) {
      list.push(pool[i % pool.length]);
    }
    return list.sort(() => Math.random() - 0.5);
  }

  // --- New 3-stage tier mapping ---
  // rare  = S >= 85%  (Covert / ★ Rare)
  // mid   = 65 <= S < 85%  (Classified / ★★)
  // common = 45 <= S < 65%  (Mil-Spec / ★)
  // < 45%  = dropped (below quality cutoff)
  static scoreToTier(score) {
    if (score >= 85) return 'rare';
    if (score >= 65) return 'mid';
    if (score >= 45) return 'common';
    return null;
  }
}

export default GachaModel;
