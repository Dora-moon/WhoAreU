/**
 * @file SettingsView.js
 * @description Dynamic AI Provider Switcher (Google Gemini, OpenAI ChatGPT, Anthropic Claude),
 * direct API key retrieval link badges, dynamic model selector with real-time recommendations,
 * sound volume adjustments, and API key visibility toggles.
 */

export const PROVIDER_CONFIG = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHelpTextVi: '🔗 Lấy API Key miễn phí tại:',
    keyHelpTextEn: '🔗 Get free API Key at:',
    defaultModel: 'gemini-3.8-flash',
    models: [
      {
        id: 'gemini-3.8-flash',
        labelVi: 'gemini-3.8-flash (Khuyên dùng - Nhanh, ổn định, miễn phí)',
        labelEn: 'gemini-3.8-flash (Recommended - Fast, stable, free)',
        descVi: 'Mô hình thế hệ mới nhất của Google. Tốc độ cực nhanh, ổn định cao, miễn phí qua Google AI Studio. Tối ưu hoàn hảo cho việc sinh cốt truyện du hành thời gian hài hước.',
        descEn: 'Google\'s latest next-gen model. Ultra-fast, highly reliable, free via Google AI Studio. Perfectly tuned for comedic time-travel chronicles.'
      },
      {
        id: 'gemini-3.5-flash-lite',
        labelVi: 'gemini-3.5-flash-lite (Dự phòng khi server quá tải 503)',
        labelEn: 'gemini-3.5-flash-lite (Backup for 503 server load)',
        descVi: 'Phiên bản rút gọn siêu nhẹ. Độ trễ thấp, tiêu thụ ít tài nguyên, là lựa chọn cứu cánh tuyệt vời khi máy chủ chính quá tải (lỗi 503).',
        descEn: 'Ultra-lightweight lite edition. Low latency, lower resource usage, great backup during peak server traffic (503 errors).'
      },
      {
        id: 'gemini-1.5-flash',
        labelVi: 'gemini-1.5-flash (Bản tiêu chuẩn cũ)',
        labelEn: 'gemini-1.5-flash (Legacy standard version)',
        descVi: 'Bản tiêu chuẩn cũ ổn định qua thời gian, độ dài ngữ cảnh lớn, thích hợp nếu bạn có quota dự phòng từ trước.',
        descEn: 'Proven legacy standard Flash edition with large context window, ideal for existing quota allocations.'
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHelpTextVi: '🔗 Lấy API Key tại:',
    keyHelpTextEn: '🔗 Get API Key at:',
    defaultModel: 'gpt-4o-mini',
    models: [
      {
        id: 'gpt-4o-mini',
        labelVi: 'gpt-4o-mini (Khuyên dùng - Rất nhanh, rẻ, sinh truyện hài)',
        labelEn: 'gpt-4o-mini (Recommended - Very fast, cheap, witty)',
        descVi: 'Mô hình nhỏ gọn thông minh vượt trội của OpenAI. Rất nhanh, rẻ, sinh truyện hài hước dí dỏm cực kỳ duyên dáng.',
        descEn: 'OpenAI\'s compact powerhouse. Super fast, cheap, and excels at generating witty, charming comedic stories.'
      },
      {
        id: 'gpt-4o',
        labelVi: 'gpt-4o (Thông minh cao cấp - Truyện sâu sắc, ảo hóa mạnh)',
        labelEn: 'gpt-4o (Flagship Omni - Deep lore, vivid imagination)',
        descVi: 'Thông minh cao cấp hàng đầu thế giới. Khả năng liên tưởng lịch sử sâu sắc, dẫn dắt tình huống ảo hóa cực mạnh và giàu tính văn học.',
        descEn: 'Flagship intelligence. Deep historical insight, rich imaginative twists, and strong narrative worldbuilding.'
      },
      {
        id: 'gpt-3.5-turbo',
        labelVi: 'gpt-3.5-turbo (Bản truyền thống)',
        labelEn: 'gpt-3.5-turbo (Classic traditional edition)',
        descVi: 'Bản truyền thống kinh điển của thời đại ChatGPT ban đầu, tốc độ ổn định và chi phí tiết kiệm cho các nhu cầu sáng tác cơ bản.',
        descEn: 'Classic traditional ChatGPT model, dependable and lightweight for standard story generation.'
      }
    ]
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHelpTextVi: '🔗 Lấy API Key tại:',
    keyHelpTextEn: '🔗 Get API Key at:',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      {
        id: 'claude-3-5-haiku-20241022',
        labelVi: 'claude-3-5-haiku-20241022 (Khuyên dùng - Siêu nhanh, phản hồi tức thì)',
        labelEn: 'claude-3-5-haiku-20241022 (Recommended - Instant speed, agile)',
        descVi: 'Dòng Haiku thế hệ 3.5 mới nhất của Anthropic. Siêu nhanh, phản hồi tức thì, chi phí tiết kiệm, cấu trúc JSON chuẩn xác.',
        descEn: 'Anthropic\'s 3.5 Haiku model. Super fast, near-instant response, cost-effective with flawless JSON compliance.'
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        labelVi: 'claude-3-5-sonnet-20241022 (Văn phong hay nhất, miêu tả sinh động)',
        labelEn: 'claude-3-5-sonnet-20241022 (Best literary prose & vivid humor)',
        descVi: 'Văn phong hay nhất và khiếu hài hước tinh tế. Khả năng miêu tả sinh động, giọng điệu châm biếm sắc sảo và logic lịch sử chặt chẽ.',
        descEn: 'Best literary prose and refined humor. Vivid descriptions, sharp historical satire, and tightly woven narrative logic.'
      }
    ]
  }
};

export class SettingsView {
  constructor({ storyModel, audioView, cardView, userProfileModel }) {
    this.$ = s => document.querySelector(s);
    this.storyModel = storyModel;
    this.audioView = audioView;
    this.cardView = cardView;
    this.userProfileModel = userProfileModel;

    this.dialog = this.$('#settingsDlg') || this.$('#setDlg');
    this.sProv = this.$('#sProv');
    this.sKey = this.$('#sKey');
    this.sKeyHelp = this.$('#sKeyHelp');
    this.btnToggleKey = this.$('#btnToggleKey');
    this.sModel = this.$('#sModel');
    this.sModelRec = this.$('#sModelRec');
    this.sVol = this.$('#sVol');
    this.sSave = this.$('#sSave');
    this.sClear = this.$('#sClear');
    this.btnSettings = this.$('#btnSettings');

    this.isKeyVisible = false;
  }

  init() {
    if (!this.dialog) return;

    // Open Settings Modal
    if (this.btnSettings) {
      this.btnSettings.onclick = () => {
        this.open();
      };
    }

    // Close buttons
    const closeBtn = this.dialog.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    // Provider change handler
    if (this.sProv) {
      this.sProv.onchange = () => {
        const providerId = this.sProv.value;
        const cfg = PROVIDER_CONFIG[providerId] || PROVIDER_CONFIG.gemini;
        this.updateKeyHelpBadge(providerId, this.getLang());
        this.populateModels(providerId, cfg.defaultModel, this.getLang());
      };
    }

    // Model change handler
    if (this.sModel) {
      this.sModel.onchange = () => {
        const providerId = this.sProv ? this.sProv.value : 'gemini';
        const modelId = this.sModel.value;
        this.updateModelRecommendation(providerId, modelId, this.getLang());
      };
    }

    // Password visibility toggle
    if (this.btnToggleKey && this.sKey) {
      this.btnToggleKey.onclick = () => {
        this.isKeyVisible = !this.isKeyVisible;
        this.sKey.type = this.isKeyVisible ? 'text' : 'password';
        this.btnToggleKey.textContent = this.isKeyVisible ? '🙈' : '👁️';
      };
    }

    // Volume change handler
    if (this.sVol && this.audioView) {
      this.sVol.oninput = () => {
        const v = Number(this.sVol.value) / 100;
        this.audioView.setVol(v);
      };
    }

    // Save Settings
    if (this.sSave) {
      this.sSave.onclick = () => {
        const provider = this.sProv ? this.sProv.value : 'gemini';
        const key = this.sKey ? this.sKey.value.trim() : '';
        const model = this.sModel ? this.sModel.value : (PROVIDER_CONFIG[provider]?.defaultModel || 'gemini-3.8-flash');

        this.storyModel.saveSettings({
          provider,
          apiKey: key,
          key,
          selectedModel: model,
          model
        });

        this.close();
        if (this.cardView && this.userProfileModel) {
          this.cardView.toast(this.userProfileModel.t('savedSet') || 'Settings saved.');
        }
      };
    }

    // Clear Settings
    if (this.sClear) {
      this.sClear.onclick = () => {
        this.storyModel.clearSettings();
        if (this.sKey) this.sKey.value = '';
        if (this.sProv) this.sProv.value = 'gemini';
        this.updateKeyHelpBadge('gemini', this.getLang());
        this.populateModels('gemini', 'gemini-3.8-flash', this.getLang());
        if (this.cardView && this.userProfileModel) {
          this.cardView.toast(this.getLang() === 'vi' ? 'Đã xóa khóa API và đặt lại mặc định.' : 'API Key cleared. Reset to default.');
        }
      };
    }
  }

  getLang() {
    return this.userProfileModel?.lang || 'vi';
  }

  open() {
    if (!this.dialog) return;
    const settings = this.storyModel.getSettings();
    const lang = this.getLang();

    // Ensure provider is one of the 3 supported
    let provider = settings.provider;
    if (!PROVIDER_CONFIG[provider]) {
      provider = 'gemini';
    }

    // Populate Providers
    this.populateProviders(provider);

    // Set Key value
    if (this.sKey) {
      this.sKey.value = settings.apiKey || settings.key || '';
      this.sKey.type = 'password';
      this.isKeyVisible = false;
      if (this.btnToggleKey) this.btnToggleKey.textContent = '👁️';
    }

    // Update Key Link Badge
    this.updateKeyHelpBadge(provider, lang);

    // Populate Models & Update Recommendation
    const selectedModel = settings.selectedModel || settings.model || PROVIDER_CONFIG[provider].defaultModel;
    this.populateModels(provider, selectedModel, lang);

    // Sync sound volume
    if (this.sVol && this.audioView) {
      this.sVol.value = Math.round(this.audioView.vol * 100);
    }

    this.dialog.showModal();
  }

  close() {
    if (this.dialog && this.dialog.open) {
      this.dialog.close();
    }
  }

  populateProviders(selectedProvider = 'gemini') {
    if (!this.sProv) return;
    this.sProv.replaceChildren(
      ...Object.values(PROVIDER_CONFIG).map(cfg => {
        const opt = document.createElement('option');
        opt.value = cfg.id;
        opt.textContent = cfg.id === 'gemini' ? `${cfg.name} (Default)` : cfg.name;
        if (cfg.id === selectedProvider) opt.selected = true;
        return opt;
      })
    );
  }

  updateKeyHelpBadge(providerId, lang = 'vi') {
    if (!this.sKeyHelp) return;
    const cfg = PROVIDER_CONFIG[providerId] || PROVIDER_CONFIG.gemini;
    const isVi = lang === 'vi';
    const helpPrefix = isVi ? cfg.keyHelpTextVi : cfg.keyHelpTextEn;

    this.sKeyHelp.replaceChildren();

    const span = document.createElement('span');
    span.className = 'api-help-text';
    span.textContent = `${helpPrefix} `;

    const link = document.createElement('a');
    link.className = 'api-link';
    link.href = cfg.keyUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = cfg.keyUrl;

    this.sKeyHelp.append(span, link);
  }

  populateModels(providerId, selectedModelId, lang = 'vi') {
    if (!this.sModel) return;
    const cfg = PROVIDER_CONFIG[providerId] || PROVIDER_CONFIG.gemini;
    const isVi = lang === 'vi';

    this.sModel.replaceChildren(
      ...cfg.models.map(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = isVi ? m.labelVi : m.labelEn;
        if (m.id === selectedModelId) opt.selected = true;
        return opt;
      })
    );

    // If selectedModelId wasn't found in this provider's models, select the default model
    if (!cfg.models.some(m => m.id === selectedModelId)) {
      this.sModel.value = cfg.defaultModel;
    }

    // Update recommendation box
    this.updateModelRecommendation(providerId, this.sModel.value, lang);
  }

  updateModelRecommendation(providerId, modelId, lang = 'vi') {
    if (!this.sModelRec) return;
    const cfg = PROVIDER_CONFIG[providerId] || PROVIDER_CONFIG.gemini;
    const model = cfg.models.find(m => m.id === modelId) || cfg.models[0];
    const isVi = lang === 'vi';

    const titleText = isVi ? '💡 Gợi ý Mô hình:' : '💡 Model Recommendation:';
    const descText = isVi ? model.descVi : model.descEn;

    this.sModelRec.replaceChildren();

    const headDiv = document.createElement('div');
    headDiv.className = 'model-rec-header';
    headDiv.textContent = titleText;

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'model-rec-text';
    bodyDiv.textContent = descText;

    this.sModelRec.append(headDiv, bodyDiv);
  }

  applyLanguage(lang) {
    if (!this.dialog || !this.dialog.open) return;
    const provider = this.sProv ? this.sProv.value : 'gemini';
    const selectedModel = this.sModel ? this.sModel.value : null;

    this.updateKeyHelpBadge(provider, lang);
    this.populateModels(provider, selectedModel, lang);
  }
}

export default SettingsView;
