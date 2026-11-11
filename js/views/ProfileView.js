/**
 * @file ProfileView.js
 * @description Renders Profile Dashboard & Parameter Console, manages inputs,
 * color swatches, sliders, lock buttons, and dice roll animations.
 */

import { TG, ROLES, PRESETS, ERAS, ETHNICITIES, RELIGIONS } from '../models/UserProfileModel.js';

export class ProfileView {
  constructor() {
    this.$ = s => document.querySelector(s);
    this.$$ = s => [...document.querySelectorAll(s)];

    this.inputs = {
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

    // Header Profile button & Dialog
    this.btnProfile = this.$('#btnProfile');
    this.hdrProfileName = this.$('#hdrProfileName');
    this.profileDlg = this.$('#profileDlg');
    this.btnSaveProfile = this.$('#btnSaveProfile');
  }

  fillSelect(selectEl, options, currentValue) {
    if (!selectEl) return;
    selectEl.replaceChildren(
      ...options.map(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        return opt;
      })
    );
    if (options.some(o => o[0] === currentValue)) {
      selectEl.value = currentValue;
    }
  }

  renderSelects(profileModel, countries) {
    const L = profileModel.lang;
    const t = k => profileModel.t(k);

    // Historical role options
    const roleOptions = [
      ['random', t('roleRandom')],
      ...ROLES.map(r => [r, t('role_' + r)]),
      ['custom', t('roleCustom')]
    ];
    this.fillSelect(this.inputs.uRole, roleOptions, profileModel.getField('uRole'));

    // Target gender options
    const tgOptions = TG.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
    this.fillSelect(this.inputs.tGender, tgOptions, profileModel.getField('tGender'));

    // Historical Era options (only if era input is a select dropdown)
    if (this.inputs.era && this.inputs.era.tagName === 'SELECT') {
      const eraOptions = ERAS.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
      this.fillSelect(this.inputs.era, eraOptions, profileModel.getField('era'));
    }

    // Ethnicity options
    const ethnicityOptions = ETHNICITIES.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
    this.fillSelect(this.inputs.ethnicity, ethnicityOptions, profileModel.getField('ethnicity'));

    // Religion options
    const religionOptions = RELIGIONS.map(x => [x[0], L === 'vi' ? x[2] : x[1]]);
    this.fillSelect(this.inputs.religion, religionOptions, profileModel.getField('religion'));

    // Ethnicity custom input visibility
    if (this.inputs.ethnicityCustom) {
      this.inputs.ethnicityCustom.hidden = this.inputs.ethnicity ? this.inputs.ethnicity.value !== 'custom' : true;
    }

    // Target country options
    const countryOptions = countries.map(c => [c[0], L === 'vi' ? c[2] : c[1]]);
    this.fillSelect(this.inputs.country, countryOptions, profileModel.getField('country'));

    // Gender datalist options
    if (this.genderDatalist) {
      this.genderDatalist.replaceChildren(
        ...['g_male', 'g_female', 'g_nb', 'g_pns'].map(k => {
          const opt = document.createElement('option');
          opt.value = t(k);
          return opt;
        })
      );
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

  bindInputEvents(onFieldChange, profileModel) {
    Object.entries(this.inputs).forEach(([key, el]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        onFieldChange(key, el.value);
        if (key === 'skin') this.updateSkinDisplay(el.value, profileModel);
        if (key === 'era' || key === 'eraYear' || key === 'year') {
          this.updateEraDisplay(el.value, profileModel);
        }
        if (key === 'uName') this.updateHeaderProfile(el.value);
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
      });
    });

    if (this.btnProfile) {
      this.btnProfile.onclick = () => this.openProfileModal();
    }

    if (this.btnSaveProfile) {
      this.btnSaveProfile.onclick = () => this.closeProfileModal();
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
