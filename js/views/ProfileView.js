/**
 * @file ProfileView.js
 * @description Renders Profile Dashboard & Parameter Console, manages inputs,
 * color swatches, sliders, lock buttons, and dice roll animations.
 */

import { TG, ROLES, PRESETS, ERAS, ETHNICITIES, RELIGIONS, UNIVERSES, WORLD_COUNTRIES } from '../models/UserProfileModel.js';

export class ProfileView {
  constructor() {
    this.$ = s => document.querySelector(s);
    this.$$ = s => [...document.querySelectorAll(s)];

    this.inputs = {
      universe: this.$('#universeScope'),
      uName: this.$('#uName'),
      uAge: this.$('#uAge'),
      uGender: this.$('#uGender'),
      uHobby: this.$('#uHobby'),
      uRole: this.$('#uRole'),
      uRoleCustom: this.$('#uRoleCustom'),
      skin: this.$('#skin'),
      tGender: this.$('#tGender'),
      era: this.$('#eraYear') || this.$('#era'),
      eraYear: this.$('#eraYear') || this.$('#era'),
      ethnicity: this.$('#ethnicity'),
      ethnicityCustom: this.$('#ethnicityCustom'),
      religion: this.$('#religion'),
      year: this.$('#eraYear') || this.$('#year'),
      country: this.$('#country'),
      countrySearch: this.$('#countrySearchInput'),
      trait: this.$('#trait'),
      absurd: this.$('#absurd')
    };

    this.outputs = {
      skinOut: this.$('#skinOut'),
      eraOut: this.$('#eraOut'),
      yearOut: this.$('#eraOut') || this.$('#yearOut'),
      absOut: this.$('#absOut'),
      absDesc: this.$('#absDesc')
    };

    this.labels = {
      lblSkin: this.$('#lblSkin'),
      lblEra: this.$('#lblEra'),
      lblYear: this.$('#lblEra') || this.$('#lblYear'),
      lblAbsurd: this.$('#lblAbsurd')
    };

    this.presetsContainer = this.$('#presets');
    this.genderDatalist = this.$('#uGenderList');

    // Story Tone selector
    this.toneSelect = this.$('#storyTone');

    // Header Profile button & Dialog
    this.btnProfile = this.$('#btnProfile');
    this.hdrProfileName = this.$('#hdrProfileName');
    this.profileDlg = this.$('#profileDlg');
    this.btnSaveProfile = this.$('#btnSaveProfile');

    // Country search filter - Vietnamese accent-insensitive matching
    this._countrySearchInput = this.inputs.countrySearch;
    this._allCountryOptions = WORLD_COUNTRIES;
  }

  // Resolve a display label from any option-shaped item (array, object, or primitive).
  // Supports [value, labelEn, labelVi] arrays, plain objects with various label
  // keys (labelVi/vi/label/name/labelEn/en/value), and primitive values.
  // lang is 'vi' or 'en' — Vietnamese labels are preferred when lang === 'vi'.
  resolveOptionLabel(item, lang) {
    if (item == null) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (Array.isArray(item)) {
      const val = item[0];
      if (lang === 'vi') {
        return item[2] != null ? item[2]
          : (item[1] != null ? item[1] : (val != null ? String(val) : ''));
      }
      return item[1] != null ? item[1]
        : (item[2] != null ? item[2] : (val != null ? String(val) : ''));
    }
    if (typeof item === 'object') {
      const val = item.value ?? item.id ?? item.key ?? '';
      if (lang === 'vi') {
        return item.labelVi || item.vi || item.label || item.name
          || item.labelEn || item.en || (val != null ? String(val) : '');
      }
      return item.labelEn || item.en || item.label || item.name
        || item.labelVi || item.vi || (val != null ? String(val) : '');
    }
    return String(item);
  }

  // Resolve the option's underlying value (never throws).
  resolveOptionValue(item) {
    if (item == null) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (Array.isArray(item)) return item[0] != null ? String(item[0]) : '';
    if (typeof item === 'object') return String(item.value ?? item.id ?? item.key ?? '');
    return String(item);
  }

  // Populate a single <select> from a resilient list of options.
  // Uses resolveOptionLabel/resolveOptionValue so malformed entries can never throw.
  fillSelect(selectEl, options, currentValue, lang = 'en') {
    if (!selectEl) return;
    const frag = document.createDocumentFragment();
    (Array.isArray(options) ? options : []).forEach(item => {
      const opt = document.createElement('option');
      opt.value = this.resolveOptionValue(item);
      opt.textContent = this.resolveOptionLabel(item, lang);
      frag.appendChild(opt);
    });
    selectEl.replaceChildren(frag);
    if (currentValue != null) {
      const cur = String(currentValue);
      if ([...selectEl.options].some(o => o.value === cur)) {
        selectEl.value = cur;
      }
    }
  }

  // Vietnamese accent-insensitive matching helper
  _removeVietnameseDiacritics(str) {
    return str
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  _filterCountryOptions(searchText) {
    const selectEl = this.inputs.country;
    if (!selectEl) return;

    const normalizedSearch = this._removeVietnameseDiacritics(searchText.toLowerCase().trim());
    const options = selectEl.querySelectorAll('option');

    if (!normalizedSearch) {
      // Show all options
      options.forEach(opt => {
        opt.hidden = false;
      });
      return;
    }

    let firstVisible = null;
    options.forEach(opt => {
      const label = opt.textContent.toLowerCase();
      const normalizedLabel = this._removeVietnameseDiacritics(label);
      const match = normalizedLabel.includes(normalizedSearch);
      opt.hidden = !match;
      if (match && !firstVisible) firstVisible = opt;
    });

    // Auto-select first visible match if current selection is hidden
    if (firstVisible && selectEl.value !== firstVisible.value) {
      // Don't auto-change selection, just make sure a visible option exists
    }
  }

  bindCountrySearch() {
    if (this._countrySearchInput) {
      this._countrySearchInput.addEventListener('input', e => {
        this._filterCountryOptions(e.target.value);
      });
    }
  }

  renderSelects(profileModel, countries) {
    const L = profileModel.lang;
    const t = k => profileModel.t(k);

    // Helper to safely populate a single dropdown — one failure never blocks the others.
    const safeFill = (selectEl, options, currentValue, label) => {
      if (!selectEl) return;
      try {
        this.fillSelect(selectEl, options, currentValue, L);
      } catch (e) {
        console.error('[ProfileView] Dropdown error:', label, e);
        // Re-populate with a single placeholder option so the dropdown is never empty
        try {
          selectEl.replaceChildren(
            Object.assign(document.createElement('option'), { value: 'any', textContent: '⚠️ Error' })
          );
        } catch (e2) {
          console.error('[ProfileView] Failed to restore placeholder for ' + label + ':', e2);
        }
      }
    };

    // Story Tone selector
    if (this.toneSelect) {
      const toneOptions = [
        ['comedy', t('tone_comedy')],
        ['epic', t('tone_epic')],
        ['tragic', t('tone_tragic')],
        ['mystery', t('tone_mystery')]
      ];
      safeFill(this.toneSelect, toneOptions, profileModel.getStoryTone(), 'storyTone');
    }

    // Universe Scope options
    const universeOptions = UNIVERSES.map(u => [u[0], L === 'vi' ? u[2] : u[1]]);
    safeFill(this.inputs.universe, universeOptions, profileModel.getField('universe'), 'universe');

    // Historical role options
    const roleOptions = [
      ['random', t('roleRandom')],
      ...ROLES.map(r => [r, t('role_' + r)]),
      ['custom', t('roleCustom')]
    ];
    safeFill(this.inputs.uRole, roleOptions, profileModel.getField('uRole'), 'uRole');

    // Target gender options
    const tgOptions = TG.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
    safeFill(this.inputs.tGender, tgOptions, profileModel.getField('tGender'), 'tGender');

    // Historical Era options (only if era input is a select dropdown)
    if (this.inputs.era && this.inputs.era.tagName === 'SELECT') {
      const eraOptions = ERAS.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
      safeFill(this.inputs.era, eraOptions, profileModel.getField('era'), 'era');
    }

    // Ethnicity options
    const ethnicityOptions = ETHNICITIES.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
    safeFill(this.inputs.ethnicity, ethnicityOptions, profileModel.getField('ethnicity'), 'ethnicity');

    // Religion options
    const religionOptions = RELIGIONS.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
    safeFill(this.inputs.religion, religionOptions, profileModel.getField('religion'), 'religion');

    // Ethnicity custom input visibility
    if (this.inputs.ethnicityCustom) {
      this.inputs.ethnicityCustom.hidden = this.inputs.ethnicity ? this.inputs.ethnicity.value !== 'custom' : true;
    }

    // Target country options - use WORLD_COUNTRIES for full ~195 countries
    const countryOptions = this._allCountryOptions.map(c => [c[0], L === 'vi' ? c[2] : c[1]]);
    safeFill(this.inputs.country, countryOptions, profileModel.getField('country'), 'country');

    // Bind country search filter after rendering
    this.bindCountrySearch();

    // Gender datalist options
    if (this.genderDatalist) {
      try {
        this.genderDatalist.replaceChildren(
          ...['g_male', 'g_female', 'g_nb', 'g_pns'].map(k => {
            const opt = document.createElement('option');
            opt.value = t(k);
            return opt;
          })
        );
      } catch (e) {
        console.warn('[ProfileView] Failed to render gender datalist:', e);
      }
    }

    // Custom role visibility
    if (this.inputs.uRoleCustom) {
      this.inputs.uRoleCustom.hidden = this.inputs.uRole.value !== 'custom';
    }
  }

  renderPresets(onSelectPreset) {
    if (!this.presetsContainer) return;
    this.presetsContainer.replaceChildren(
      ...PRESETS.map(hex => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.background = hex;
        btn.setAttribute('aria-label', hex);
        btn.onclick = () => onSelectPreset(hex);
        return btn;
      })
    );
  }

  updateSkinDisplay(colorHex, profileModel) {
    if (!colorHex && this.inputs.skin) colorHex = this.inputs.skin.value;
    if (!colorHex) return;
    const r = parseInt(colorHex.slice(1, 3), 16) || 0;
    const g = parseInt(colorHex.slice(3, 5), 16) || 0;
    const b = parseInt(colorHex.slice(5, 7), 16) || 0;
    const rgbStr = `rgb(${r}, ${g}, ${b})`;

    if (this.outputs.skinOut) {
      this.outputs.skinOut.textContent = rgbStr;
    }
    if (this.labels.lblSkin) {
      const prefix = profileModel ? profileModel.t('skinPrefix') : 'Skin Tone: ';
      this.labels.lblSkin.innerHTML = `${prefix}<span id="skinOut" class="mono">${rgbStr}</span>`;
      this.outputs.skinOut = this.$('#skinOut');
    }
  }

  updateEraDisplay(yearVal, profileModel) {
    const val = Number(yearVal);
    const minVal = this.inputs.eraYear ? Number(this.inputs.eraYear.min || 500) : 500;
    const isMin = isNaN(val) || val <= minVal;
    const isVi = !profileModel || profileModel.lang === 'vi';

    const prefix = isVi ? 'Mốc lịch sử: ' : 'Historical Era: ';
    let bodyText = '';
    if (isMin) {
      bodyText = isVi ? 'Toàn bộ Lịch sử (Cổ đại đến Nay)' : 'All History (Ancient to Present)';
    } else {
      bodyText = isVi ? `Từ ${val} đến Nay` : `From ${val} to Present`;
    }

    if (this.outputs.eraOut) {
      this.outputs.eraOut.textContent = bodyText;
    }
    if (this.outputs.yearOut && this.outputs.yearOut !== this.outputs.eraOut) {
      this.outputs.yearOut.textContent = bodyText;
    }
    if (this.labels.lblEra) {
      this.labels.lblEra.innerHTML = `${prefix}<output id="eraOut">${bodyText}</output>`;
      this.outputs.eraOut = this.$('#eraOut');
    }
    if (this.labels.lblYear && this.labels.lblYear !== this.labels.lblEra) {
      this.labels.lblYear.innerHTML = `${prefix}<output id="yearOut">${bodyText}</output>`;
      this.outputs.yearOut = this.$('#yearOut');
    }
  }

  updateYearDisplay(yearVal, profileModel) {
    this.updateEraDisplay(yearVal, profileModel);
  }

  updateAbsurdDisplay(absurdVal, profileModel) {
    const v = Number(absurdVal);
    const band = v <= 24 ? 0 : v <= 74 ? 1 : 2;

    if (this.outputs.absOut) {
      this.outputs.absOut.textContent = v + '%';
    }
    if (this.labels.lblAbsurd) {
      const prefix = profileModel ? profileModel.t('absurdPrefix') : 'Story Absurdity Level: ';
      this.labels.lblAbsurd.innerHTML = `${prefix}<output id="absOut">${v}%</output>`;
      this.outputs.absOut = this.$('#absOut');
    }
    if (this.outputs.absDesc) {
      this.outputs.absDesc.textContent = profileModel
        ? profileModel.t('abs' + band) + ' — ' + profileModel.t('absd' + band)
        : '';
    }
  }

  updateHeaderProfile(name) {
    if (this.hdrProfileName) {
      this.hdrProfileName.textContent = name || 'Profile';
    }
  }

  openProfileModal() {
    if (this.profileDlg && !this.profileDlg.open) {
      this.profileDlg.showModal();
    }
  }

  closeProfileModal() {
    if (this.profileDlg && this.profileDlg.open) {
      this.profileDlg.close();
    }
  }

  updateLocks(locksState, profileModel) {
    this.$$('.lock').forEach(btn => {
      const field = btn.dataset.lock;
      const isLocked = !!locksState[field];
      btn.textContent = isLocked ? '🔒' : '🔓';
      btn.classList.toggle('on', isLocked);
      btn.title = isLocked ? profileModel.t('lockOn') : profileModel.t('lockOff');
    });
  }

  spinDie(btn) {
    if (!btn) return;
    btn.classList.remove('rolling');
    void btn.offsetWidth;
    btn.classList.add('rolling');
  }

  syncFormValues(fields, profileModel) {
    Object.keys(fields).forEach(k => {
      if (this.inputs[k]) {
        this.inputs[k].value = fields[k];
      }
    });
    if (this.inputs.universe && fields.universe) {
      this.inputs.universe.value = fields.universe;
    }
    this.updateSkinDisplay(fields.skin, profileModel);
    this.updateEraDisplay(fields.eraYear || fields.year || fields.era, profileModel);
    this.updateHeaderProfile(fields.uName);
    if (this.inputs.uRoleCustom) {
      this.inputs.uRoleCustom.hidden = this.inputs.uRole ? this.inputs.uRole.value !== 'custom' : true;
    }
    if (this.inputs.ethnicityCustom) {
      this.inputs.ethnicityCustom.hidden = this.inputs.ethnicity ? this.inputs.ethnicity.value !== 'custom' : true;
    }
  }

  bindInputEvents(onFieldChange, profileModel, wikipediaModel) {
    // Debounced prefetch trigger
    let prefetchTimeout = null;
    const triggerPrefetch = () => {
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
      prefetchTimeout = setTimeout(() => {
        if (wikipediaModel && typeof wikipediaModel.schedulePrefetch === 'function') {
          const inputs = profileModel ? profileModel.getInputs() : {};
          wikipediaModel.schedulePrefetch(inputs, {
            onStatus: (msg, isBusy) => {
              // Could emit status to UI here if needed
              console.log('[ProfileView] Prefetch status:', msg, isBusy);
            }
          });
        }
      }, 450); // 450ms debounce
    };

    // Filter keys that should trigger prefetch
    const filterKeys = new Set([
      'universe', 'country', 'tGender', 'era', 'eraYear', 'year',
      'ethnicity', 'ethnicityCustom', 'religion', 'trait', 'uRole', 'uRoleCustom',
      'uHobby', 'absurd', 'uGender', 'skin', 'uName'
    ]);

    Object.entries(this.inputs).forEach(([key, el]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        onFieldChange(key, el.value);
        if (key === 'skin') this.updateSkinDisplay(el.value, profileModel);
        if (key === 'era' || key === 'eraYear' || key === 'year') {
          this.updateEraDisplay(el.value, profileModel);
        }
        if (key === 'uName') this.updateHeaderProfile(el.value);
        // Trigger reactive prefetch for filter changes
        if (filterKeys.has(key)) triggerPrefetch();
      });
      el.addEventListener('change', () => {
        onFieldChange(key, el.value);
        if (key === 'uRole') {
          if (this.inputs.uRoleCustom) {
            this.inputs.uRoleCustom.hidden = el.value !== 'custom';
            if (!this.inputs.uRoleCustom.hidden) this.inputs.uRoleCustom.focus();
          }
        }
        if (key === 'ethnicity') {
          if (this.inputs.ethnicityCustom) {
            this.inputs.ethnicityCustom.hidden = el.value !== 'custom';
            if (!this.inputs.ethnicityCustom.hidden) this.inputs.ethnicityCustom.focus();
          }
        }
        // Trigger reactive prefetch for filter changes
        if (filterKeys.has(key)) triggerPrefetch();
      });
    });

    // Story Tone selector — set the narrative style on the UserProfileModel
    if (this.toneSelect) {
      this.toneSelect.addEventListener('change', () => {
        if (profileModel && typeof profileModel.setStoryTone === 'function') {
          profileModel.setStoryTone(this.toneSelect.value);
        }
      });
    }

    if (this.btnProfile) {
      this.btnProfile.onclick = () => this.openProfileModal();
    }

    if (this.btnSaveProfile) {
      // Re-check the Secret Admin trigger on save so a custom-role
      // "dev" typed into uRoleCustom unlocks admin mode on submit.
      this.btnSaveProfile.onclick = () => {
        if (this.userProfileModel && typeof this.userProfileModel.checkAdminTrigger === 'function') {
          this.userProfileModel.checkAdminTrigger();
        }
        this.closeProfileModal();
      };
    }
  }

  bindRollEvents(onRollField, onRollName, onRollHobby) {
    const rollNameBtn = this.$('#rollName');
    if (rollNameBtn) {
      rollNameBtn.onclick = e => {
        this.spinDie(e.currentTarget);
        onRollName();
      };
    }

    const rollHobbyBtn = this.$('#rollHobby');
    if (rollHobbyBtn) {
      rollHobbyBtn.onclick = e => {
        this.spinDie(e.currentTarget);
        onRollHobby();
      };
    }

    this.$$('[data-roll]').forEach(btn => {
      btn.onclick = () => {
        this.spinDie(btn);
        onRollField(btn.dataset.roll);
      };
    });
  }

  bindLockEvents(onToggleLock, onUnlockAll) {
    this.$$('.lock').forEach(btn => {
      btn.onclick = () => {
        onToggleLock(btn.dataset.lock);
      };
    });

    const unlockAllBtn = this.$('#unlockAll');
    if (unlockAllBtn) {
      unlockAllBtn.onclick = onUnlockAll;
    }
  }

  bindRandomAll(onRandomAll) {
    const randAllBtn = this.$('#randAll');
    if (randAllBtn) {
      randAllBtn.onclick = () => {
        this.$$('[data-roll]').forEach(b => this.spinDie(b));
        onRandomAll();
      };
    }
  }
}

export default ProfileView;
