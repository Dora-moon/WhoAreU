/**
 * @file InventoryModel.js
 * @description Collectibles, Cursed Items & LocalStorage persistence for the Museum of Curiosities.
 */

export class InventoryModel {
  constructor() {
    this.storageKey = 'wg_inv';
    this.userIdKey = 'wg_uid';
    this.userProfileModel = null;
    this.items = this._load();
  }

  getUserId() {
    if (this.userProfileModel && typeof this.userProfileModel.getUserId === 'function') {
      return this.userProfileModel.getUserId();
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const uid = localStorage.getItem(this.userIdKey);
        if (uid && uid.trim()) return uid.trim();
      }
    } catch (e) {}
    return 'usr_guest';
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
    if (!entry) return this.items;
    if (entry.is_exported === undefined) {
      entry.is_exported = false;
      entry.isExported = false;
    }
    // Keep max 60 items
    this.items.unshift(entry);
    this.items = this.items.slice(0, 60);
    this._save();
    this.saveCardToRemote(entry).catch(() => {});
    return this.items;
  }

  hasItem(id) {
    return this.items.some(e => e.id === id || e.card_id === id);
  }

  markExported(cardId) {
    if (!cardId) return false;
    const item = this.items.find(e => e.id === cardId || e.card_id === cardId);
    if (item) {
      item.is_exported = true;
      item.isExported = true;
      this._save();
      return true;
    }
    return false;
  }

  clear() {
    this.items = [];
    this._save();
    return this.items;
  }

  async saveCardToRemote(entry) {
    if (typeof fetch === 'undefined' || !entry) return null;
    const userId = this.getUserId();
    if (!userId) return null;

    try {
      const card = entry.card || {};
      const profile = this.userProfileModel ? this.userProfileModel.fields : {};

      const payload = {
        userId,
        cardId: entry.card_id || entry.id,
        targetName: card.name || (entry.st && entry.st.en && entry.st.en.headline) || 'Unknown Figure',
        targetRole: (profile && (profile.uRoleCustom || profile.uRole)) || 'Traveler',
        rarity: card.tier || 'common',
        era: card.birth != null ? `${card.birth} - ${card.death || 'present'}` : (profile && profile.era ? String(profile.era) : ''),
        ethnicity: (profile && (profile.ethnicityCustom || profile.ethnicity)) || card.countryId || 'any',
        religion: (profile && profile.religion) || 'any',
        storyJson: {
          card: entry.card,
          st: entry.st,
          absurd: entry.absurd
        }
      };

      const resp = await fetch('/api/save-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) return null;
      const data = await resp.json();
      if (data && data.success && data.card_id) {
        entry.card_id = data.card_id;
        entry.id = data.card_id;
        this._save();
      }
      return data;
    } catch (err) {
      // Seamless fallback to localStorage
      return null;
    }
  }

  syncFromRemoteCards(cards) {
    if (!Array.isArray(cards)) return false;
    let updated = false;
    const existingById = new Map();
    this.items.forEach(it => {
      if (it && (it.card_id || it.id)) {
        existingById.set(it.card_id || it.id, it);
      }
    });

    cards.forEach(row => {
      const cardId = row.card_id || row.id;
      if (!cardId) return;

      const isExported = Boolean(row.is_exported || row.isExported);

      if (existingById.has(cardId)) {
        const localItem = existingById.get(cardId);
        if (isExported && !localItem.is_exported) {
          localItem.is_exported = true;
          localItem.isExported = true;
          updated = true;
        }
      } else {
        // Parse story_json if string
        let storyJson = row.story_json;
        if (typeof storyJson === 'string') {
          try { storyJson = JSON.parse(storyJson); } catch (_) { storyJson = {}; }
        }
        storyJson = storyJson || {};

        const reconstructedCard = storyJson.card || {
          name: row.target_name || '',
          birth: row.era || 1900,
          death: '',
          countryId: row.ethnicity || 'any',
          desc: '',
          summary: '',
          img: '',
          tier: row.rarity || 'common',
          score: 80,
          source: 'wiki'
        };

        const reconstructedStory = storyJson.st || storyJson || {
          en: {
            headline: row.target_name || '',
            ch1: '', ch2: '', ch3: '',
            itemName: 'Curious Artifact',
            itemDesc: ''
          },
          vi: {
            headline: row.target_name || '',
            ch1: '', ch2: '', ch3: '',
            itemName: 'Cổ vật kỳ lạ',
            itemDesc: ''
          }
        };

        const newEntry = {
          id: cardId,
          card_id: cardId,
          is_exported: isExported,
          isExported: isExported,
          card: reconstructedCard,
          st: reconstructedStory,
          absurd: storyJson.absurd != null ? storyJson.absurd : 50,
          ts: row.created_at ? new Date(row.created_at).getTime() : Date.now()
        };

        this.items.push(newEntry);
        existingById.set(cardId, newEntry);
        updated = true;
      }
    });

    if (updated) {
      this.items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      this.items = this.items.slice(0, 60);
      this._save();
    }
    return updated;
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
