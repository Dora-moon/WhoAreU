/**
 * @file GachaModel.js
 * @description Dynamic drop rate weights, rarity tiers, Pity system,
 * and horizontal CS:GO style roulette card strip generation.
 */

export const RARITY_WEIGHTS = {
  rare: 4,
  mid: 16,
  common: 80
};

export const TIERS = ['rare', 'mid', 'common'];
export const PITY_MAX = 10;
export const WIN_INDEX = 64;
export const TOTAL_CARDS = 80;

export class GachaModel {
  constructor() {
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
    if (tier === 'rare') {
      this.resetPity();
    } else {
      this.incrementPity();
    }
    return this.pity;
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
    const byTier = { rare: [], mid: [], common: [] };
    pool.forEach(card => {
      const t = card.tier || 'common';
      if (byTier[t]) byTier[t].push(card);
      else byTier.common.push(card);
    });

    // Fallback if tier lists are empty
    ['rare', 'mid', 'common'].forEach(t => {
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

    const winTier = this.pickTier(byTier, (forceRare && byTier.rare.length) ? 'rare' : null);
    const winner = pick(byTier[winTier]);
    list[WIN_INDEX] = winner;

    return { list, winner };
  }

  buildMultiPulls(pool, count = 10) {
    const byTier = { rare: [], mid: [], common: [] };
    pool.forEach(card => {
      const t = card.tier || 'common';
      if (byTier[t]) byTier[t].push(card);
      else byTier.common.push(card);
    });
    ['rare', 'mid', 'common'].forEach(t => {
      if (!byTier[t].length) byTier[t] = pool;
    });

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const pulls = [];

    for (let i = 0; i < count; i++) {
      const forceRare = this.isPityGuaranteed();
      const winTier = this.pickTier(byTier, (forceRare && byTier.rare.length) ? 'rare' : null);
      const card = pick(byTier[winTier]);
      this.recordWinnerTier(card.tier);
      pulls.push(card);
    }

    const tierWeight = { rare: 3, mid: 2, common: 1 };
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
}

export default GachaModel;
