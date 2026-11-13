/**
 * @file GachaController.js
 * @description Handles spin clicks, candidate pool fetching, similarity calculation,
 * CS:GO roulette roll timing, pity updates, and outcome dispatching.
 */

import { WIN_INDEX } from '../models/GachaModel.js';

export class GachaController {
  // Persist every card pulled in a multi-pull to the Museum of Curiosities.
  // This must run even when /api/character-pool is empty or offline — the
  // inventory is a local-first collection, so a failed remote fetch must
  // never silently drop the pulled cards.
  _savePullsToInventory(pulls, inp) {
    if (!Array.isArray(pulls) || !pulls.length) return;
    if (!this.inventoryModel) return;
    const L = this.userProfileModel ? this.userProfileModel.lang : 'en';
    const t = k => this.userProfileModel ? this.userProfileModel.t(k) : k;
    const seen = new Set();
    pulls.forEach(card => {
      if (!card || !card.name) return;
      const key = String(card.name).toLowerCase().trim();
      if (seen.has(key)) return;
      seen.add(key);

      const st = card._story || {
        en: {
          headline: card.name,
          ch1: card.desc || '',
          ch2: '',
          ch3: '',
          itemName: 'Curious Artifact',
          itemDesc: card.desc || ''
        },
        vi: {
          headline: card.name,
          ch1: card.desc || '',
          ch2: '',
          ch3: '',
          itemName: 'Cổ vật kỳ lạ',
          itemDesc: card.desc || ''
        }
      };

      this.inventoryModel.addItem({
        id: 'mp_' + (card.pageid != null ? card.pageid : key),
        card_id: 'mp_' + (card.pageid != null ? card.pageid : key),
        card: {
          name: card.name,
          birth: card.birth != null ? Number(card.birth) : null,
          death: card.death || null,
          countryId: card.countryId || 'any',
          desc: card.desc || '',
          summary: card.summary || card.desc || '',
          summaryVi: card.summaryVi || card.summary || card.desc || '',
          summaryEn: card.summaryEn || card.summary || card.desc || '',
          img: card.img || null,
          url: card.url || null,
          urlVi: card.urlVi || null,
          tier: card.tier || 'common',
          score: card.score != null ? card.score : 50,
          source: card.source || 'wiki',
          universe: card.universe || (inp && inp.universe) || 'historical',
          eraYear: card.eraYear != null ? card.eraYear : (card.birth != null ? Number(card.birth) : null),
          gender: card.gender || null,
          targetRole: card.targetRole || null,
          ethnicity: card.ethnicity || null,
          religion: card.religion || null
        },
        st,
        absurd: card.absurd != null ? card.absurd : 50,
        ts: Date.now()
      });
    });
    this.cardView.updateInventoryBadge(this.inventoryModel.getCount());
  }
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

    try {
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
        // Use instant spin candidates (pre-fetched, scored, 20 cards with resolved images)
        pool = await this.wikipediaModel.getInstantSpinCandidates(inp, 20);
        // If pool is empty or too small, fall back to full fetchPool
        if (pool.length < 30) {
          pool = await this.wikipediaModel.fetchPool(inp);
        }
      } catch (err) {
        isLiveWikipedia = false;
      }

      if (pool.length < 24) {
        const existingNames = new Set(pool.map(c => c.name));
        const minYear = inp.selectedMinYear || this.userProfileModel.getBirthYear();
        this.wikipediaModel.offlinePool(minYear, 2026, inp.universe || 'historical').forEach(c => {
          if (!existingNames.has(c.name) && this.wikipediaModel.isFigureInTimeframe(c, minYear, 2026)) {
            c.selectedMinYear = minYear;
            pool.push(c);
          }
        });
      }

      this.lastPool = pool;

      // Score all candidates (already pre-scored from getInstantSpinCandidates, but ensure all have scores)
      pool.forEach(c => {
        if (!c.score) {
          const sc = this.wikipediaModel.score(c, inp);
          c.score = sc.total;
          c.parts = sc.parts;
          c.tier = sc.tier;
        }
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
    } catch (err) {
      console.error('[GachaController] Single pull failed:', err);
      this.cardView.toast(t('llmFail') || 'Pull failed');
    } finally {
      this.rouletteView.setPulling(false);
      this.isBusy = false;
    }
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

    try {
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
        // Use instant spin candidates (pre-fetched, scored, 20 cards with resolved images)
        pool = await this.wikipediaModel.getInstantSpinCandidates(inp, 20);
        // If pool is empty or too small, fall back to full fetchPool
        if (pool.length < 30) {
          pool = await this.wikipediaModel.fetchPool(inp);
        }
      } catch (err) {
        isLiveWikipedia = false;
      }

      if (pool.length < 24) {
        const existingNames = new Set(pool.map(c => c.name));
        const minYear = inp.selectedMinYear || this.userProfileModel.getBirthYear();
        this.wikipediaModel.offlinePool(minYear, 2026, inp.universe || 'historical').forEach(c => {
          if (!existingNames.has(c.name) && this.wikipediaModel.isFigureInTimeframe(c, minYear, 2026)) {
            c.selectedMinYear = minYear;
            pool.push(c);
          }
        });
      }

      this.lastPool = pool;

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

      // Execute multi pulls — bounded for loop + pity guarantee lives in GachaModel
      const { pulls, bestCard } = this.gachaModel.buildMultiPulls(pool, count);
      this.renderInitialPity();

      // Persist ALL pulled cards to the Museum of Curiosities immediately.
      // This is local-first: even if /api/character-pool is empty or offline,
      // the 10X pull still lands in the inventory.
      this._savePullsToInventory(pulls, inp);

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
    } catch (err) {
      console.error('[GachaController] Multi-pull failed:', err);
      this.cardView.toast(t('llmFail') || 'Multi-pull failed');
    } finally {
      this.rouletteView.setStatus(t('st_idle'), false);
      this.rouletteView.setPulling(false);
      this.isBusy = false;
    }
  }
}

export default GachaController;
