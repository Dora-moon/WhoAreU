/**
 * @file StoryController.js
 * @description Manages story generation triggers, LLM vs Offline mode orchestration,
 * typewriter chapters playback, Butterfly Effect choices, Cursed Items awards,
 * and Museum of Curiosities integration.
 */

export class StoryController {
  constructor({ userProfileModel, storyModel, inventoryModel, storyView, cardView, audioView }) {
    this.userProfileModel = userProfileModel;
    this.storyModel = storyModel;
    this.inventoryModel = inventoryModel;
    this.storyView = storyView;
    this.cardView = cardView;
    this.audioView = audioView;

    this.currentCard = null;
    this.lastInput = null;
    this.currentStory = null;
    this.currentMode = 'offline';
    this.currentStage = 0;
    this.currentChoiceIndex = -1;
    this.isStoryBusy = false;

    this.init();
  }

  init() {
    this.cardView.btnWeave.onclick = () => this.handleWeave();
    this.storyView.bindStoryActions({
      onPaper: () => this.handleOpenExport('paper'),
      onHolo: () => this.handleOpenExport('holo'),
      onCopy: () => this.handleCopyCurrentStory(),
      onAgain: () => this.handleWeave()
    });
  }

  setCurrentCard(card, input) {
    this.currentCard = card;
    this.lastInput = input;
  }

  hideStory() {
    this.storyView.hideSection();
    this.currentStory = null;
    this.currentStage = 0;
    this.currentChoiceIndex = -1;
  }

  async handleWeave() {
    if (this.isStoryBusy || !this.currentCard) return;
    this.isStoryBusy = true;
    this.audioView.init();

    const t = k => this.userProfileModel.t(k);

    this.storyView.showSection();
    this.storyView.resetStoryView();
    this.storyView.renderDialogueHeader(this.userProfileModel, this.currentCard);
    this.storyView.setLoading(true, t('loading'));

    this.currentStory = null;
    this.currentStage = 0;
    this.currentChoiceIndex = -1;

    const inp = this.lastInput || this.userProfileModel.getInputs();

    try {
      const { story, mode } = await this.storyModel.generateStory(
        this.currentCard,
        inp,
        this.userProfileModel
      );
      this.currentStory = story;
      this.currentMode = mode;
    } catch (err) {
      console.error('Story generation error:', err);
      this.cardView.toast(t('llmFail'));
      return;
    } finally {
      this.storyView.setLoading(false);
    }

    this.storyView.setModeBadge(this.currentMode, t('modeOff'), t('modeLLM'));
    this.audioView.chime();

    const L = this.userProfileModel.lang;
    const localizedStory = this.currentStory[L] || this.currentStory.en;

    // Type Chapter 1
    this.currentStage = 1;
    await this.storyView.typeChapter(1, t('ch1'), localizedStory.ch1);

    // Type Chapter 2
    this.currentStage = 2;
    await this.storyView.typeChapter(2, t('ch2'), localizedStory.ch2);

    // Render Butterfly Effect Choices
    this.storyView.renderChoices(localizedStory.choices, i => this.handleChoiceSelection(i));
    this.isStoryBusy = false;
  }

  async handleChoiceSelection(choiceIndex) {
    if (this.currentChoiceIndex >= 0 || !this.currentStory) return;
    this.currentChoiceIndex = choiceIndex;
    this.currentStage = 3;

    const t = k => this.userProfileModel.t(k);
    const L = this.userProfileModel.lang;
    const localizedStory = this.currentStory[L] || this.currentStory.en;
    const chosen = localizedStory.choices[choiceIndex];

    this.storyView.renderChoices(localizedStory.choices, null, choiceIndex);
    this.audioView.chime();

    // Type Chapter 3
    await this.storyView.typeChapter(3, t('ch3'), chosen.ch3);

    // Reveal Cursed Item
    this.storyView.showCursedItem(chosen.item, t('itemGot'));

    // Create entry and add to inventory
    const entry = this.createEntryFromCurrentStory();
    this.inventoryModel.addItem(entry);
    this.cardView.updateInventoryBadge(this.inventoryModel.getCount());

    // Show after-story buttons
    this.storyView.showAfterStoryActions();

    // Trigger celebration effects
    this.cardView.confetti(70, ['#ffd700', '#fff', '#ff007f']);
    this.cardView.toast(t('saved'));
    this.audioView.win('mid');
  }

  createEntryFromCurrentStory() {
    const c = this.currentCard;
    const choiceIdx = this.currentChoiceIndex;
    const st = {};

    for (const lang of ['en', 'vi']) {
      const s = this.currentStory[lang] || this.currentStory.en;
      const ch = s.choices[choiceIdx];
      st[lang] = {
        headline: s.headline,
        ch1: s.ch1,
        ch2: s.ch2,
        ch3: ch.ch3,
        choice: ch.text,
        itemName: ch.item.name,
        itemDesc: ch.item.desc || ''
      };
    }

    const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

    return {
      id: Date.now().toString(36) + rnd(100, 999),
      ts: Date.now(),
      card: {
        name: c.name,
        birth: c.birth,
        death: c.death,
        countryId: c.countryId,
        desc: c.desc,
        summary: (c.summary || '').slice(0, 420),
        img: c.img,
        url: c.url,
        urlVi: c.urlVi,
        tier: c.tier || 'common',
        score: c.score || 50,
        source: c.source
      },
      st,
      absurd: this.lastInput ? this.lastInput.absurd : 50
    };
  }

  getCurrentEntry() {
    if (this.currentChoiceIndex < 0 || !this.currentStory) return null;
    const items = this.inventoryModel.getItems();
    if (items.length && items[0].card.name === this.currentCard.name) {
      return items[0];
    }
    return this.createEntryFromCurrentStory();
  }

  handleOpenExport(kind) {
    const entry = this.getCurrentEntry();
    if (entry) {
      this.cardView.openExportModal(entry, kind, this.userProfileModel);
    }
  }

  async handleCopyCurrentStory() {
    const entry = this.getCurrentEntry();
    if (!entry) return;
    const text = this.inventoryModel.formatEntryText(
      entry,
      this.userProfileModel.lang,
      this.userProfileModel.t('present')
    );
    const ok = await this.inventoryModel.copyText(text);
    this.cardView.toast(ok ? this.userProfileModel.t('copied') : this.userProfileModel.t('copyFail'));
  }

  reRenderStoryOnLanguageChange() {
    if (!this.currentStory) return;
    const t = k => this.userProfileModel.t(k);
    const L = this.userProfileModel.lang;
    const localizedStory = this.currentStory[L] || this.currentStory.en;

    this.storyView.resetStoryView();
    this.storyView.renderDialogueHeader(this.userProfileModel, this.currentCard);

    for (let n = 1; n <= this.currentStage; n++) {
      const p = this.storyView.getChapterParagraph(n, t('ch' + n));
      const text = n === 1
        ? localizedStory.ch1
        : n === 2
        ? localizedStory.ch2
        : localizedStory.choices[this.currentChoiceIndex].ch3;
      p.textContent = text;
    }

    if (this.currentStage >= 2) {
      this.storyView.renderChoices(
        localizedStory.choices,
        i => this.handleChoiceSelection(i),
        this.currentChoiceIndex
      );
    }

    if (this.currentStage >= 3 && this.currentChoiceIndex >= 0) {
      this.storyView.showCursedItem(
        localizedStory.choices[this.currentChoiceIndex].item,
        t('itemGot')
      );
      this.storyView.showAfterStoryActions();
    }

    this.storyView.setModeBadge(this.currentMode, t('modeOff'), t('modeLLM'));
  }
}

export default StoryController;
