/**
 * @file InventoryModel.js
 * @description Collectibles, Cursed Items & LocalStorage persistence for the Museum of Curiosities.
 */

export class InventoryModel {
  constructor() {
    this.storageKey = 'wg_inv';
    this.items = this._load();
  }

  _load() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const v = localStorage.getItem(this.storageKey);
      return v == null ? [] : JSON.parse(v);
    } catch (e) {
      return [];
    }
  }

  _save() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {}
  }

  getItems() {
    return this.items;
  }

  getCount() {
    return this.items.length;
  }

  addItem(entry) {
    // Keep max 60 items
    this.items.unshift(entry);
    this.items = this.items.slice(0, 60);
    this._save();
    return this.items;
  }

  hasItem(id) {
    return this.items.some(e => e.id === id);
  }

  clear() {
    this.items = [];
    this._save();
    return this.items;
  }

  getStats() {
    const counts = { rare: 0, mid: 0, common: 0 };
    this.items.forEach(e => {
      const tier = e.card && e.card.tier ? e.card.tier : 'common';
      if (counts[tier] != null) counts[tier]++;
      else counts.common++;
    });
    return {
      total: this.items.length,
      ...counts
    };
  }

  formatEntryText(entry, lang = 'en', presentText = 'present') {
    const s = entry.st[lang] || entry.st.en;
    const card = entry.card;
    const wikiUrl = lang === 'vi' && card.urlVi ? card.urlVi : card.url;
    return `${s.headline}\n\n${s.ch1}\n\n${s.ch2}\n\n${s.ch3}\n\n🏺 ${s.itemName} — ${s.itemDesc}\n\n${card.name} (${card.birth}–${card.death || presentText}) — ${wikiUrl}`;
  }

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.style.cssText = 'position:fixed;opacity:0';
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (_) {}
      ta.remove();
      return ok;
    }
  }
}

export default InventoryModel;
