/**
 * @file RouletteView.js
 * @description Handles the CS:GO Horizontal Roulette Canvas/CSS Animations,
 * card strip generation, smooth deceleration physics, needle ticks, and Pity display.
 */

export class RouletteView {
  // --- Batched portrait-rescue persistence -------------------------------
  // During a 10X pull we can rescue 20-40 portraits. Firing one
  // POST /api/character-pool per rescue would hammer the server (and each
  // call is a separate Vercel cold start). Instead, rescued character
  // objects are queued in a static Map and flushed in a SINGLE batched
  // POST after an 800ms debounce.
  static _rescueQueue = new Map();
  static _rescueTimer = null;
  static _rescueDebounceMs = 800;

  static _flushRescueQueue() {
    if (RouletteView._rescueQueue.size === 0) return;
    const characters = Array.from(RouletteView._rescueQueue.values());
    RouletteView._rescueQueue.clear();
    RouletteView._rescueTimer = null;
    if (typeof fetch === 'undefined') return;
    try {
      fetch('/api/character-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters })
      }).then(async (resp) => {
        if (!resp) return;
        const resData = await resp.json().catch(() => ({}));
        console.log('[CharacterPool] Synced:', resData);
      }).catch(() => {});
    } catch (_) {}
  }

  static _scheduleRescueFlush() {
    if (RouletteView._rescueTimer) return;
    RouletteView._rescueTimer = setTimeout(
      () => RouletteView._flushRescueQueue(),
      RouletteView._rescueDebounceMs
    );
  }

  constructor() {
    this.$ = s => document.querySelector(s);
    this.wheelVp = this.$('#wheelVp');
    this.track = this.$('#track');
    this.pullBtn = this.$('#pullBtn');
    this.pull10xBtn = this.$('#pull10xBtn');
    this.randAllBtn = this.$('#randAll');
    this.statusEl = this.$('#status');
    this.pityBox = this.$('#pity');

    this.skipSpin = false;
    this.landed = null;

    // Click wheel to skip spin animation
    this.wheelVp.addEventListener('click', () => {
      this.skipSpin = true;
    });

    // Window resize recenter
    window.addEventListener('resize', () => this.recenter());
  }

  hueOf(name) {
    let x = 0;
    for (const ch of name) {
      x = (x * 31 + ch.charCodeAt(0)) % 360;
    }
    return x;
  }

  initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  // Shared client-side image rescue. Whenever an <img> renders with no
  // card.img OR fires onerror, fetch the Wikipedia REST Summary API right in
  // the browser, update card.img in memory AND swap imgEl.src dynamically in
  // place — replacing the monogram placeholder with the real portrait.
  // referrerPolicy="no-referrer" is forced; crossOrigin is NEVER added to DOM
  // <img> tags (Wikimedia/Fandom images lack CORS headers).
  async resolveLivePortrait(imgEl, card, onFallback) {
    if (!imgEl || !card) return;
    const title = card.title || card.name;
    if (!title) return;

    const candidates = [
      title,
      card.enTitle,
      card.wikiTitle,
      String(title).replace(/\s*\(.*\)$/, '').trim()
    ].filter(Boolean);

    const hostOf = u => { try { return new URL(u).hostname; } catch (_) { return null; } };
    const domains = [];
    const own = hostOf(card.url);
    if (own) domains.push(own);
    const vi = hostOf(card.urlVi);
    if (vi && !domains.includes(vi)) domains.push(vi);
    if (!domains.includes('en.wikipedia.org')) domains.push('en.wikipedia.org');

    const rescue = async (domain, cand) => {
      const u = `https://${domain}/api/rest_v1/page/summary/` + encodeURIComponent(cand);
      try {
        const j = await fetch(u);
        if (!j.ok) return null;
        const data = await j.json();
        if (!data || data.type === 'disambiguation' || data.type === 'redirect') return null;
        return (data.thumbnail && data.thumbnail.source)
          || (data.originalimage && data.originalimage.source)
          || null;
      } catch (_) { return null; }
    };

    for (const d of domains) {
      for (const cand of candidates) {
        const src = await rescue(d, cand);
        if (src) {
          card.img = src;
          imgEl.referrerPolicy = 'no-referrer';
          imgEl.removeAttribute('crossOrigin');
          imgEl.src = src;
          // Persist the rescued portrait back to the character pool so future
          // spins load it in 0ms — fire-and-forget, never blocks the UI.
          this._persistRescuedImage(card, src);
          return;
        }
      }
    }

    // Live REST rescue returned no image — fall back to the monogram.
    if (onFallback) onFallback();
  }

  // Queue a newly rescued portrait for a single batched POST to the character
  // pool. Never fires a separate request per rescue — see the static
  // _rescueQueue / _scheduleRescueFlush above.
  _persistRescuedImage(card, imageUrl) {
    if (!card || !imageUrl) return;
    const name = card.title || card.name;
    if (!name) return;
    const char_key = String(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '').slice(0, 220);
    // De-duplicate by char_key — only the most recent rescue for a character
    // needs to be persisted.
    RouletteView._rescueQueue.set(char_key, {
      char_key,
      name: String(name).trim(),
      enTitle: card.enTitle || String(name),
      universe: card.universe || 'historical',
      country: card.countryId || 'any',
      gender: card.gender || 'any',
      ethnicity: card.ethnicity || 'any',
      religion: card.religion || 'any',
      eraYear: card.birth != null ? Number(card.birth) : null,
      targetRole: card.targetRole || null,
      bioVi: card.summaryVi || card.descVi || null,
      bioEn: card.summaryEn || card.descEn || card.summary || card.desc || null,
      imageUrl
    });
    RouletteView._scheduleRescueFlush();
  }

  getCardBackground(card) {
    const hh = this.hueOf(card.name);
    const grad = `linear-gradient(135deg, hsl(${hh}, 65%, 42%), hsl(${(hh + 50) % 360}, 65%, 24%))`;
    return card.img
      ? `url("${card.img.replace(/"/g, '%22')}") center top / cover no-repeat, ${grad}`
      : grad;
  }

  createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'wc t-' + (card.tier || 'common');

    const imgEl = document.createElement('div');
    imgEl.className = 'im';
    imgEl.style.background = this.getCardBackground(card);

    const showMonogram = () => {
      const ini = document.createElement('span');
      ini.className = 'ini';
      ini.textContent = this.initials(card.name);
      imgEl.append(ini);
    };

    const placeImg = (src) => {
      const imTag = document.createElement('img');
      imTag.src = src;
      imTag.alt = card.name || '';
      imTag.referrerPolicy = 'no-referrer';
      imTag.style.width = '100%';
      imTag.style.height = '100%';
      imTag.style.objectFit = 'cover';
      imTag.style.objectPosition = 'center 15%';
      imTag.onerror = async () => {
        await this.resolveLivePortrait(imTag, card, showMonogram);
        if (imTag.complete && imTag.naturalWidth > 0) return;
        imTag.remove();
        showMonogram();
      };
      imgEl.append(imTag);
    };

    if (card.img) {
      placeImg(card.img);
    } else {
      // No image yet — render a placeholder <img> and launch the live REST
      // rescue immediately so the monogram is only the last resort.
      const placeholder = document.createElement('img');
      placeholder.alt = card.name || '';
      placeholder.referrerPolicy = 'no-referrer';
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      placeholder.style.objectFit = 'cover';
      placeholder.style.objectPosition = 'center 15%';
      imgEl.append(placeholder);
      this.resolveLivePortrait(placeholder, card, showMonogram);
    }

    const nmEl = document.createElement('div');
    nmEl.className = 'nm';
    nmEl.textContent = card.name;

    const scEl = document.createElement('div');
    scEl.className = 'sc';
    scEl.textContent = (card.score != null ? card.score : 50) + '%';

    cardEl.append(imgEl, nmEl, scEl);
    return cardEl;
  }

  renderTrack(cards) {
    this.track.replaceChildren(...cards.map(c => this.createCardElement(c)));
    this.track.style.transform = 'translate3d(0,0,0)';
  }

  getMetrics() {
    const a = this.track.children[0];
    const b = this.track.children[1] || a;
    // Use the CSS variable so the layout math stays consistent even if a
    // previous winner card still carries a scale transform.
    const cssCw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || (a ? a.offsetWidth : 136);
    return {
      step: b.offsetLeft - a.offsetLeft || cssCw,
      cw: cssCw,
      vw: this.wheelVp.clientWidth
    };
  }

  spinTo(targetIndex, onTick) {
    return new Promise(resolve => {
      const m = this.getMetrics();

      // Guard against zero-width track — if the layout hasn't rendered yet,
      // the animation loop would never progress and freeze the UI.
      if (!m.step || m.step <= 0 || !m.vw || m.vw <= 0) {
        // Defer one frame to let layout settle, then retry once.
        requestAnimationFrame(() => {
          const m2 = this.getMetrics();
          if (!m2.step || m2.step <= 0 || !m2.vw || m2.vw <= 0) {
            // Still broken — resolve immediately to avoid hanging the spin.
            resolve();
            return;
          }
          this._spinTo(targetIndex, onTick, m2, resolve);
        });
        return;
      }

      this._spinTo(targetIndex, onTick, m, resolve);
    });
  }

  _spinTo(targetIndex, onTick, m, resolve) {
    const jit = (Math.random() * 0.7 - 0.35) * m.cw;
    const target = targetIndex * m.step + m.cw / 2 + jit - m.vw / 2;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 1500 : 7200;

    this.landed = { idx: targetIndex, jit };
    this.skipSpin = false;

    let t0 = null;
    let lastIdx = -1;
    let lastTick = 0;
    this.track.style.transform = 'translate3d(0,0,0)';

    const frame = ts => {
      if (t0 == null) t0 = ts;
      let progress = Math.min(1, (ts - t0) / duration);
      if (this.skipSpin) progress = 1;

      // Quartic deceleration curve
      const ease = 1 - Math.pow(1 - progress, 4.2);
      const pos = target * ease;
      this.track.style.transform = `translate3d(${-pos}px,0,0)`;

      const cardIndex = Math.floor((pos + m.vw / 2) / m.step);
      if (cardIndex !== lastIdx) {
        lastIdx = cardIndex;
        if (ts - lastTick > 28 && progress < 1) {
          if (onTick) onTick(progress);
          lastTick = ts;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(frame);
  }

  highlightWinner(targetIndex) {
    if (this.track.children[targetIndex]) {
      this.track.children[targetIndex].classList.add('win');
    }
  }

  recenter() {
    if (!this.landed) return;
    const m = this.getMetrics();
    this.track.style.transform = `translate3d(${-(this.landed.idx * m.step + m.cw / 2 + this.landed.jit - m.vw / 2)}px,0,0)`;
  }

  setStatus(msg, isBusy = false) {
    this.statusEl.textContent = msg;
    this.statusEl.classList.toggle('busy', !!isBusy);
  }

  renderPity(pity, pityMax, isGuaranteed, pityLabel, guarLabel) {
    this.pityBox.replaceChildren(
      ...Array.from({ length: pityMax }, (_, i) => {
        const dot = document.createElement('i');
        if (i < pity) dot.className = 'f';
        return dot;
      }),
      (() => {
        const s = document.createElement('span');
        s.style.marginLeft = '8px';
        s.style.fontWeight = '700';
        s.textContent = isGuaranteed ? guarLabel : `${pity}/${pityMax}`;
        return s;
      })()
    );
  }

  setPulling(isPulling) {
    if (this.pullBtn) this.pullBtn.disabled = isPulling;
    if (this.pull10xBtn) this.pull10xBtn.disabled = isPulling;
    if (this.randAllBtn) this.randAllBtn.disabled = isPulling;
  }

  triggerScreenEffects(tier) {
    if (tier === 'rare') {
      document.body.classList.add('flash', 'shake');
      setTimeout(() => document.body.classList.remove('flash', 'shake'), 950);
    }
  }
}

export default RouletteView;
