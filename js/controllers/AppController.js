/**
 * @file AppController.js
 * @description Master Controller orchestrating user flows, state changes,
 * theme & language switches, global settings, modal dialogs, and easter eggs.
 */

import { UserProfileModel, COUNTRIES } from '../models/UserProfileModel.js';
import { WikipediaModel } from '../models/WikipediaModel.js';
import { GachaModel } from '../models/GachaModel.js';
import { StoryModel, DEF_MODELS } from '../models/StoryModel.js';
import { InventoryModel } from '../models/InventoryModel.js';

import { ProfileView } from '../views/ProfileView.js';
import { RouletteView } from '../views/RouletteView.js';
import { StoryView } from '../views/StoryView.js';
import { CardView } from '../views/CardView.js';
import { AudioView } from '../views/AudioView.js';
import { SettingsView } from '../views/SettingsView.js';

import { GachaController } from './GachaController.js';
import { StoryController } from './StoryController.js';

export const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
];

export class AppController {
  constructor() {
    this.$ = s => document.querySelector(s);
    this.$$ = s => [...document.querySelectorAll(s)];

    // Initialize Models
    this.userProfileModel = new UserProfileModel();
    this.wikipediaModel = new WikipediaModel();
    this.wikipediaModel.userProfileModel = this.userProfileModel;
    this.gachaModel = new GachaModel();
    this.storyModel = new StoryModel();
    this.inventoryModel = new InventoryModel();

    // Easter egg state
    this.logoTaps = 0;
    this.logoTapTimer = null;
    this.konamiIndex = 0;

    // Active export state
    this.currentExport = { entry: null, kind: 'paper' };

    this.viewsInitialized = false;

    // Safety initialization if DOM is already loaded
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      this.initViewsAndControllers();
    }
  }

  initViewsAndControllers() {
    if (this.viewsInitialized) return;
    this.viewsInitialized = true;

    // Initialize Views
    this.profileView = new ProfileView();
    this.rouletteView = new RouletteView();
    this.storyView = new StoryView();
    this.cardView = new CardView();
    this.audioView = new AudioView();
    this.settingsView = new SettingsView({
      storyModel: this.storyModel,
      audioView: this.audioView,
      cardView: this.cardView,
      userProfileModel: this.userProfileModel
    });

    // Initialize Sub-Controllers
    this.storyController = new StoryController({
      userProfileModel: this.userProfileModel,
      storyModel: this.storyModel,
      inventoryModel: this.inventoryModel,
      storyView: this.storyView,
      cardView: this.cardView,
      audioView: this.audioView
    });

    this.gachaController = new GachaController({
      userProfileModel: this.userProfileModel,
      wikipediaModel: this.wikipediaModel,
      gachaModel: this.gachaModel,
      rouletteView: this.rouletteView,
      cardView: this.cardView,
      audioView: this.audioView,
      storyController: this.storyController
    });
  }

  bootstrap() {
    const run = () => {
      this.initViewsAndControllers();
      this.initProfile();
      this.initGlobalControls();
      this.initSettingsModal();
      this.initMuseumModal();
      this.initExportModal();
      this.initEasterEggs();

      this.applyTheme();
      this.applyLanguage();

      this.cardView.updateInventoryBadge(this.inventoryModel.getCount());
      this.rouletteView.setStatus(this.userProfileModel.t('st_idle'), false);
    };

    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => run());
    } else {
      run();
    }
  }

  initProfile() {
    this.profileView.syncFormValues(this.userProfileModel.fields, this.userProfileModel);
    this.profileView.renderSelects(this.userProfileModel, COUNTRIES);
    this.profileView.renderPresets(hex => {
      this.userProfileModel.setField('skin', hex);
      this.profileView.inputs.skin.value = hex;
      this.profileView.updateSkinDisplay(hex, this.userProfileModel);
    });
    this.profileView.updateSkinDisplay(this.userProfileModel.fields.skin, this.userProfileModel);
    this.profileView.updateYearDisplay(this.userProfileModel.fields.year, this.userProfileModel);
    this.profileView.updateAbsurdDisplay(this.userProfileModel.fields.absurd, this.userProfileModel);
    this.profileView.updateLocks(this.userProfileModel.locks, this.userProfileModel);

    // Bind field updates
    this.profileView.bindInputEvents((key, val) => {
      this.userProfileModel.setField(key, val);
      if (key === 'absurd') {
        this.profileView.updateAbsurdDisplay(val, this.userProfileModel);
      }
    }, this.userProfileModel);

    // Bind dice rolls
    this.profileView.bindRollEvents(
      rollFieldKey => {
        this.userProfileModel.rollField(rollFieldKey);
        this.profileView.syncFormValues(this.userProfileModel.fields, this.userProfileModel);
        this.profileView.updateAbsurdDisplay(this.userProfileModel.fields.absurd, this.userProfileModel);
      },
      () => {
        const name = this.userProfileModel.getRandomName();
        this.userProfileModel.setField('uName', name);
        this.profileView.inputs.uName.value = name;
        this.profileView.updateHeaderProfile(name);
      },
      () => {
        const hobby = this.userProfileModel.getRandomHobby();
        this.userProfileModel.setField('uHobby', hobby);
        this.profileView.inputs.uHobby.value = hobby;
      }
    );

    // Bind locks
    this.profileView.bindLockEvents(
      lockKey => {
        this.userProfileModel.toggleLock(lockKey);
        this.profileView.updateLocks(this.userProfileModel.locks, this.userProfileModel);
      },
      () => {
        this.userProfileModel.unlockAll();
        this.profileView.updateLocks(this.userProfileModel.locks, this.userProfileModel);
      }
    );

    // Bind Random All
    this.profileView.bindRandomAll(() => {
      this.audioView.init();
      this.userProfileModel.randomizeAllUnlocked();
      this.profileView.syncFormValues(this.userProfileModel.fields, this.userProfileModel);
      this.profileView.updateAbsurdDisplay(this.userProfileModel.fields.absurd, this.userProfileModel);
      this.audioView.tick(0.5);
    });
  }

  initGlobalControls() {
    // Theme toggle
    this.$('#btnTheme').onclick = () => {
      const nextTheme = this.userProfileModel.theme === 'dark' ? 'light' : 'dark';
      this.userProfileModel.setTheme(nextTheme);
      this.applyTheme();
    };

    // Language toggle
    this.$('#btnLang').onclick = () => {
      const nextLang = this.userProfileModel.lang === 'en' ? 'vi' : 'en';
      this.userProfileModel.setLanguage(nextLang);
      this.applyLanguage();
    };

    // Sound toggle
    this.$('#btnSound').textContent = this.audioView.on ? '🔊' : '🔇';
    this.$('#btnSound').onclick = () => {
      const on = this.audioView.toggleSound();
      this.$('#btnSound').textContent = on ? '🔊' : '🔇';
    };

    // Close buttons on all native dialogs
    this.$$('dialog').forEach(dlg => {
      dlg.addEventListener('click', e => {
        if (e.target === dlg) dlg.close();
      });
      this.$$('[data-close]', dlg).forEach(btn => {
        btn.onclick = () => dlg.close();
      });
    });
  }

  applyTheme() {
    const theme = this.userProfileModel.theme;
    document.documentElement.dataset.theme = theme;
    this.$('#btnTheme').textContent = theme === 'dark' ? '🌙' : '📰';
    const meta = this.$('meta[name=theme-color]');
    if (meta) meta.content = theme === 'dark' ? '#0d0914' : '#fcf8ed';
  }

  applyLanguage() {
    const L = this.userProfileModel.lang;
    const t = (k, v) => this.userProfileModel.t(k, v);
    document.documentElement.lang = L;

    // Translate DOM elements with data-i18n attributes
    this.$$('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    this.$$('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    this.$$('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });

    this.$('#btnLang').textContent = L === 'en' ? 'EN' : 'VI';
    this.$('#btnPaper').textContent = t('paperBtn');
    this.$('#btnHolo').textContent = t('holoBtn');

    // Update selects & views
    this.profileView.renderSelects(this.userProfileModel, COUNTRIES);
    this.profileView.updateSkinDisplay(this.userProfileModel.fields.skin, this.userProfileModel);
    this.profileView.updateYearDisplay(this.userProfileModel.fields.year, this.userProfileModel);
    this.profileView.updateAbsurdDisplay(this.userProfileModel.fields.absurd, this.userProfileModel);
    this.profileView.updateHeaderProfile(this.userProfileModel.fields.uName);
    this.profileView.updateLocks(this.userProfileModel.locks, this.userProfileModel);
    this.gachaController.renderInitialPity();

    if (!this.gachaController.isBusy) {
      this.rouletteView.setStatus(t('st_idle'), false);
    }

    if (this.gachaController.currentCard) {
      this.gachaController.currentCard.dossier = this.wikipediaModel.buildDossier(
        this.gachaController.currentCard,
        L,
        this.userProfileModel
      );
      this.cardView.showResultCard(this.gachaController.currentCard, this.userProfileModel);
    }

    if (this.storyController.currentStory) {
      this.storyController.reRenderStoryOnLanguageChange();
    }

    if (this.cardView.invDlg.open) {
      this.cardView.renderInventoryGrid(
        this.inventoryModel,
        this.userProfileModel,
        entry => this.openInventoryDetail(entry)
      );
    }

    if (this.cardView.expDlg.open && this.currentExport.entry) {
      this.cardView.renderExport(this.currentExport.entry, this.currentExport.kind, this.userProfileModel);
    }

    if (this.settingsView) {
      this.settingsView.applyLanguage(this.userProfileModel.lang);
    }
  }

  initSettingsModal() {
    if (this.settingsView) {
      this.settingsView.init();
    }
  }

  initMuseumModal() {
    this.$('#btnInv').onclick = () => {
      this.cardView.renderInventoryGrid(
        this.inventoryModel,
        this.userProfileModel,
        entry => this.openInventoryDetail(entry)
      );
      this.cardView.invDlg.showModal();
    };

    this.cardView.invClear.onclick = () => {
      if (confirm(this.userProfileModel.t('confirmClear'))) {
        this.inventoryModel.clear();
        this.cardView.updateInventoryBadge(0);
        this.cardView.renderInventoryGrid(
          this.inventoryModel,
          this.userProfileModel,
          entry => this.openInventoryDetail(entry)
        );
      }
    };
  }

  openInventoryDetail(entry) {
    this.cardView.renderInventoryDetail(
      entry,
      this.userProfileModel,
      () => {
        this.cardView.renderInventoryGrid(
          this.inventoryModel,
          this.userProfileModel,
          e => this.openInventoryDetail(e)
        );
      },
      kind => {
        this.currentExport = { entry, kind };
        this.cardView.openExportModal(entry, kind, this.userProfileModel);
      },
      async () => {
        const text = this.inventoryModel.formatEntryText(
          entry,
          this.userProfileModel.lang,
          this.userProfileModel.t('present')
        );
        const ok = await this.inventoryModel.copyText(text);
        this.cardView.toast(ok ? this.userProfileModel.t('copied') : this.userProfileModel.t('copyFail'));
      }
    );
  }

  initExportModal() {
    this.cardView.tabPaper.onclick = () => {
      this.currentExport.kind = 'paper';
      if (this.currentExport.entry) {
        this.cardView.renderExport(this.currentExport.entry, 'paper', this.userProfileModel);
      }
    };

    this.cardView.tabHolo.onclick = () => {
      this.currentExport.kind = 'holo';
      if (this.currentExport.entry) {
        this.cardView.renderExport(this.currentExport.entry, 'holo', this.userProfileModel);
      }
    };

    this.cardView.expDl.onclick = () => {
      if (this.currentExport.entry) {
        this.cardView.downloadExportCanvas(
          this.currentExport.entry,
          this.currentExport.kind,
          this.userProfileModel
        );
      }
    };

    this.cardView.expCopy.onclick = async () => {
      if (!this.currentExport.entry) return;
      const text = this.inventoryModel.formatEntryText(
        this.currentExport.entry,
        this.userProfileModel.lang,
        this.userProfileModel.t('present')
      );
      const ok = await this.inventoryModel.copyText(text);
      this.cardView.toast(ok ? this.userProfileModel.t('copied') : this.userProfileModel.t('copyFail'));
    };
  }

  initEasterEggs() {
    // 7 taps on logo unlocks "You, from 2077"
    this.$('#logo').onclick = () => {
      this.logoTaps++;
      clearTimeout(this.logoTapTimer);
      this.logoTapTimer = setTimeout(() => {
        this.logoTaps = 0;
      }, 1600);

      if (this.logoTaps >= 7) {
        this.logoTaps = 0;
        this.triggerSecret2077();
      }
    };

    // Konami code triggers Chaos mode
    document.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (k === KONAMI_CODE[this.konamiIndex]) {
        this.konamiIndex++;
      } else {
        this.konamiIndex = k === KONAMI_CODE[0] ? 1 : 0;
      }

      if (this.konamiIndex === KONAMI_CODE.length) {
        this.konamiIndex = 0;
        this.triggerChaosMode();
      }
    });
  }

  triggerSecret2077() {
    if (this.inventoryModel.hasItem('secret-2077')) {
      this.cardView.toast(this.userProfileModel.t('secretHave'));
      return;
    }
    const entry = this.storyModel.getSecret2077Entry();
    this.inventoryModel.addItem(entry);
    this.cardView.updateInventoryBadge(this.inventoryModel.getCount());

    this.audioView.win('rare');
    this.cardView.confetti(260, ['#ffd700', '#eb4b4b', '#fff']);
    document.body.classList.add('flash');
    setTimeout(() => document.body.classList.remove('flash'), 950);
    this.cardView.toast(this.userProfileModel.t('secret'));
  }

  triggerChaosMode() {
    this.userProfileModel.setField('absurd', 100);
    this.profileView.inputs.absurd.value = 100;
    this.profileView.updateAbsurdDisplay(100, this.userProfileModel);

    document.body.classList.add('chaos');
    this.cardView.confetti(220, ['#ff007f', '#00f3ff', '#ffd700', '#7cff00', '#fff']);
    this.audioView.win('rare');
    this.cardView.toast(this.userProfileModel.t('chaos'));
  }
}

export default AppController;
