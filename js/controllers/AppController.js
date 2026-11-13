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
import { MiniGameView } from '../views/MiniGameView.js';

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
    this.inventoryModel.userProfileModel = this.userProfileModel;
    this.userProfileModel.inventoryModel = this.inventoryModel;
    this.userProfileModel.gachaModel = this.gachaModel;

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
    this.miniGameView = new MiniGameView();
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
      audioView: this.audioView,
      miniGameView: this.miniGameView
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

      this.cardView.updateGemsBadge(this.userProfileModel.getGems());
      this.cardView.updateInventoryBadge(this.inventoryModel.getCount());
      this.rouletteView.setStatus(this.userProfileModel.t('st_idle'), false);

      // Listen for Admin Mode unlock event
      if (typeof window !== 'undefined') {
        window.addEventListener('whoareu:admin-unlocked', () => {
          this.updateAdminBadge();
        });
      }

      // Register gem change listener
      this.userProfileModel.onGemsChange(gems => {
        this.cardView.updateGemsBadge(gems);
      });

      // Hook up gem counter button to claim daily bonus (+1600 gems)
      // In Admin Mode: clicking sets gems to 999999999 and syncs to Neon.
      if (this.cardView.btnGems) {
        this.cardView.btnGems.onclick = () => {
          if (this.userProfileModel.isAdmin) {
            this.userProfileModel.setGems(999999999);
            this.cardView.toast('🛠️ ADMIN: Gems set to 999,999,999');
            this.audioView.chime();
          } else {
            this.userProfileModel.addGems(1600);
            this.cardView.toast(this.userProfileModel.t('bonusClaimed'));
            this.audioView.chime();
            this.cardView.confetti(60, ['#38bdf8', '#818cf8', '#ffffff']);
          }
        };
      }

      // Initial admin badge check
      this.updateAdminBadge();

      // Background remote sync hydration from Vercel Postgres
      this.syncFromRemote();
    };

    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => run());
    } else {
      run();
    }
  }

  async syncFromRemote() {
    try {
      await this.userProfileModel.syncFromRemote(
        this.inventoryModel,
        this.gachaModel
      );

      this.cardView.updateGemsBadge(this.userProfileModel.getGems());
      this.cardView.updateInventoryBadge(this.inventoryModel.getCount());
      if (this.gachaController) {
        this.gachaController.renderInitialPity();
      }

      if (this.cardView.invDlg && this.cardView.invDlg.open) {
        this.cardView.renderInventoryGrid(
          this.inventoryModel,
          this.userProfileModel,
          entry => this.openInventoryDetail(entry)
        );
      }
    } catch (e) {
      console.warn('[AppController] Background remote hydration error:', e);
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

    // Check the admin trigger on initial load — the user may already have
    // saved the trigger profile in localStorage.
    this.userProfileModel.checkAdminTrigger();
    this.updateAdminBadge();

    // Bind field updates
    this.profileView.bindInputEvents((key, val) => {
      this.userProfileModel.setField(key, val);
      if (key === 'absurd') {
        this.profileView.updateAbsurdDisplay(val, this.userProfileModel);
      }
    }, this.userProfileModel, this.wikipediaModel);

    // Trigger initial reactive prefetch
    if (this.wikipediaModel && typeof this.wikipediaModel.schedulePrefetch === 'function') {
      const inputs = this.userProfileModel.getInputs();
      this.wikipediaModel.schedulePrefetch(inputs, {
        onStatus: (msg, isBusy) => {
          console.log('[AppController] Initial prefetch status:', msg, isBusy);
        }
      });
    }

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

    // Admin Pool button (only visible in Admin Mode)
    const btnAdminPool = this.$('#btnAdminPool');
    if (btnAdminPool) {
      btnAdminPool.onclick = () => this.openAdminPool();
      btnAdminPool.hidden = !this.userProfileModel.isAdmin;
    }

    // Global Delegated Click Listener for Modal & Drawer Close Buttons
    document.addEventListener('click', e => {
      const closeBtn = e.target.closest('.close-btn, .modal-close, [data-close-modal], [data-close]');
      if (!closeBtn) return;
      e.stopPropagation();

      // 1. If inside a <dialog>, close that dialog
      const dlg = closeBtn.closest('dialog');
      if (dlg && typeof dlg.close === 'function') {
        try { dlg.close(); } catch (_) { dlg.removeAttribute('open'); }
        return;
      }

      // 2. If inside a drawer or panel like storySec or adminPool
      const panel = closeBtn.closest('#storySec, #adminPoolDlg, .modal, .drawer');
      if (panel) {
        if (typeof panel.close === 'function') {
          try { panel.close(); } catch (_) { panel.removeAttribute('open'); }
        } else {
          panel.hidden = true;
          panel.classList.remove('active', 'open');
        }
        return;
      }

      // 3. Fallback: Close any open dialogs / active modals
      document.querySelectorAll('dialog[open]').forEach(d => {
        try { d.close(); } catch (_) { d.removeAttribute('open'); }
      });
      document.querySelectorAll('.modal.active, .drawer.open').forEach(el => {
        el.classList.remove('active', 'open');
        el.hidden = true;
      });
    });

    // Close on click outside for all native dialogs (backdrop click)
    this.$$('dialog').forEach(dlg => {
      dlg.addEventListener('click', e => {
        if (e.target === dlg) {
          try { dlg.close(); } catch (_) { dlg.removeAttribute('open'); }
        }
      });
    });

    // Global Escape Key Listener to hide any active modal/drawer (Museum, Story, Settings, Admin Pool, Profile, MultiPull, Export)
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        // Close all open dialogs
        document.querySelectorAll('dialog[open]').forEach(dlg => {
          try { dlg.close(); } catch (_) { dlg.removeAttribute('open'); }
        });

        // Hide Story section if open
        const storySec = document.getElementById('storySec');
        if (storySec && !storySec.hidden) {
          storySec.hidden = true;
        }

        // Close any drawers or modals
        document.querySelectorAll('.modal.active, .drawer.open, .admin-pool-drawer').forEach(el => {
          if (typeof el.close === 'function') {
            try { el.close(); } catch (_) { el.removeAttribute('open'); }
          }
          el.classList.remove('active', 'open');
          el.hidden = true;
        });
      }
    });

    // Wire up Story close button specifically
    const btnCloseStory = this.$('#btnCloseStory');
    if (btnCloseStory) {
      btnCloseStory.onclick = () => {
        const storySec = document.getElementById('storySec');
        if (storySec) storySec.hidden = true;
      };
    }
  }

  openAdminPool() {
    const adminDlg = this.$('#adminPoolDlg');
    const adminStats = this.$('#adminPoolStats');
    const adminList = this.$('#adminPoolList');
    if (!adminDlg) return;

    const cards = this.gachaController && this.gachaController.lastPool ? this.gachaController.lastPool : this.wikipediaModel.offlinePool(500, 2026);
    if (adminStats) {
      adminStats.textContent = `Character Pool Count: ${cards.length} entities | Active Universe: ${this.userProfileModel.fields.universe || 'historical'}`;
    }
    if (adminList) {
      adminList.replaceChildren(...cards.map(c => {
        const item = document.createElement('div');
        item.className = 'dossier-item';
        item.style.padding = '8px';
        item.style.fontSize = '0.8rem';
        item.innerHTML = `<strong>${c.name}</strong><br><small>${c.birth || 'N/A'} - ${c.death || 'present'} | ${c.targetRole || c.desc}</small>`;
        return item;
      }));
    }
    if (!adminDlg.open) adminDlg.showModal();
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
      const entry = this.currentExport.entry || this.cardView.currentExportEntry;
      if (entry) {
        this.cardView.renderExport(entry, 'paper', this.userProfileModel);
      }
    };

    this.cardView.tabHolo.onclick = () => {
      this.currentExport.kind = 'holo';
      const entry = this.currentExport.entry || this.cardView.currentExportEntry;
      if (entry) {
        this.cardView.renderExport(entry, 'holo', this.userProfileModel);
      }
    };

    this.cardView.expDl.onclick = () => {
      const entry = this.currentExport.entry || this.cardView.currentExportEntry;
      const kind = this.currentExport.kind || this.cardView.currentExportKind || 'paper';
      if (entry) {
        this.cardView.downloadExportCanvas(
          entry,
          kind,
          this.userProfileModel,
          trackedEntry => {
            this.inventoryModel.markExported(trackedEntry.card_id || trackedEntry.id);
            if (this.cardView.invDlg && this.cardView.invDlg.open) {
              this.cardView.renderInventoryGrid(
                this.inventoryModel,
                this.userProfileModel,
                e => this.openInventoryDetail(e)
              );
            }
          }
        );
      }
    };

    this.cardView.expCopy.onclick = async () => {
      const entry = this.currentExport.entry || this.cardView.currentExportEntry;
      if (!entry) return;
      const text = this.inventoryModel.formatEntryText(
        entry,
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

  updateAdminBadge() {
    if (!this.userProfileModel.isAdmin) return;
    const hdr = this.$('#hdrProfileName');
    if (hdr && !hdr.textContent.includes('DEV ADMIN MODE')) {
      hdr.textContent = '🛠️ DEV ADMIN MODE UNLOCKED';
      hdr.style.color = 'var(--c-yellow)';
    }
    // Ensure the "Soi Pool Gacha" button is visible
    const btn = this.$('#btnAdminPool');
    if (btn) btn.hidden = false;
  }
}

export default AppController;
