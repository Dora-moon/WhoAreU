/**
 * @file GachaController.js
 * @description Handles spin clicks, candidate pool fetching, similarity calculation,
 * CS:GO roulette roll timing, pity updates, and outcome dispatching.
 */

import { WIN_INDEX } from '../models/GachaModel.js';

export class GachaController {
  constructor({ userProfileModel, wikipediaModel, gachaModel, rouletteView, cardView, audioView, storyController }) {
    this.userProfileModel = userProfileModel;
    this.wikipediaModel = wikipediaModel;
    this.gachaModel = gachaModel;
    this.rouletteView = rouletteView;
    this.cardView = cardView;
    this.audioView = audioView;
    this.storyController = storyController;

    this.isBusy = false;
    this.currentCard = null;
    this.lastInput = null;

    this.init();
  }

  init() {
    if (this.rouletteView.pullBtn) {
      this.rouletteView.pullBtn.onclick = () => this.handlePull();
    }
    if (this.rouletteView.pull10xBtn) {
      this.rouletteView.pull10xBtn.onclick = () => this.handleMultiPull(10);
    }
    this.renderInitialPity();
    this.renderIdleWheel();
  }

  renderInitialPity() {
    const t = k => this.userProfileModel.t(k);
    this.rouletteView.renderPity(
      this.gachaModel.getPity(),
      10,
      this.gachaModel.isPityGuaranteed(),
      t('pityL'),
      t('pityGuar')
    );
  }

  renderIdleWheel() {
    const idleCards = this.gachaModel.idleWheel(this.wikipediaModel.offlinePool(500, 2026));
    this.rouletteView.renderTrack(idleCards);
  }

  async handlePull() {
    if (this.isBusy) return;

    const spinCost = 160;
    if (this.userProfileModel.getGems() < spinCost) {
      this.cardView.toast(this.userProfileModel.t('notEnoughGems', { cost: spinCost }));
      return;
    }

    this.isBusy = true;
    this.audioView.init();

    // Deduct gems and increment spin counter
    this.userProfileModel.deductGems(spinCost);
    this.userProfileModel.incrementTotalSpins(1);
    this.cardView.updateGemsBadge(this.userProfileModel.getGems());

    const t = (k, v) => this.userProfileModel.t(k, v);

    this.rouletteView.setPulling(true);
    this.cardView.hideResultCard();
    this.storyController.hideStory();
    this.currentCard = null;

    const inp = this.userProfileModel.getInputs();
    this.lastInput = inp;

    this.rouletteView.setStatus(t('st_search'), true);

    let pool = [];
    let isLiveWikipedia = true;

    try {
      pool = await this.wikipediaModel.fetchPool(inp);
    } catch (err) {
      isLiveWikipedia = false;
    }

    if (pool.length < 24) {
      const existingNames = new Set(pool.map(c => c.name));
      const minYear = inp.selectedMinYear || this.userProfileModel.getBirthYear();
      this.wikipediaModel.offlinePool(minYear, 2026).forEach(c => {
        if (!existingNames.has(c.name) && this.wikipediaModel.isFigureInTimeframe(c, minYear, 2026)) {
          c.selectedMinYear = minYear;
          pool.push(c);
        }
      });
    }

    // Score all candidates
    pool.forEach(c => {
      const sc = this.wikipediaModel.score(c, inp);
      c.score = sc.total;
      c.parts = sc.parts;
      c.tier = sc.tier;
    });

    this.rouletteView.setStatus(
      isLiveWikipedia ? t('st_found', { n: pool.length }) : t('st_offline'),
      true
    );

    await new Promise(r => setTimeout(r, 450));

    // Build the 80-card wheel strip
    const forceRare = this.gachaModel.isPityGuaranteed();
    const { list, winner } = this.gachaModel.buildWheel(pool, forceRare);

    this.rouletteView.renderTrack(list);
    this.rouletteView.setStatus(t('st_spin'), true);

    // Run decelerating roll animation
    await this.rouletteView.spinTo(WIN_INDEX, progress => {
      this.audioView.tick(progress);
    });

    // Mark winner on track
    this.rouletteView.highlightWinner(WIN_INDEX);

    // Update pity system
    this.gachaModel.recordWinnerTier(winner.tier);
    this.renderInitialPity();

    // Trigger audio fanfare and screen effects
    this.audioView.win(winner.tier);
    if (winner.tier !== 'common') {
      const colors = winner.tier === 'rare'
        ? ['#ffd700', '#eb4b4b', '#fff', '#ff9d00']
        : ['#d32ce6', '#8847ff', '#ff007f', '#fff'];
      this.cardView.confetti(winner.tier === 'rare' ? 260 : 130, colors);
    }
    this.rouletteView.triggerScreenEffects(winner.tier);

    this.currentCard = winner;
    await new Promise(r => setTimeout(r, 500));

    // Pre-calculate clean Wikipedia dossier
    winner.dossier = this.wikipediaModel.buildDossier(winner, this.userProfileModel.lang, this.userProfileModel);

    // Show result card
    this.cardView.showResultCard(winner, this.userProfileModel);
    this.storyController.setCurrentCard(winner, inp);

    this.rouletteView.setStatus(t('st_idle'), false);
    this.rouletteView.setPulling(false);
    this.isBusy = false;
  }

  async handleMultiPull(count = 10) {
    if (this.isBusy) return;

    const multiCost = count * 160;
    if (this.userProfileModel.getGems() < multiCost) {
      this.cardView.toast(this.userProfileModel.t('notEnoughGems', { cost: multiCost }));
      return;
    }

    this.isBusy = true;
    this.audioView.init();

    // Deduct gems and increment spin counter
    this.userProfileModel.deductGems(multiCost);
    this.userProfileModel.incrementTotalSpins(count);
    this.cardView.updateGemsBadge(this.userProfileModel.getGems());

    const t = (k, v) => this.userProfileModel.t(k, v);

    this.rouletteView.setPulling(true);
    this.cardView.hideResultCard();
    this.storyController.hideStory();
    this.currentCard = null;

    const inp = this.userProfileModel.getInputs();
    this.lastInput = inp;

    this.rouletteView.setStatus(t('st_search'), true);

    let pool = [];
    let isLiveWikipedia = true;

    try {
      pool = await this.wikipediaModel.fetchPool(inp);
    } catch (err) {
      isLiveWikipedia = false;
    }

    if (pool.length < 24) {
      const existingNames = new Set(pool.map(c => c.name));
      const minYear = inp.selectedMinYear || this.userProfileModel.getBirthYear();
      this.wikipediaModel.offlinePool(minYear, 2026).forEach(c => {
        if (!existingNames.has(c.name) && this.wikipediaModel.isFigureInTimeframe(c, minYear, 2026)) {
          c.selectedMinYear = minYear;
          pool.push(c);
        }
      });
    }

    // Score all candidates
    pool.forEach(c => {
      const sc = this.wikipediaModel.score(c, inp);
      c.score = sc.total;
      c.parts = sc.parts;
      c.tier = sc.tier;
    });

    this.rouletteView.setStatus(
      isLiveWikipedia ? t('st_found', { n: pool.length }) : t('st_offline'),
      true
    );

    await new Promise(r => setTimeout(r, 400));

    // Execute multi pulls
    const { pulls, bestCard } = this.gachaModel.buildMultiPulls(pool, count);
    this.renderInitialPity();

    // Wheel preview of the best card
    const { list } = this.gachaModel.buildWheel(pool, false);
    list[WIN_INDEX] = bestCard;
    this.rouletteView.renderTrack(list);

    this.rouletteView.setStatus(t('st_spin'), true);
    await this.rouletteView.spinTo(WIN_INDEX, progress => {
      this.audioView.tick(progress);
    });
    this.rouletteView.highlightWinner(WIN_INDEX);

    this.audioView.win(bestCard.tier);
    this.cardView.confetti(bestCard.tier === 'rare' ? 260 : 160, ['#ffd700', '#eb4b4b', '#fff', '#ff9d00']);
    this.rouletteView.triggerScreenEffects(bestCard.tier);

    this.currentCard = bestCard;
    bestCard.dossier = this.wikipediaModel.buildDossier(bestCard, this.userProfileModel.lang, this.userProfileModel);
    this.storyController.setCurrentCard(bestCard, inp);

    // Show 10-pull modal
    this.cardView.showMultiPullModal(pulls, this.userProfileModel, chosenCard => {
      this.currentCard = chosenCard;
      chosenCard.dossier = this.wikipediaModel.buildDossier(chosenCard, this.userProfileModel.lang, this.userProfileModel);
      this.storyController.setCurrentCard(chosenCard, inp);
      this.cardView.showResultCard(chosenCard, this.userProfileModel);
    });

    // Also display the best card
    this.cardView.showResultCard(bestCard, this.userProfileModel);

    this.rouletteView.setStatus(t('st_idle'), false);
    this.rouletteView.setPulling(false);
    this.isBusy = false;
  }
}

export default GachaController;
