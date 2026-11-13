/**
 * @file StoryController.js
 * @description Manages story generation triggers, LLM vs Offline mode orchestration,
 * typewriter chapters playback, Butterfly Effect choices, Mini-Games (rarity-scaled),
 * Cursed Items awards, Gem rewards with DB sync, and Museum of Curiosities integration.
 */

import { STORY_TONE_CONFIG } from '../models/StoryModel.js';

export class StoryController {
  constructor({ userProfileModel, storyModel, inventoryModel, storyView, cardView, audioView, miniGameView }) {
    this.userProfileModel = userProfileModel;
    this.storyModel = storyModel;
    this.inventoryModel = inventoryModel;
    this.storyView = storyView;
    this.cardView = cardView;
    this.audioView = audioView;
    this.miniGameView = miniGameView;

    this.currentCard = null;
    this.lastInput = null;
    this.currentStory = null;
    this.currentMode = 'offline';
    this.currentStage = 0;
    this.currentChoiceIndex = -1;
    this.isStoryBusy = false;
    this.currentChapter = 0;
    this.totalChapters = 0;
    this.chapterResults = []; // track mini-game results per chapter

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
    this.currentChapter = 0;
    this.totalChapters = 0;
    this.chapterResults = [];
  }

  // Determine number of chapters based on card rarity
  // Common=1, Mid=2, Rare=3, Mythic=4
  _getTotalChapters(tier) {
    const t = (tier || 'common').toLowerCase();
    if (t === 'myth' || t === 'mythic') return 4;
    if (t === 'rare') return 3;
    if (t === 'mid') return 2;
    return 1; // common
  }

  // Map chapter index to mini-game key (cycles through 6 games)
  _getMiniGameForChapter(chapterIdx) {
    const games = [
      'dino_runner',
      'green_zone_timing',
      'puzzle_unlock',
      'rhythm_catcher',
      'mash_clash',
      'lockpick_dial'
    ];
    return games[chapterIdx % games.length];
  }

  // Gem rewards by rarity (critical success bonus)
  _getGemReward(tier, perfect) {
    const base = {
      common: 100,
      mid: 200,
      rare: 350,
      myth: 500,
      mythic: 500
    };
    const t = (tier || 'common').toLowerCase();
    const reward = base[t] || base.common;
    return perfect ? reward * 2 : reward; // double for perfect
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
    this.currentChapter = 0;
    this.totalChapters = this._getTotalChapters(this.currentCard.tier);
    this.chapterResults = [];

    const inp = this.lastInput || this.userProfileModel.getInputs();

    try {
      const { story, mode, context } = await this.storyModel.generateStory(
        this.currentCard,
        inp,
        this.userProfileModel
      );
      this.currentStory = story;
      this.currentMode = mode;
      this.currentContext = context; // store for tone, etc.
    } catch (err) {
      console.error('Story generation error:', err);
      this.cardView.toast(t('llmFail'));
      this.isStoryBusy = false;
      return;
    } finally {
      this.storyView.setLoading(false);
    }

    this.storyView.setModeBadge(this.currentMode, t('modeOff'), t('modeLLM'));
    this.audioView.chime();

    const L = this.userProfileModel.lang;
    const localizedStory = this.currentStory[L] || this.currentStory.en;

    // Render the 1-paragraph concise intro with corner avatar
    if (localizedStory.intro) {
      this.storyView.renderIntro(localizedStory.intro, this.currentCard);
    }

    // Begin the chapter loop
    await this._playNextChapter(localizedStory);
  }

  async _playNextChapter(localizedStory) {
    if (this.currentChapter >= this.totalChapters) {
      // All chapters done → show choices
      await this._showChoices(localizedStory);
      return;
    }

    this.currentStage = this.currentChapter + 1; // stages 1..totalChapters
    this.isStoryBusy = true;

    const t = k => this.userProfileModel.t(k);
    const chapterLabel = t('ch' + this.currentStage) || `Chapter ${this.currentStage}`;

    // Each chapter has its own narrative text from the story
    // For chapters beyond the base 2, we generate continuation text
    let chapterText = '';
    if (this.currentStage === 1) {
      chapterText = localizedStory.ch1;
    } else if (this.currentStage === 2) {
      chapterText = localizedStory.ch2;
    } else {
      // Chapters 3+ (for Rare/Mythic) - generate continuation based on tone
      chapterText = this._generateContinuationChapter(localizedStory, this.currentStage);
    }

    // Type the chapter
    await this.storyView.typeChapter(this.currentStage, chapterLabel, chapterText);
    this.audioView.chime();

    // After each chapter except the last, play a mini-game
    if (this.currentChapter < this.totalChapters - 1) {
      const gameKey = this._getMiniGameForChapter(this.currentChapter);
      const gameResult = await this._playMiniGame(gameKey);
      this.chapterResults.push(gameResult);

      // Brief narrative bridge based on mini-game result
      const bridgeText = this._generateBridgeText(gameResult, this.currentChapter + 1);
      await this.storyView.typeChapter(
        this.currentStage + 0.5,
        t('bridge') || 'Interlude',
        bridgeText
      );
    }

    this.currentChapter++;
    this.isStoryBusy = false;
    await this._playNextChapter(localizedStory);
  }

  _generateContinuationChapter(localizedStory, stage) {
    const tone = this.currentContext?.tone || 'comedy';
    const toneConfig = STORY_TONE_CONFIG[tone] || STORY_TONE_CONFIG.comedy;
    // Fallback simple continuations
    const continuations = {
      comedy: [
        'The chaos deepens. A sentient toaster offers {t} a bagel that tastes like prophecy.',
        'A time-travelling pigeon drops a cryptic note: "The future is flaky."',
        'The timeline hiccups again — three {t}\'s appear, all arguing about pizza toppings.'
      ],
      epic: [
        'The storm gathers. {t} stands at the crossroads of destiny, the weight of ages upon their shoulders.',
        'Ancient runes flare to life. The path to {ev} burns bright with celestial fire.',
        'The heavens themselves lean down to witness the climax of this legendary tale.'
      ],
      tragic: [
        'A cold wind whispers through the corridors of time. {t} feels the price of what must come.',
        'Shadows lengthen. The choice made echoes in chambers no living soul has entered.',
        'The final hour approaches. Sacrifice is not a word — it is the only currency left.'
      ],
      mystery: [
        'A single clue surfaces: a torn page, a whispered name, a locked drawer.',
        'The pieces align. Someone has been pulling strings from outside the timeline.',
        'The truth waits in the dark. One question remains: who benefits from the lie?'
      ]
    };
    const arr = continuations[tone] || continuations.comedy;
    return arr[(stage - 3) % arr.length]
      .replace('{t}', localizedStory.choices[0]?.text?.split(' ')[0] || 'the target')
      .replace('{ev}', 'the defining moment');
  }

  _generateBridgeText(gameResult, chapterNum) {
    const t = k => this.userProfileModel.t(k);
    // Use the mission-specific consequences if available
    if (gameResult.success) {
      if (gameResult.perfect && gameResult.winConsequence) {
        return gameResult.winConsequence;
      }
      if (gameResult.winConsequence) {
        return gameResult.winConsequence;
      }
      return t('bridgePerfect') || `Flawless! The challenge was met with uncanny precision. The timeline shivers with approval.`;
    } else {
      if (gameResult.loseConsequence) {
        return gameResult.loseConsequence;
      }
      return t('bridgeFail') || `The attempt falters. But failure is merely a detour — the story finds another way.`;
    }
  }

  // Generate mission-specific context for the mini-game based on character lore,
  // player's choice, and narrative action
  _generateMiniGameContext(gameKey, chapterIndex, localizedStory) {
    const c = this.currentCard;
    const inp = this.lastInput || {};
    const tone = this.currentContext?.tone || 'comedy';
    const toneConfig = STORY_TONE_CONFIG[tone] || STORY_TONE_CONFIG.comedy;
    const targetName = c.name;
    const targetRole = c.targetRole || c.desc || 'Historical Figure';
    const targetEvent = c.ev?.vi || c.ev?.en || c.desc || 'their defining moment';
    const userName = inp.name || this.userProfileModel.t('anon');
    const userRole = this.userProfileModel.getRoleLabel?.(inp.roleKey) || inp.roleKey || 'Advisor';

    // Map game keys to narrative actions
    const actionMap = {
      dino_runner: {
        verb: 'fleeing',
        vn: 'trốn thoát',
        scenario: 'a desperate chase through the annals of time'
      },
      green_zone_timing: {
        verb: 'dueling',
        vn: 'đấu quyết',
        scenario: 'a moment of perfect timing that alters fate'
      },
      puzzle_unlock: {
        verb: 'deciphering',
        vn: 'giải mã',
        scenario: 'an ancient code holding the key to history'
      },
      rhythm_catcher: {
        verb: 'catching',
        vn: 'hứng nhận',
        scenario: 'falling fragments of destiny itself'
      },
      mash_clash: {
        verb: 'overpowering',
        vn: 'đè bẹp',
        scenario: 'a gate that bars the path to legend'
      },
      lockpick_dial: {
        verb: 'picking',
        vn: 'mở khóa',
        scenario: 'a vault sealing the secret of an era'
      }
    };

    const action = actionMap[gameKey] || actionMap.dino_runner;
    const isVn = this.userProfileModel.lang === 'vi';

    // Get the player's last choice text for context
    const lastChoice = this.currentChoiceIndex >= 0 && localizedStory.choices[this.currentChoiceIndex]
      ? localizedStory.choices[this.currentChoiceIndex].text
      : '';

    // Build mission title - references character's real achievement + player's choice
    let missionTitle, objectiveHint, winConsequence, loseConsequence;

    if (isVn) {
      missionTitle = `${action.vn.charAt(0).toUpperCase() + action.vn.slice(1)} ${action.scenario} cùng ${targetName}`;
      objectiveHint = `Thành công: ${targetName} ${action.vn} ${action.scenario}, thay đổi dòng chảy của ${targetEvent}. Thất bại: Lịch sử đi theo bản chất, ${userName} chỉ là người quan sát.`;
      winConsequence = `Nhờ ${userName} (${userRole}) ${action.vn} thành công, ${targetName} đã ${action.vn} ${action.scenario} — này chính là chìa khóa dẫn tới ${targetEvent}.`;
      loseConsequence = `Dù ${userName} nỗ lực ${action.vn}, ${targetName} vẫn phải đối mặt với ${targetEvent} một mình. Lịch sử không thay đổi.`;
    } else {
      missionTitle = `${action.verb.charAt(0).toUpperCase() + action.verb.slice(1)} ${action.scenario} with ${targetName}`;
      objectiveHint = `Success: ${targetName} ${action.verb}s ${action.scenario}, altering the course of ${targetEvent}. Failure: History takes its course, ${userName} remains but a witness.`;
      winConsequence = `Thanks to ${userName} (${userRole}) ${action.verb}ing successfully, ${targetName} ${action.verb}d ${action.scenario} — this was the key that led to ${targetEvent}.`;
      loseConsequence = `Despite ${userName}'s efforts ${action.verb}ing, ${targetName} faced ${targetEvent} alone. History remains unchanged.`;
    }

    return {
      missionTitle,
      objectiveHint,
      characterImg: c.img,
      winConsequence,
      loseConsequence,
      gameKey,
      chapterIndex
    };
  }

  async _playMiniGame(gameKey) {
    const ctx = this._generateMiniGameContext(gameKey, this.currentChapter, this.currentStory[this.userProfileModel.lang] || this.currentStory.en);

    return new Promise(resolve => {
      this.miniGameView.start(gameKey, {
        missionTitle: ctx.missionTitle,
        objectiveHint: ctx.objectiveHint,
        characterImg: ctx.characterImg,
        winConsequence: ctx.winConsequence,
        loseConsequence: ctx.loseConsequence,
        onComplete: (result) => {
          // Attach consequence text to result for narrative bridge
          result.winConsequence = ctx.winConsequence;
          result.loseConsequence = ctx.loseConsequence;
          result.missionTitle = ctx.missionTitle;
          resolve(result);
        },
        onSkip: () => resolve({ success: false, score: 0, perfect: false, skipped: true })
      });
    });
  }

  async _showChoices(localizedStory) {
    const t = k => this.userProfileModel.t(k);

    // Render Butterfly Effect choices with corner avatars
    this.storyView.renderChoices(
      localizedStory.choices,
      i => this.handleChoiceSelection(i),
      -1,
      this.currentCard
    );
    this.isStoryBusy = false;
  }

  async handleChoiceSelection(choiceIndex) {
    if (this.currentChoiceIndex >= 0 || !this.currentStory) return;
    this.currentChoiceIndex = choiceIndex;
    this.currentStage = this.totalChapters + 1; // final stage

    const t = k => this.userProfileModel.t(k);
    const L = this.userProfileModel.lang;
    const localizedStory = this.currentStory[L] || this.currentStory.en;
    const chosen = localizedStory.choices[choiceIndex];

    this.storyView.renderChoices(localizedStory.choices, null, choiceIndex, this.currentCard);
    this.audioView.chime();

    // Type Chapter 3 (the chosen path's outcome)
    await this.storyView.typeChapter(this.currentStage, t('ch3'), chosen.ch3);

    // Reveal Cursed Item
    this.storyView.showCursedItem(chosen.item, t('itemGot'));

    // Create entry and add to inventory
    const entry = this.createEntryFromCurrentStory();
    this.inventoryModel.addItem(entry);
    this.cardView.updateInventoryBadge(this.inventoryModel.getCount());

    // Calculate gem reward based on mini-game performance + rarity
    const tier = this.currentCard.tier || 'common';
    const perfectCount = this.chapterResults.filter(r => r.perfect).length;
    const totalMiniGames = this.chapterResults.length;
    const allPerfect = totalMiniGames > 0 && perfectCount === totalMiniGames;
    const anyPerfect = perfectCount > 0;

    // Determine reward tier
    let gemReward = 0;
    let rewardType = 'base';
    if (allPerfect && totalMiniGames > 0) {
      gemReward = this._getGemReward(tier, true);
      rewardType = 'perfect';
    } else if (anyPerfect) {
      gemReward = this._getGemReward(tier, false) + 50; // partial bonus
      rewardType = 'partial';
    } else if (totalMiniGames > 0) {
      // Base completion reward (smaller)
      const baseRewards = { common: 25, mid: 50, rare: 75, myth: 100, mythic: 100 };
      gemReward = baseRewards[(tier || 'common').toLowerCase()] || 25;
      rewardType = 'completion';
    }

    if (gemReward > 0) {
      this.userProfileModel.addGems(gemReward);
      this.cardView.toast(`${t('gemReward') || 'Gem reward'}: +${gemReward} 💎 (${rewardType})`);
      // Sync to Neon DB via POST /api/sync-state
      try {
        await this.userProfileModel.syncStateToRemote();
      } catch (e) {
        console.warn('[StoryController] Gem sync failed:', e);
      }
      this.audioView.win(rewardType === 'perfect' ? 'rare' : 'mid');
    } else {
      this.audioView.win('mid');
    }

    // Show after-story buttons
    this.storyView.showAfterStoryActions();

    // Trigger celebration effects
    this.cardView.confetti(70, ['#ffd700', '#fff', '#ff007f']);
    this.cardView.toast(t('saved'));
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
        intro: s.intro || '',
        ch1: s.ch1,
        ch2: s.ch2,
        ch3: ch.ch3,
        choice: ch.text,
        itemName: ch.item.name,
        itemDesc: ch.item.desc || '',
        chapterResults: this.chapterResults.map(r => ({
          success: r.success,
          perfect: r.perfect,
          score: r.score
        }))
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

    // Re-render intro
    if (localizedStory.intro) {
      this.storyView.renderIntro(localizedStory.intro, this.currentCard);
    }

    for (let n = 1; n <= this.currentStage; n++) {
      const p = this.storyView.getChapterParagraph(n, t('ch' + n));
      let text = '';
      if (n === 1) text = localizedStory.ch1;
      else if (n === 2) text = localizedStory.ch2;
      else if (n <= this.totalChapters) text = this._generateContinuationChapter(localizedStory, n);
      else text = localizedStory.choices[this.currentChoiceIndex]?.ch3 || '';
      p.textContent = text;
    }

    if (this.currentStage >= 2 && this.currentChoiceIndex < 0) {
      this.storyView.renderChoices(
        localizedStory.choices,
        i => this.handleChoiceSelection(i),
        -1,
        this.currentCard
      );
    } else if (this.currentChoiceIndex >= 0) {
      this.storyView.renderChoices(
        localizedStory.choices,
        null,
        this.currentChoiceIndex,
        this.currentCard
      );
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