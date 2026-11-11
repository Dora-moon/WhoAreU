/**
 * @file RouletteView.js
 * @description Handles the CS:GO Horizontal Roulette Canvas/CSS Animations,
 * card strip generation, smooth deceleration physics, needle ticks, and Pity display.
 */

export class RouletteView {
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

    if (!card.img) {
      const ini = document.createElement('span');
      ini.className = 'ini';
      ini.textContent = this.initials(card.name);
      imgEl.append(ini);
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
    return {
      step: b.offsetLeft - a.offsetLeft,
      cw: a.offsetWidth,
      vw: this.wheelVp.clientWidth
    };
  }

  spinTo(targetIndex, onTick) {
    return new Promise(resolve => {
      const m = this.getMetrics();
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
    });
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
