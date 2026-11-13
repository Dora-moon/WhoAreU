/**
 * @file CardView.js
 * @description Renders Holographic Fate Cards, 3D interactive tilt,
 * Canvas Vintage Newspaper and Holo Card export, Museum of Curiosities Dialog,
 * Toast notifications, and Confetti physics particle system.
 */

export class CardView {
  constructor() {
    this.$ = s => document.querySelector(s);
    this.$$ = s => [...document.querySelectorAll(s)];

    this.resultSection = this.$('#result');
    this.rcard = this.$('#rcard');
    this.rBan = this.$('#rBan');
    this.rImg = this.$('#rImg');
    this.rName = this.$('#rName');
    this.rMeta = this.$('#rMeta');
    this.rDesc = this.$('#rDesc');
    this.rSum = this.$('#rSum');
    this.rScore = this.$('#rScore');
    this.rBars = this.$('#rBars');
    this.btnWeave = this.$('#btnWeave');
    this.rLink = this.$('#rLink');
    this.rSrc = this.$('#rSrc');

    this.toastEl = this.$('#toast');
    this.toastTimer = null;

    // Export dialog elements
    this.expDlg = this.$('#expDlg');
    this.expCanvas = this.$('#expCanvas');
    this.expLoad = this.$('#expLoad');
    this.tabPaper = this.$('#tabPaper');
    this.tabHolo = this.$('#tabHolo');
    this.expDl = this.$('#expDl');
    this.expCopy = this.$('#expCopy');

    // Museum dialog elements
    this.invDlg = this.$('#invDlg');
    this.invList = this.$('#invList');
    this.invGrid = this.$('#invGrid');
    this.invStats = this.$('#invStats');
    this.invDetail = this.$('#invDetail');
    this.invClear = this.$('#invClear');
    this.invCountBadge = this.$('#invCount');
    this.gemCountBadge = this.$('#gemCount');
    this.btnGems = this.$('#btnGems');

    // Multi-pull dialog elements
    this.multiPullDlg = this.$('#multiPullDlg');
    this.multiPullGrid = this.$('#multiPullGrid');
    this.multiPullClose = this.$('#multiPullClose');

    // Image cache for Canvas
    this.imgCache = new Map();

    // Confetti state
    this.cf = {
      cv: this.$('#confetti'),
      g: null,
      ps: [],
      run: false
    };

    this.init3DTilt();
  }

  init3DTilt() {
    const rc = this.rcard;
    rc.addEventListener('pointermove', e => {
      const r = rc.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      rc.style.setProperty('--mx', Math.round(x * 100) + '%');
      rc.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 5}deg) rotateX(${(0.5 - y) * 4}deg)`;
    });

    rc.addEventListener('pointerleave', () => {
      rc.style.transform = '';
    });
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

  showResultCard(card, profileModel) {
    if (!card) return;
    const t = k => profileModel.t(k);
    const L = profileModel.lang;

    this.rcard.className = 'rcard gacha-card dossier-card t-' + (card.tier || 'common');
    this.rBan.textContent = `${t('r_' + card.tier)} · ${card.score}%`;

    this.rImg.style.background = this.getCardBackground(card);
    this.renderCardImage(this.rImg, card);

    this.rName.textContent = card.name;
    const countryLabel = card.countryId && card.countryId !== 'any'
      ? profileModel.getCountryLabel(card.countryId, L)
      : t('unknownC');
    const years = `${card.birth} – ${card.death || t('present')}`;
    this.rMeta.textContent = `${years} · ${countryLabel}`;
    this.rDesc.textContent = card.desc;

    // Build or obtain structured Wikipedia Dossier
    const dossier = card.dossier || (window.__APP__ && window.__APP__.wikipediaModel
      ? window.__APP__.wikipediaModel.buildDossier(card, L, profileModel)
      : {
          fullName: card.name,
          targetRole: card.targetRole || 'Huyền Thoại Lịch Sử',
          userRole: profileModel ? profileModel.getRoleLabel() : '',
          lifespan: years,
          originAndEthnicity: countryLabel,
          religion: card.religion || 'Vô thần / Triết học',
          claimToFame: card.desc
        });

    // Sleek Cartoon Dossier Badge replacing raw wall of text
    this.rSum.className = 'rsum cartoon-dossier-wrap';
    this.rSum.replaceChildren(this.renderDossierBadge(dossier, card.tier, t, profileModel, card));

    // Big score
    this.rScore.replaceChildren(
      document.createTextNode(String(card.score) + '%'),
      (() => {
        const sm = document.createElement('small');
        sm.textContent = t('sim');
        return sm;
      })()
    );

    // Breakdown bars
    const barKeys = card.parts && card.parts.era !== undefined
      ? ['era', 'ethnicity', 'religion', 'country', 'gender', 'fame']
      : ['year', 'country', 'gender', 'trait', 'fame'];
    this.rBars.replaceChildren(
      ...barKeys.map(k => {
        const val = Math.round((card.parts && card.parts[k] ? card.parts[k] : 0) * 100);
        const barRow = document.createElement('div');
        barRow.className = 'bar';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = t('b_' + k);

        const bWrap = document.createElement('div');
        bWrap.className = 'b';
        const bFill = document.createElement('i');
        bFill.style.width = val + '%';
        bWrap.append(bFill);

        const valSpan = document.createElement('span');
        valSpan.textContent = val + '%';

        barRow.append(labelSpan, bWrap, valSpan);
        return barRow;
      })
    );

    const wikiUrl = L === 'vi' && card.urlVi ? card.urlVi : card.url;
    this.rLink.href = wikiUrl;
    this.rLink.textContent = t('readWiki') + ' ↗';
    this.rSrc.textContent = card.source === 'wiki' ? t('srcWiki') : t('srcOff');

    this.resultSection.hidden = false;
    this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hideResultCard() {
    this.resultSection.hidden = true;
  }

  renderDossierBadge(dossier, tier, t, profileModel, card) {
    const wrap = document.createElement('div');
    wrap.className = `cartoon-dossier-badge t-${tier || 'common'}`;

    const head = document.createElement('div');
    head.className = 'dossier-head';

    const pill = document.createElement('span');
    pill.className = 'dossier-pill';
    pill.innerHTML = `<span class="dossier-icon">📋</span> ${t ? t('dossierTitle') : 'WIKI HISTORICAL DOSSIER'}`;

    const stamp = document.createElement('span');
    stamp.className = 'dossier-stamp';
    stamp.textContent = t ? t('r_' + (tier || 'common')) : (tier || 'common');

    head.append(pill, stamp);

    // Target's era relative to the selected filter
    const isVi = !profileModel || profileModel.lang === 'vi';
    let minYear = 1900;
    if (profileModel && typeof profileModel.getBirthYear === 'function') {
      minYear = profileModel.getBirthYear();
    } else if (dossier && dossier.selectedMinYear != null) {
      minYear = Number(dossier.selectedMinYear);
    } else if (card && (card.selectedMinYear != null || card.eraYear != null || card.year != null)) {
      minYear = Number(card.selectedMinYear ?? card.eraYear ?? card.year);
    } else if (typeof window !== 'undefined' && window.__APP__?.userProfileModel?.getBirthYear) {
      minYear = window.__APP__.userProfileModel.getBirthYear();
    }

    const eraText = (isVi
      ? (minYear <= 500 ? 'Thuộc giai đoạn: Toàn bộ Lịch sử (Cổ đại đến Nay)' : `Thuộc giai đoạn: ${minYear} – Nay`)
      : (minYear <= 500 ? 'Era Filter: All History (Ancient to Present)' : `Era Filter: ${minYear} – Present`));

    // Dedicated Era Badge line directly under the header
    const subhead = document.createElement('div');
    subhead.className = 'dossier-subhead';

    const eraBadge = document.createElement('span');
    eraBadge.className = 'dossier-era-badge';
    eraBadge.textContent = eraText;

    subhead.append(eraBadge);

    // Concise 1-paragraph bio header (full-width, no redundant mini-portrait)
    const bioHeader = document.createElement('div');
    bioHeader.className = 'dossier-bio-header';

    const bioTextBox = document.createElement('div');
    bioTextBox.className = 'dossier-bio-text';

    const bioP = document.createElement('p');
    let bioText = '';
    if (card) {
      bioText = (isVi && card.summaryVi) ? card.summaryVi : (card.summary || card.desc || '');
    }
    bioText = bioText.replace(/\s+/g, ' ').trim();
    if (bioText.length > 280) {
      bioText = bioText.slice(0, 277) + '…';
    }
    bioP.textContent = bioText || (isVi ? 'Hồ sơ nhân vật lịch sử / giả tưởng được trích xuất từ dữ liệu bách khoa toàn thư.' : 'Figure dossier retrieved from encyclopedia archives.');

    // Collapsible "Xem thêm ▾" / "Thu gọn ▴" toggle for long bios (>140 chars).
    const FULL = bioText;
    const COLLAPSED_LEN = 140;
    if (FULL.length > COLLAPSED_LEN) {
      const collapsed = FULL.slice(0, COLLAPSED_LEN).trimEnd();
      const moreLabel = isVi ? 'Xem thêm ▾' : 'Read more ▾';
      const lessLabel  = isVi ? 'Thu gọn ▴'  : 'Show less ▴';
      bioP.textContent = collapsed;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'dossier-bio-toggle';
      toggle.textContent = moreLabel;
      toggle.addEventListener('click', () => {
        const expanded = bioP.textContent !== FULL;
        bioP.textContent = expanded ? FULL : collapsed;
        toggle.textContent = expanded ? lessLabel : moreLabel;
        bioTextBox.classList.toggle('expanded', expanded);
      });
      bioTextBox.append(toggle);
    }

    bioTextBox.append(bioP);

    bioHeader.append(bioTextBox);

    const list = document.createElement('div');
    list.className = 'dossier-grid';

    // VS Role display fitting neatly on a new flex line
    const roleVal = dossier.userRole
      ? `<div class="dossier-role-wrap"><span class="dossier-role-target">🎯 ${dossier.targetRole}</span> <span class="dossier-role-vs">vs</span> <span class="dossier-role-user">🧑 ${dossier.userRole}</span></div>`
      : `<div class="dossier-role-wrap"><span class="dossier-role-target">🎯 ${dossier.targetRole}</span></div>`;

    // Extract base lifespan (e.g., "2002 – nay (24 tuổi)")
    const rawLifespan = String(dossier.lifespan || '');
    const baseLifespan = rawLifespan.split(' · ')[0].replace(/\s*\|\s*.*$/, '').trim();

    // Format era display text (e.g., "Từ 2002 đến Nay")
    const eraFilterLabel = isVi
      ? (minYear <= 500 ? 'Toàn bộ Lịch sử (Cổ đại đến Nay)' : `Từ ${minYear} đến Nay`)
      : (minYear <= 500 ? 'All History (Ancient to Present)' : `From ${minYear} to Present`);

    // Combine "GIAI ĐOẠN / NĂM SỐNG" and "THUỘC GIAI ĐOẠN" into ONE clean single row
    const combinedLifespanEra = baseLifespan
      ? `${baseLifespan} | ${eraFilterLabel}`
      : eraFilterLabel;

    const lifespanEraLabel = isVi ? 'Năm sống / Giai đoạn' : 'Lifespan / Era';

    const items = [
      { ico: '👤', label: t ? t('dossierName') : 'Full Name', val: dossier.fullName },
      { ico: '🎭', label: t ? t('dossierTargetRole') : 'Target Role', val: roleVal, isHtml: true, isRole: true },
      { ico: '⏳', label: lifespanEraLabel, val: combinedLifespanEra },
      { ico: '🌍', label: t ? t('dossierOrigin') : 'Origin & Ethnicity', val: dossier.originAndEthnicity || dossier.origin },
      { ico: '☯️', label: t ? t('dossierReligion') : 'Religion / Beliefs', val: dossier.religion },
      { ico: '📜', label: t ? t('dossierFame') : 'Claim to Fame', val: dossier.claimToFame, isFame: true }
    ];

    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'dossier-row dossier-item' + (it.isFame ? ' dossier-fame' : '') + (it.isRole ? ' dossier-role' : '');

      const icoSpan = document.createElement('span');
      icoSpan.className = 'dossier-row-ico';
      icoSpan.textContent = it.ico;

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'dossier-row-body dossier-text';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'dossier-row-label';
      labelSpan.textContent = it.label + ':';

      const valStrong = document.createElement('strong');
      valStrong.className = 'dossier-row-val dossier-value';
      if (it.isHtml) {
        valStrong.innerHTML = it.val;
      } else {
        valStrong.textContent = it.val;
        // Collapsible "Xem thêm ▾" / "Thu gọn ▴" for long notable-event text.
        const fullText = it.val || '';
        if (it.isFame && fullText.length > 140) {
          const collapsed = fullText.slice(0, 140).trimEnd();
          const moreLabel = isVi ? 'Xem thêm ▾' : 'Read more ▾';
          const lessLabel  = isVi ? 'Thu gọn ▴'  : 'Show less ▴';
          valStrong.textContent = collapsed;
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'dossier-bio-toggle';
          toggle.textContent = moreLabel;
          toggle.addEventListener('click', () => {
            const expanded = valStrong.textContent !== fullText;
            valStrong.textContent = expanded ? fullText : collapsed;
            toggle.textContent = expanded ? lessLabel : moreLabel;
          });
          valStrong.append(toggle);
        }
      }

      bodyDiv.append(labelSpan, valStrong);
      row.append(icoSpan, bodyDiv);
      list.append(row);
    });

    wrap.append(head, subhead, bioHeader, list);
    return wrap;
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 3200);
  }

  // ==========================================================================
  // Confetti Particle Physics
  // ==========================================================================
  confetti(n = 140, cols = ['#00f3ff', '#ff007f', '#ffd700', '#fff']) {
    const cv = this.cf.cv;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    this.cf.g = cv.getContext('2d');

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    for (let i = 0; i < n; i++) {
      this.cf.ps.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.55,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 17 - 4,
        s: Math.random() * 8 + 4,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        c: pick(cols),
        l: 100 + Math.random() * 60
      });
    }

    if (!this.cf.run) {
      this.cf.run = true;
      requestAnimationFrame(() => this._confettiStep());
    }
  }

  _confettiStep() {
    const g = this.cf.g;
    g.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.cf.ps = this.cf.ps.filter(p => p.l > 0 && p.y < window.innerHeight + 20);

    this.cf.ps.forEach(p => {
      p.vy += 0.45;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.992;
      p.r += p.vr;
      p.l--;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.globalAlpha = Math.min(1, p.l / 30);
      g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
      g.restore();
    });

    if (this.cf.ps.length) {
      requestAnimationFrame(() => this._confettiStep());
    } else {
      this.cf.run = false;
      g.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  // ==========================================================================
  // Canvas Export (Vintage Newspaper & Holographic Fate Card)
  // ==========================================================================
  async loadImage(url) {
    if (!url) return null;
    if (this.imgCache.has(url)) return this.imgCache.get(url);

    const promise = new Promise(resolve => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      const to = setTimeout(() => resolve(null), 7000);
      im.onload = () => {
        clearTimeout(to);
        resolve(im);
      };
      im.onerror = () => {
        clearTimeout(to);
        resolve(null);
      };
      im.src = url;
    });

    this.imgCache.set(url, promise);
    return promise;
  }

  // Shared client-side image rescue. Whenever an <img> renders with no
  // card.img OR fires onerror, fetch the Wikipedia REST Summary API right in
  // the browser, update card.img in memory AND swap imgEl.src dynamically in
  // place — replacing the monogram placeholder with the real portrait.
  // referrerPolicy="no-referrer" is forced; crossOrigin is NEVER added to DOM
  // <img> tags (Wikimedia/Fandom images lack CORS headers).
  async rescueImage(imgElement, card) {
    if (!imgElement || !card) return;
    const title = card.title || card.name;
    if (!title) return;

    const candidates = [
      title,
      card.enTitle,
      card.wikiTitle,
      String(title).replace(/\s*\(.*\)$/, '').trim()
    ].filter(Boolean);

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

    const domains = [];
    try { const u = new URL(card.url); if (u.hostname) domains.push(u.hostname); } catch (_) {}
    try { const u = new URL(card.urlVi); if (u.hostname && !domains.includes(u.hostname)) domains.push(u.hostname); } catch (_) {}
    if (!domains.includes('en.wikipedia.org')) domains.push('en.wikipedia.org');

    for (const d of domains) {
      for (const cand of candidates) {
        const src = await rescue(d, cand);
        if (src) {
          card.img = src;
          imgElement.referrerPolicy = 'no-referrer';
          imgElement.removeAttribute('crossOrigin');
          imgElement.src = src;
          return;
        }
      }
    }
  }

  // Render a card's portrait into a container div. If card.img is missing or
  // the image fails, attempts an in-place REST rescue before falling back to
  // the character's initials.
  renderCardImage(container, card) {
    if (!container || !card) return;
    container.replaceChildren();

    const placeImg = (src) => {
      const imTag = document.createElement('img');
      imTag.src = src;
      imTag.alt = card.name || '';
      imTag.referrerPolicy = 'no-referrer';
      imTag.style.width = '100%';
      imTag.style.height = '100%';
      imTag.style.objectFit = 'cover';
      imTag.style.borderRadius = 'inherit';
      imTag.onerror = async () => {
        await this.rescueImage(imTag, card);
        if (imTag.complete && imTag.naturalWidth > 0) return;
        imTag.remove();
        container.textContent = this.initials(card.name);
      };
      container.append(imTag);
    };

    if (card.img) {
      placeImg(card.img);
      return;
    }

    // No image yet — try a live REST rescue before the initials fallback.
    (async () => {
      const imTag = document.createElement('img');
      imTag.alt = card.name || '';
      imTag.referrerPolicy = 'no-referrer';
      imTag.style.width = '100%';
      imTag.style.height = '100%';
      imTag.style.objectFit = 'cover';
      imTag.style.borderRadius = 'inherit';
      await this.rescueImage(imTag, card);
      if (imTag.src) {
        imTag.onerror = async () => {
          await this.rescueImage(imTag, card);
          if (imTag.complete && imTag.naturalWidth > 0) return;
          imTag.remove();
          container.textContent = this.initials(card.name);
        };
        container.append(imTag);
      } else {
        container.textContent = this.initials(card.name);
      }
    })();
  }

  wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    const words = String(text).split(/\s+/);
    let line = '';
    const lines = [];

    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    if (maxLines && lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (ctx.measureText(last + '…').width > maxW && last.length > 1) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last.replace(/[\s,.;:]+$/, '') + '…';
    }

    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
    return y + lines.length * lineH;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawCover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s;
    const sh = h / s;
    ctx.drawImage(img, (img.width - sw) / 2, 0, sw, Math.min(sh, img.height), x, y, w, h);
  }

  drawAvatar(ctx, name, x, y, w, h) {
    const hu = this.hueOf(name);
    const gr = ctx.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, `hsl(${hu}, 65%, 42%)`);
    gr.addColorStop(1, `hsl(${(hu + 50) % 360}, 65%, 22%)`);
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(w, h) * 0.33}px Orbitron, Georgia, serif`;
    ctx.fillText(this.initials(name), x + w / 2, y + h / 2 + Math.min(w, h) * 0.12);
  }

  drawPaper(cv, entry, story, card, img, lang, profileModel) {
    const t = k => profileModel.t(k);
    const Wd = 1080;
    const H = 1500;
    cv.width = Wd;
    cv.height = H;
    const g = cv.getContext('2d');

    // Weathered paper background
    g.fillStyle = '#f1e6c8';
    g.fillRect(0, 0, Wd, H);

    const gr = g.createRadialGradient(Wd / 2, H / 2, H * 0.3, Wd / 2, H / 2, H * 0.78);
    gr.addColorStop(0, 'rgba(255, 248, 225, 0)');
    gr.addColorStop(1, 'rgba(120, 80, 30, 0.38)');
    g.fillStyle = gr;
    g.fillRect(0, 0, Wd, H);

    // Procedural grain
    for (let i = 0; i < 2800; i++) {
      g.fillStyle = `rgba(90,60,20,${Math.random() * 0.07})`;
      g.fillRect(Math.random() * Wd, Math.random() * H, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
    }

    const ink = '#1d1710';
    g.fillStyle = ink;
    g.strokeStyle = ink;

    // Double border
    g.lineWidth = 6;
    g.strokeRect(30, 30, Wd - 60, H - 60);
    g.lineWidth = 1.5;
    g.strokeRect(42, 42, Wd - 84, H - 84);

    // Masthead
    g.textAlign = 'center';
    g.font = '900 90px "Playfair Display", Georgia, serif';
    g.fillText(t('paperName'), Wd / 2, 150);

    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(60, 172);
    g.lineTo(Wd - 60, 172);
    g.stroke();

    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(60, 180);
    g.lineTo(Wd - 60, 180);
    g.stroke();

    // Date & Price
    g.font = 'italic 22px Georgia, serif';
    const dateStr = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    g.fillText(`${dateStr}  ·  ${t('paperPrice')}`, Wd / 2, 214);

    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(60, 232);
    g.lineTo(Wd - 60, 232);
    g.stroke();

    // Headline
    g.font = '900 54px "Playfair Display", Georgia, serif';
    const hy = this.wrapText(g, story.headline.toUpperCase(), Wd / 2, 300, Wd - 140, 62, 3);

    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(60, Math.max(hy - 20, 440));
    g.lineTo(Wd - 60, Math.max(hy - 20, 440));
    g.stroke();

    // Image / Avatar with sepia tint
    const iy = 490;
    const iw = 380;
    const ih = 470;
    const tmp = document.createElement('canvas');
    tmp.width = iw;
    tmp.height = ih;
    const tg = tmp.getContext('2d');
    if (img) this.drawCover(tg, img, 0, 0, iw, ih);
    else this.drawAvatar(tg, card.name, 0, 0, iw, ih);

    try {
      const d = tg.getImageData(0, 0, iw, ih);
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const yLum = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
        px[i] = Math.min(255, yLum * 1.08 + 16);
        px[i + 1] = Math.min(255, yLum * 0.93 + 8);
        px[i + 2] = Math.min(255, yLum * 0.7);
      }
      tg.putImageData(d, 0, 0);
    } catch (_) {}

    g.drawImage(tmp, 60, iy);
    g.lineWidth = 4;
    g.strokeRect(60, iy, iw, ih);

    g.font = 'italic 21px Georgia, serif';
    g.fillText(`${card.name} (${card.birth}–${card.death || t('present')})`, 60 + iw / 2, iy + ih + 34);

    // Chapter 1 Column
    g.textAlign = 'left';
    g.font = '24px Georgia, "Times New Roman", serif';
    this.wrapText(g, story.ch1, 490, iy + 26, Wd - 60 - 490, 33, 14);

    // Section separator
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(60, 1042);
    g.lineTo(Wd - 60, 1042);
    g.stroke();

    // Split columns for Chapters 2 & 3
    g.beginPath();
    g.moveTo(Wd / 2, 1062);
    g.lineTo(Wd / 2, 1336);
    g.stroke();

    g.font = '900 19px "Playfair Display", Georgia, serif';
    g.fillText(t('paperI'), 60, 1076);
    g.fillText(t('paperIII'), Wd / 2 + 28, 1076);

    g.font = '21px Georgia, serif';
    this.wrapText(g, story.ch2, 60, 1112, Wd / 2 - 90, 28, 8);
    this.wrapText(g, story.ch3, Wd / 2 + 28, 1112, Wd / 2 - 88, 28, 8);

    // Cursed Item Cutout Box
    g.setLineDash([9, 6]);
    g.lineWidth = 2.5;
    g.strokeRect(60, 1356, Wd - 120, 76);
    g.setLineDash([]);

    g.textAlign = 'center';
    g.font = 'bold 21px Georgia, serif';
    this.wrapText(g, `🏺 ${t('paperCursed')}: ${story.itemName} — ${story.itemDesc}`, Wd / 2, 1388, Wd - 170, 27, 2);

    g.font = 'italic 17px Georgia, serif';
    g.fillText('Live Wikipedia Gacha · Wikipedia (CC BY-SA)', Wd / 2, 1458);
  }

  drawHolo(cv, entry, story, card, img, lang, profileModel) {
    const t = k => profileModel.t(k);
    const Wd = 800;
    const H = 1120;
    cv.width = Wd;
    cv.height = H;
    const g = cv.getContext('2d');

    const tierCols = {
      rare: ['#ffd700', '#eb4b4b'],
      mid: ['#d32ce6', '#8847ff'],
      common: ['#4b69ff', '#8e9aa8']
    }[card.tier || 'common'];

    // Deep cosmic background
    const bg = g.createLinearGradient(0, 0, Wd, H);
    bg.addColorStop(0, '#1a0d2e');
    bg.addColorStop(1, '#07040f');
    g.fillStyle = bg;
    this.roundRect(g, 0, 0, Wd, H, 38);
    g.fill();

    // Prismatic holographic light beams
    g.save();
    this.roundRect(g, 0, 0, Wd, H, 38);
    g.clip();
    g.globalCompositeOperation = 'screen';

    for (let i = -10; i < 30; i++) {
      g.fillStyle = `hsla(${(i * 13 + 360) % 360}, 100%, 60%, 0.11)`;
      g.beginPath();
      g.moveTo(i * 60, 0);
      g.lineTo(i * 60 + 40, 0);
      g.lineTo(i * 60 - H * 0.6 + 40, H);
      g.lineTo(i * 60 - H * 0.6, H);
      g.fill();
    }

    // Star dust particles
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7})`;
      const r = Math.random() * 3 + 0.5;
      g.beginPath();
      g.arc(Math.random() * Wd, Math.random() * H, r, 0, 7);
      g.fill();
    }
    g.restore();

    // Glowing border
    const bd = g.createLinearGradient(0, 0, Wd, H);
    bd.addColorStop(0, tierCols[0]);
    bd.addColorStop(1, tierCols[1]);
    g.lineWidth = 14;
    g.strokeStyle = bd;
    this.roundRect(g, 10, 10, Wd - 20, H - 20, 34);
    g.stroke();

    // Rarity Header
    g.textAlign = 'center';
    g.fillStyle = tierCols[0];
    g.font = '800 26px Orbitron, "Segoe UI", sans-serif';
    g.fillText(t('r_' + card.tier).toUpperCase(), Wd / 2, 76);

    // Portrait / Avatar
    g.save();
    this.roundRect(g, 60, 100, Wd - 120, 520, 22);
    g.clip();
    if (img) this.drawCover(g, img, 60, 100, Wd - 120, 520);
    else this.drawAvatar(g, card.name, 60, 100, Wd - 120, 520);
    g.restore();

    g.lineWidth = 5;
    g.strokeStyle = bd;
    this.roundRect(g, 60, 100, Wd - 120, 520, 22);
    g.stroke();

    // Name
    g.fillStyle = '#fff';
    g.font = '900 50px "Playfair Display", Georgia, serif';
    const yName = this.wrapText(g, card.name, Wd / 2, 688, Wd - 120, 56, 2);

    // Subtitle / Country / Target Role
    g.fillStyle = tierCols[0];
    g.font = '700 24px "Segoe UI", sans-serif';
    const countryLabel = card.countryId && card.countryId !== 'any'
      ? '  ·  ' + profileModel.getCountryLabel(card.countryId, lang)
      : '';
    const rolePrefix = card.targetRole ? `${card.targetRole}  ·  ` : '';
    g.fillText(`${rolePrefix}${card.birth} – ${card.death || t('present')}${countryLabel}`, Wd / 2, yName + 4);

    // Similarity Bar
    const by = yName + 36;
    g.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.roundRect(g, 60, by, Wd - 120, 26, 13);
    g.fill();

    g.fillStyle = bd;
    this.roundRect(g, 60, by, Math.max(26, (Wd - 120) * (card.score || 50) / 100), 26, 13);
    g.fill();

    g.fillStyle = '#fff';
    g.font = '700 22px "Segoe UI", sans-serif';
    g.fillText(`${t('holoSim')} ${card.score}%`, Wd / 2, by + 56);

    // Description
    g.fillStyle = 'rgba(255, 255, 255, 0.88)';
    g.font = 'italic 24px Georgia, serif';
    this.wrapText(g, card.desc, Wd / 2, by + 96, Wd - 140, 32, 2);

    // Cursed Item Badge
    g.setLineDash([9, 6]);
    g.lineWidth = 3;
    g.strokeStyle = tierCols[0];
    g.strokeRect(60, H - 190, Wd - 120, 104);
    g.setLineDash([]);

    g.fillStyle = '#fff';
    g.font = 'bold 22px "Segoe UI", sans-serif';
    this.wrapText(g, `🏺 ${story.itemName}`, Wd / 2, H - 154, Wd - 160, 28, 2);

    g.font = 'italic 19px Georgia, serif';
    g.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.wrapText(g, story.itemDesc, Wd / 2, H - 112, Wd - 160, 25, 2);

    // Footer
    g.fillStyle = 'rgba(255, 255, 255, 0.55)';
    g.font = '600 16px Orbitron, "Segoe UI", sans-serif';
    g.fillText('LIVE WIKIPEDIA GACHA', Wd / 2, H - 44);
  }

  // ==========================================================================
  // Export Modal Management
  // ==========================================================================
  async renderExport(entry, kind, profileModel) {
    if (!entry) return;
    this.expLoad.hidden = false;
    this.tabPaper.classList.toggle('on', kind === 'paper');
    this.tabHolo.classList.toggle('on', kind === 'holo');

    try {
      if (document.fonts && document.fonts.ready) {
        await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
      }
      const L = profileModel.lang;
      const img = await this.loadImage(entry.card.img);
      const story = entry.st[L] || entry.st.en;

      if (kind === 'paper') {
        this.drawPaper(this.expCanvas, entry, story, entry.card, img, L, profileModel);
      } else {
        this.drawHolo(this.expCanvas, entry, story, entry.card, img, L, profileModel);
      }
    } catch (err) {
      console.error(err);
      this.toast(profileModel.t('expFail'));
    }

    this.expLoad.hidden = true;
  }

  openExportModal(entry, kind, profileModel) {
    this.currentExportEntry = entry;
    this.currentExportKind = kind;
    if (!this.expDlg.open) this.expDlg.showModal();
    this.renderExport(entry, kind, profileModel);
  }

  async trackExportApi(cardId, userId) {
    if (!cardId) return null;
    try {
      const resp = await fetch('/api/track-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, userId })
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      console.warn('[CardView] track-export error:', err);
      return null;
    }
  }

  downloadExportCanvas(entry, kind, profileModel, onExportSuccess) {
    const targetEntry = entry || this.currentExportEntry;
    const targetKind = kind || this.currentExportKind || 'paper';
    if (!targetEntry) return;

    try {
      this.expCanvas.toBlob(blob => {
        if (!blob) {
          this.toast(profileModel.t('dlFail'));
          return;
        }
        const a = document.createElement('a');
        const cardName = ((targetEntry.card && targetEntry.card.name) || 'figure').replace(/\W+/g, '-').toLowerCase();
        a.href = URL.createObjectURL(blob);
        a.download = `wiki-gacha-${cardName}-${targetKind}.png`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);

        // Track export immediately after generating / downloading
        const cardId = targetEntry.card_id || targetEntry.id;
        const userId = profileModel && typeof profileModel.getUserId === 'function' ? profileModel.getUserId() : null;

        targetEntry.is_exported = true;
        targetEntry.isExported = true;

        if (profileModel && typeof profileModel.incrementTotalExports === 'function') {
          profileModel.incrementTotalExports(1);
        }

        this.trackExportApi(cardId, userId).catch(() => {});

        if (typeof onExportSuccess === 'function') {
          onExportSuccess(targetEntry);
        }
      }, 'image/png');
    } catch (e) {
      this.toast(profileModel.t('dlFail'));
    }
  }

  // ==========================================================================
  // Museum of Curiosities (Inventory) Modal & Gem Badge
  // ==========================================================================
  updateInventoryBadge(count) {
    if (this.invCountBadge) {
      this.invCountBadge.textContent = count;
    }
  }

  updateGemsBadge(gems) {
    if (this.gemCountBadge) {
      this.gemCountBadge.textContent = Number(gems) || 0;
    }
  }

  renderInventoryGrid(inventoryModel, profileModel, onOpenDetail) {
    const items = inventoryModel.getItems();
    const stats = inventoryModel.getStats();
    const t = k => profileModel.t(k);
    const L = profileModel.lang;

    this.invStats.textContent = items.length
      ? profileModel.t('invStats', { n: stats.total, r: stats.rare, m: stats.mid, c: stats.common })
      : t('invEmpty');

    this.invClear.hidden = !items.length;

    this.invGrid.replaceChildren(
      ...items.map(e => {
        const tile = document.createElement('div');
        tile.className = 'tile t-' + (e.card.tier || 'common');
        tile.onclick = () => onOpenDetail(e);

        const imgBox = document.createElement('div');
        imgBox.className = 'im';
        imgBox.style.background = this.getCardBackground(e.card);
        if (e.card.img) {
          const imTag = document.createElement('img');
          imTag.src = e.card.img;
          imTag.alt = e.card.name || '';
          imTag.referrerPolicy = 'no-referrer';
          imTag.style.width = '100%';
          imTag.style.height = '100%';
          imTag.style.objectFit = 'cover';
          imTag.onerror = async () => {
            await this.rescueImage(imTag, e.card);
            if (imTag.complete && imTag.naturalWidth > 0) return;
            imTag.remove();
            imgBox.textContent = this.initials(e.card.name);
          };
          imgBox.append(imTag);
        } else {
          this.renderCardImage(imgBox, e.card);
        }

        const textBox = document.createElement('div');
        textBox.className = 'tx';

        const bName = document.createElement('b');
        bName.textContent = e.card.name;

        const spItem = document.createElement('span');
        const s = e.st[L] || e.st.en;
        spItem.textContent = '🏺 ' + s.itemName;

        textBox.append(bName, spItem);

        // Render "📤 Đã xuất chia sẻ" badge if is_exported === true
        if (e.is_exported || e.isExported) {
          const exportBadge = document.createElement('div');
          exportBadge.className = 'export-badge';
          exportBadge.textContent = L === 'vi' ? '📤 Đã xuất chia sẻ' : '📤 Shared / Exported';
          textBox.append(exportBadge);
        }

        tile.append(imgBox, textBox);
        return tile;
      })
    );

    this.invList.hidden = false;
    this.invDetail.hidden = true;
  }

  renderInventoryDetail(entry, profileModel, onBack, onExport, onCopy) {
    const s = entry.st[profileModel.lang] || entry.st.en;
    const c = entry.card;
    const t = k => profileModel.t(k);

    this.invList.hidden = true;
    this.invDetail.hidden = false;

    const backBtn = document.createElement('button');
    backBtn.className = 'btn ghost';
    backBtn.type = 'button';
    backBtn.textContent = t('back');
    backBtn.onclick = onBack;

    const h2Headline = document.createElement('h2');
    h2Headline.style.cssText = 'font-family:var(--font-head);margin:12px 0 2px';
    h2Headline.textContent = s.headline;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'muted';
    metaDiv.textContent = `${c.name} · ${c.birth}–${c.death || t('present')} · ${t('r_' + c.tier)} · ${c.score}%`;

    if (entry.is_exported || entry.isExported) {
      const expBadge = document.createElement('span');
      expBadge.className = 'export-badge';
      expBadge.style.cssText = 'margin-left: 8px; vertical-align: middle;';
      expBadge.textContent = profileModel.lang === 'vi' ? '📤 Đã xuất chia sẻ' : '📤 Shared / Exported';
      metaDiv.append(expBadge);
    }

    const chapNodes = [s.ch1, s.ch2, s.ch3].map((chText, i) => {
      const art = document.createElement('div');
      art.className = 'chap';
      const h3 = document.createElement('h3');
      h3.textContent = t('ch' + (i + 1));
      const p = document.createElement('p');
      p.textContent = chText;
      art.append(h3, p);
      return art;
    });

    const itemBox = document.createElement('div');
    itemBox.className = 'itembox';
    const bCursed = document.createElement('b');
    bCursed.textContent = t('cursed') + ': ' + s.itemName;
    const descDiv = document.createElement('div');
    descDiv.className = 'muted';
    descDiv.textContent = s.itemDesc;
    itemBox.append(bCursed, descDiv);

    const acts = document.createElement('div');
    acts.className = 'acts';

    const btnPaper = document.createElement('button');
    btnPaper.className = 'btn';
    btnPaper.type = 'button';
    btnPaper.textContent = t('paperBtn');
    btnPaper.onclick = () => onExport('paper');

    const btnHolo = document.createElement('button');
    btnHolo.className = 'btn';
    btnHolo.type = 'button';
    btnHolo.textContent = t('holoBtn');
    btnHolo.onclick = () => onExport('holo');

    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn ghost';
    btnCopy.type = 'button';
    btnCopy.textContent = t('copyStory');
    btnCopy.onclick = onCopy;

    acts.append(btnPaper, btnHolo, btnCopy);

    this.invDetail.replaceChildren(backBtn, h2Headline, metaDiv, ...chapNodes, itemBox, acts);
  }

  showMultiPullModal(cards, profileModel, onSelectCard) {
    if (!this.multiPullDlg) return;

    this.multiPullGrid.replaceChildren(
      ...cards.map(card => {
        const tile = document.createElement('div');
        tile.className = 'tile t-' + (card.tier || 'common');
        tile.onclick = () => {
          this.multiPullDlg.close();
          onSelectCard(card);
        };

        const imgBox = document.createElement('div');
        imgBox.className = 'im';
        imgBox.style.background = this.getCardBackground(card);
        if (card.img) {
          const imTag = document.createElement('img');
          imTag.src = card.img;
          imTag.alt = card.name || '';
          imTag.referrerPolicy = 'no-referrer';
          imTag.style.width = '100%';
          imTag.style.height = '100%';
          imTag.style.objectFit = 'cover';
          imTag.onerror = async () => {
            await this.rescueImage(imTag, card);
            if (imTag.complete && imTag.naturalWidth > 0) return;
            imTag.remove();
            imgBox.textContent = this.initials(card.name);
          };
          imgBox.append(imTag);
        } else {
          this.renderCardImage(imgBox, card);
        }

        const textBox = document.createElement('div');
        textBox.className = 'tx';

        const bName = document.createElement('b');
        bName.textContent = card.name;

        const spMeta = document.createElement('span');
        const star = card.tier === 'rare' ? '★★★ (Covert)' : card.tier === 'mid' ? '★★ (Classified)' : '★ (Mil-Spec)';
        spMeta.textContent = `${star} · ${card.score}%`;

        textBox.append(bName, spMeta);
        tile.append(imgBox, textBox);
        return tile;
      })
    );

    if (this.multiPullClose) {
      this.multiPullClose.onclick = () => {
        this.multiPullDlg.close();
        if (cards.length) onSelectCard(cards[0]);
      };
    }

    if (!this.multiPullDlg.open) {
      this.multiPullDlg.showModal();
    }
  }
}

export default CardView;
