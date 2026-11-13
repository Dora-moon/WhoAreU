/**
 * @file StoryView.js
 * @description Renders Typing Effect Light-Novel, Dialogue Match Header,
 * Distinct Cartoon Story Panels, Glowing Butterfly Effect Cards,
 * Cursed Item acquisitions, and Story Action buttons.
 */

export class StoryView {
  constructor() {
    this.$ = s => document.querySelector(s);
    this.section = this.$('#storySec');
    this.loader = this.$('#storyLoader');
    this.dialogueHeader = this.$('#storyDialogueHeader');
    this.storyBody = this.$('#storyBody');
    this.choicesBox = this.$('#choices');
    this.choiceBtns = this.$('#choiceBtns');
    this.itemBox = this.$('#itemBox');
    this.afterStory = this.$('#afterStory');
    this.modeBadge = this.$('#modeBadge');
    this.btnSkipAnim = this.$('#btnSkipAnim');

    this.skipTyping = false;
    this.token = 0;

    // Skip typing on story body click
    if (this.storyBody) {
      this.storyBody.addEventListener('click', () => {
        this.skipTyping = true;
      });
    }

    // Skip typing on dedicated Skip button click
    if (this.btnSkipAnim) {
      this.btnSkipAnim.addEventListener('click', () => {
        this.skipTyping = true;
      });
    }
  }

  showSection() {
    this.section.hidden = false;
    this.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  hideSection() {
    this.section.hidden = true;
  }

  setLoading(isLoading, loadingText = '') {
    this.loader.hidden = !isLoading;
    if (loadingText) {
      const span = this.loader.querySelector('span:last-child');
      if (span) span.textContent = loadingText;
    }
  }

  setModeBadge(mode, modeOfflineText, modeLlmText) {
    this.modeBadge.textContent = mode === 'offline'
      ? modeOfflineText
      : modeLlmText.replace('{p}', mode);
  }

  resetStoryView() {
    this.token++;
    if (this.dialogueHeader) this.dialogueHeader.replaceChildren();
    this.storyBody.replaceChildren();
    this.choicesBox.hidden = true;
    this.itemBox.hidden = true;
    this.afterStory.hidden = true;
    this.skipTyping = false;
  }

  renderDialogueHeader(profileModel, targetCard) {
    if (!this.dialogueHeader || !targetCard || !profileModel) return;
    const t = k => profileModel.t(k);
    const L = profileModel.lang;

    const uName = profileModel.fields.uName || t('anon');
    const uRole = profileModel.getRoleLabel
      ? profileModel.getRoleLabel(profileModel.fields.uRole)
      : (t('role_' + profileModel.fields.uRole) || profileModel.fields.uRole);
    const uSkin = profileModel.fields.skin || '#c68642';
    const uAge = profileModel.fields.uAge || 25;
    const uInitials = (uName.slice(0, 2) || 'YO').toUpperCase();

    const tName = targetCard.name;
    const tTier = targetCard.tier || 'common';
    const tTierLabel = t('r_' + tTier);
    const tInitials = targetCard.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();

    let tAvatarBg = '';
    if (targetCard.img) {
      tAvatarBg = `background: url("${targetCard.img.replace(/"/g, '%22')}") center top / cover no-repeat;`;
    } else {
      let x = 0;
      for (const ch of targetCard.name) x = (x * 31 + ch.charCodeAt(0)) % 360;
      tAvatarBg = `background: linear-gradient(135deg, hsl(${x}, 65%, 45%), hsl(${(x + 50) % 360}, 65%, 25%));`;
    }

    this.dialogueHeader.innerHTML = `
      <div class="dialogue-panel-card">
        <!-- User Traveler Character Card -->
        <div class="char-card user-char">
          <div class="char-avatar user-avatar-circle" style="background-color: ${uSkin};">
            <span class="avatar-initials">${uInitials}</span>
          </div>
          <div class="char-meta">
            <span class="char-badge user-badge">${uRole}</span>
            <strong class="char-name">${uName}</strong>
            <span class="char-sub">${uAge} ${t('yearsOld')}</span>
          </div>
        </div>

        <!-- Cartoon VS Encounter Badge -->
        <div class="vs-encounter-badge">
          <span class="vs-ico">⚡</span>
          <span class="vs-text">${t('vs')}</span>
          <span class="vs-phase">ENCOUNTER</span>
        </div>

        <!-- Wikipedia Target Character Card -->
        <div class="char-card target-char">
          <div class="char-meta target-meta">
            <span class="char-badge target-badge t-${tTier}">${targetCard.targetRole ? targetCard.targetRole : tTierLabel}</span>
            <strong class="char-name">${tName}</strong>
            <span class="char-sub">${targetCard.birth}${targetCard.death ? ' – ' + targetCard.death : ''}</span>
          </div>
          <div class="char-avatar target-avatar-circle" style="${tAvatarBg}">
            ${targetCard.img ? `<img src="${targetCard.img}" alt="${tName}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.remove()">` : `<span class="avatar-initials">${tInitials}</span>`}
          </div>
        </div>
      </div>
    `;
    this.dialogueHeader.hidden = false;
  }

  // Sanitize fractional chapter numbers (e.g. 1.5 for interlude bridges)
  // so they never produce invalid CSS selectors like '#chap1.5'.
  _chapId(n) {
    return 'chap' + String(n).replace(/\./g, '_');
  }

  getChapterParagraph(n, chapterTitle) {
    const id = this._chapId(n);
    let art = document.getElementById(id);
    if (!art) {
      art = document.createElement('article');
      art.className = `chap-panel chap-panel-${n}`;
      art.id = id;

      const phaseIcons = { 1: '🌟', 2: '💥', 3: '🔮' };

      const head = document.createElement('div');
      head.className = 'chap-panel-head';

      const pill = document.createElement('div');
      pill.className = `chap-panel-pill pill-ch-${n}`;

      const numSpan = document.createElement('span');
      numSpan.className = 'chap-num-tag';
      numSpan.textContent = `CH.0${n}`;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'chap-icon-tag';
      iconSpan.textContent = phaseIcons[n] || '📜';

      pill.append(numSpan, iconSpan);

      const h3 = document.createElement('h3');
      h3.className = 'chap-panel-title';
      h3.dataset.ch = n;
      h3.textContent = chapterTitle;

      head.append(pill, h3);

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'chap-panel-body';

      const bubble = document.createElement('div');
      bubble.className = 'chap-panel-bubble';

      const p = document.createElement('p');
      p.className = 'chap-text';

      bubble.append(p);
      bodyDiv.append(bubble);
      art.append(head, bodyDiv);
      this.storyBody.append(art);
    }
    return art.querySelector('.chap-text') || art.querySelector('p');
  }

  typeIntoElement(el, fullText, currentTok) {
    return new Promise(resolve => {
      let i = 0;
      let lastTime = performance.now();

      const step = now => {
        if (currentTok !== this.token) {
          resolve();
          return;
        }
        if (this.skipTyping) {
          el.textContent = fullText;
          resolve();
          return;
        }

        const elapsed = now - lastTime;
        if (elapsed >= 25) {
          // Exactly 25ms per character RPG typewriter effect
          const charsToAdd = Math.max(1, Math.floor(elapsed / 25));
          i = Math.min(fullText.length, i + charsToAdd);
          lastTime = now - (elapsed % 25);
          el.textContent = fullText.slice(0, i);
        }

        if (i < fullText.length) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  async typeChapter(n, title, text) {
    const curTok = this.token;
    const p = this.getChapterParagraph(n, title);
    p.classList.add('typing');

    await this.typeIntoElement(p, text, curTok);

    p.classList.remove('typing');
    if (curTok === this.token) {
      p.textContent = text;
    }
  }

  renderChoices(choices, onChoose, selectedIndex = -1, targetCard = null) {
    this.choicesBox.hidden = false;
    const letterCodes = ['A', 'B', 'C', 'D'];
    this.choiceBtns.replaceChildren(
      ...choices.map((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-glowing-card' + (selectedIndex === i ? ' sel' : '');
        btn.type = 'button';
        if (selectedIndex >= 0) btn.disabled = true;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'choice-card-head';

        const badge = document.createElement('span');
        badge.className = 'choice-card-badge';
        badge.textContent = `CHOICE ${letterCodes[i] || (i + 1)}`;

        const ico = document.createElement('span');
        ico.className = 'choice-card-ico';
        ico.textContent = '🦋';

        headerDiv.append(badge, ico);

        const textDiv = document.createElement('div');
        textDiv.className = 'choice-card-text';
        textDiv.textContent = c.text;

        const glowRim = document.createElement('div');
        glowRim.className = 'choice-card-glow';

        // Corner avatar (64px framed portrait beside the dialogue choice)
        if (targetCard && targetCard.img) {
          const avatar = document.createElement('div');
          avatar.className = 'choice-corner-avatar';
          const img = document.createElement('img');
          img.src = targetCard.img;
          img.alt = targetCard.name || '';
          img.referrerPolicy = 'no-referrer';
          img.style.width = '64px';
          img.style.height = '64px';
          img.style.objectFit = 'cover';
          img.style.objectPosition = 'center 20%';
          img.style.borderRadius = '50%';
          img.style.border = '2px solid var(--gold, #ffd700)';
          img.onerror = () => avatar.remove();
          avatar.appendChild(img);
          btn.appendChild(avatar);
        }

        btn.append(headerDiv, textDiv, glowRim);
        if (onChoose) {
          btn.onclick = () => onChoose(i);
        }
        return btn;
      })
    );
  }

  // Single-paragraph opening intro (3-4 sentences max) rendered above the
  // dialogue header. Falls back gracefully if no intro is supplied.
  renderIntro(introText, targetCard = null) {
    if (!introText) return;
    const intro = document.createElement('div');
    intro.className = 'story-intro';
    intro.innerHTML = `<p>${String(introText).replace(/[<>&]/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;'
    }[c]))}</p>`;

    if (targetCard && targetCard.img) {
      const avatar = document.createElement('div');
      avatar.className = 'intro-corner-avatar';
      const img = document.createElement('img');
      img.src = targetCard.img;
      img.alt = targetCard.name || '';
      img.referrerPolicy = 'no-referrer';
      img.style.width = '72px';
      img.style.height = '72px';
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center 20%';
      img.style.borderRadius = '50%';
      img.style.border = '2px solid var(--gold, #ffd700)';
      img.onerror = () => avatar.remove();
      avatar.appendChild(img);
      intro.appendChild(avatar);
    }

    this.storyBody.prepend(intro);
  }

  showCursedItem(item, labelTitle) {
    this.itemBox.hidden = false;
    const bTitle = document.createElement('b');
    bTitle.textContent = labelTitle + ': ';

    const bName = document.createElement('b');
    bName.style.color = 'var(--ink-contrast)';
    bName.textContent = item.name;

    const divDesc = document.createElement('div');
    divDesc.className = 'muted';
    divDesc.style.marginTop = '4px';
    divDesc.textContent = item.desc;

    this.itemBox.replaceChildren(bTitle, bName, divDesc);
  }

  showAfterStoryActions() {
    this.afterStory.hidden = false;
  }

  bindStoryActions({ onPaper, onHolo, onCopy, onAgain }) {
    this.$('#btnPaper').onclick = onPaper;
    this.$('#btnHolo').onclick = onHolo;
    this.$('#btnCopy').onclick = onCopy;
    this.$('#btnAgain').onclick = onAgain;
  }
}

export default StoryView;
