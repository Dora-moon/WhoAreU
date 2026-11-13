/**
 * @file StoryModel.js
 * @description Story Generator logic with LLM API (OpenAI, Gemini, Claude)
 * and rich bilingual Offline Fallback Template Engine.
 */

import { TG } from './UserProfileModel.js';

export const DEF_MODELS = {
  gemini: 'gemini-3.8-flash',
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-haiku-20241022'
};

// Story Tone configs — each tone rewrites the narrator's voice, chapter framing,
// and the Butterfly Effect choice flavour. Used by both the LLM prompt and the
// offline template engine so the tone is consistent even without an API key.
export const STORY_TONE_CONFIG = {
  comedy: {
    label: 'Comedy & Absurd',
    voice: 'wacky, deadpan, sitcom energy; punchlines land on the historical facts',
    ch1: 'a bumbling first meeting where the protagonist trips into the target\'s orbit',
    ch2: 'a farcical misunderstanding that accidentally nudges history',
    ch3: 'the ridiculous revelation — the famous event happened because of a silly mistake',
    choice: 'a piece of hilariously bad advice',
    item: 'a gag cursed item'
  },
  epic: {
    label: 'Epic & Heroic',
    voice: 'grand, mythic, cinematic; sentences build like drumbeats toward destiny',
    ch1: 'a fated convergence under storm-lit skies, two titans of destiny meeting',
    ch2: 'a trial of resolve that forges the legend',
    ch3: 'the majestic revelation — the target\'s triumph was written in the stars',
    choice: 'a bold, heroic gamble',
    item: 'a legendary relic'
  },
  tragic: {
    label: 'Tragic & Melancholic',
    voice: 'somber, bittersweet, elegiac; the cost of history is felt in every line',
    ch1: 'a quiet, sorrowful encounter on the edge of a turning point',
    ch2: 'a heavy choice that leaves an invisible scar on both of them',
    ch3: 'the heartbreaking revelation — the target\'s sacrifice was the price of the event',
    choice: 'a desperate attempt to soften the blow',
    item: 'a mourning keepsake'
  },
  mystery: {
    label: 'Mystery & Thriller',
    voice: 'tense, suspenseful, noir-ish; clues are dropped like breadcrumbs',
    ch1: 'a shadowy first contact where nothing is quite what it seems',
    ch2: 'a web of secrets and red herrings tightening around the target',
    ch3: 'the chilling revelation — the event was engineered by an unseen hand',
    choice: 'a risky, covert move',
    item: 'a cryptic evidence piece'
  }
};

// Tone-specific sentence fragments layered on top of the base STORY_TEMPLATES.
// Each tone keeps the same 3-chapter / 3-choice skeleton but swaps the
// narrator's voice, the choice flavour, and the closing revelation.
// One-sentence tone prefixes prepended to ch1 in the offline template engine.
export const TONE_EN_PREFIX = {
  comedy: 'The narrator grins: ',
  epic: 'The narrator booms: ',
  tragic: 'The narrator whispers, heavy with sorrow: ',
  mystery: 'The narrator murmurs, eyes narrowed: '
};
export const TONE_VI_PREFIX = {
  comedy: 'Người kể chuyện mỉm cười: ',
  epic: 'Người kể chuyện vang lên, như sấm: ',
  tragic: 'Người kể thì thầm, nặng nề bởi nỗi tiếc: ',
  mystery: 'Người kể thì thầm, mắt narrowed: '
};

export const STORY_TONE_FRAGMENTS = {
  comedy: {
    voice: 'The narrator is a deadpan sitcom host who treats every historical milestone like a punchline.',
    ch1: 'The protagonist tumbles into the target\'s orbit with the grace of a drunk accordion.',
    ch2: 'A farcical mix-up of labels, borrowed hats, and one very confused raccoon.',
    ch3: 'The famous event happened because of a silly, well-meant mistake.',
    choice: 'a hilariously bad piece of advice',
    item: 'a gag cursed item'
  },
  epic: {
    voice: 'The narrator is a mythic bard; every sentence is a drumbeat toward destiny.',
    ch1: 'Two titans of destiny converge under storm-lit skies in a fated meeting.',
    ch2: 'A trial of resolve forges the legend against impossible odds.',
    ch3: 'The target\'s triumph was written in the stars by a bold, heroic gamble.',
    choice: 'a bold, heroic gamble',
    item: 'a legendary relic'
  },
  tragic: {
    voice: 'The narrator is an elegiac chronicler; every line carries the weight of what is lost.',
    ch1: 'A quiet, sorrowful encounter on the edge of a great turning point.',
    ch2: 'A heavy choice leaves an invisible scar on both of them.',
    ch3: 'The target\'s sacrifice was the price of the famous event.',
    choice: 'a desperate attempt to soften the blow',
    item: 'a mourning keepsake'
  },
  mystery: {
    voice: 'The narrator is a noir-ish detective dropping clues like breadcrumbs.',
    ch1: 'A shadowy first contact where nothing is quite what it seems.',
    ch2: 'A web of secrets and red herrings tightens around the target.',
    ch3: 'The event was engineered by an unseen hand — and the clues were there all along.',
    choice: 'a risky, covert move',
    item: 'a cryptic evidence piece'
  }
};

export const STORY_TEMPLATES = {
  en: {
    head: [
      "{NU} QUIETLY PRESENT AT {TU}'S MOMENT OF HISTORY",
      "LOCAL {RU} BLAMED FOR {TU}'S FAMOUS BREAKTHROUGH",
      "MULTIVERSE REBOOTS AFTER {RU} {NU} PRESSES THE RED BUTTON"
    ],
    ch1: [
      [
        "{slip} It was all {n} ({who}) had to go on. As {role}, {n} finally crossed paths with {t} ({target_role}, {bc}). The record is clear: {f1} Everything below about {t} is real; the only unusual detail is {n}, standing quietly in the background with the usual baggage: {h}.",
        "Chapter one is simple. {n}, {who}, arrives as {role} in the orbit of {t} ({target_role}, {bc}). Wikipedia puts it plainly: {f1} {n} listened, took notes, and, carrying {h}, felt strangely at home."
      ],
      [
        "{slip} The universe read it, laughed, and delivered {t} ({target_role}, {bc}) instead. {n} ({who}) — {role} by title, disaster by résumé — met {t} carrying {h} and zero plan. For fairness: {f1}",
        "On a Tuesday that was perfectly ordinary until it wasn't, {n} ({who}) tripped through a gap in time and landed in front of {t} ({target_role}). \"I'm your {role},\" {n} announced, mostly because nobody asked. {t} blinked. {f1}"
      ],
      [
        "{slip} The cosmos shredded the slip and fed it to a sentient vending machine, which spat out a portal. {n} ({who}), {role} of questionable cosmic authority, stepped through clutching {h} — and fell into {t}'s world ({target_role}, {bc}). Because even chaos needs a citation: {f1}",
        "Somewhere between breakfast and the heat death of the universe, a golden gacha capsule cracked open above {n} ({who}). Inside: a rift, a map to {t} ({target_role}, {bc}), and a title — {role}. {n} accepted without reading the terms. Background check: {f1}"
      ]
    ],
    ch2: [
      [
        "History gets crowded here. {t} was moving toward {ev}, and {n} — {age} years old, carrying {h} — kept offering sincere, unhelpful help. {f2} The facts hold; only the margins fill with {n}'s well-meaning interference.",
        "Then came the stretch every biography skims. {t} worked steadily toward {ev}; {n}, aged {age}, hovered nearby with {h}, taking the role of {role} very seriously. {f2}"
      ],
      [
        "Then everything went sideways. As {t} prepared for {ev}, {n} — {age}, armed with {h} and the confidence of a {role} — \"helpfully\" rearranged the schedule, swapped two crucial labels, and announced that it was fine. It was not fine. It was, however, historic.",
        "{t} had one job: {ev}. {n} had {h} and an opinion. The combination produced a three-day misunderstanding, one borrowed hat, and a rumor that {t} \"only works with {h} nearby\". {f2}"
      ],
      [
        "At 3:14 a.m. the multiverse hiccupped. {n}, {age} years old and radiating {h} energy, joined {t} in duelling a sentient filing cabinet, signing a treaty with a time-travelling raccoon, and accidentally wiring {ev} through six alternate dimensions.",
        "Gravity took a sabbatical. {t} floated toward {ev} while {n}, powered by {h} and a {role} license, conducted the orchestra of colliding timelines. A dragon arrived to mediate. Nobody asked it to."
      ]
    ],
    ch: [
      [
        "Tell {t} to follow popular opinion and skip the cautious experts.",
        "Urge {t} to decide right now instead of sleeping on it.",
        "Suggest {t} ignore one small, nagging warning sign."
      ],
      [
        "Tell {t} to trust the loudest rumor in town.",
        "Convince {t} to settle the big decision with a coin flip.",
        "Press your lucky keepsake into {t}'s hand: \"it never fails\"."
      ],
      [
        "Hand {t} a glowing multiverse remote and whisper: \"press the red one.\"",
        "Teach {t} your forbidden hobby ritual in the middle of a time storm.",
        "Sell {t} a lifetime warranty on destiny (non-refundable)."
      ]
    ],
    rev: [
      "And here is the quiet revelation hidden in the footnotes of {t}'s Wikipedia page:",
      "Plot twist, buried in the edit history of {t}'s Wikipedia page:",
      "The multiverse finally reveals its secret, carved into {t}'s Wikipedia page by an unseen editor:"
    ],
    cons: [
      [
        "{n}'s nudge toward popular opinion pushed {t} down the exact path that produced {ev}.",
        "{n}'s push for a snap decision made {t} commit that very day — the decision that led straight to {ev}.",
        "{n}'s suggestion to wave off a nagging warning left {t} free to carry on — straight into {ev}."
      ],
      [
        "Because {t} trusted the loudest rumor in town, plans changed overnight; that glorious mistake became {ev}.",
        "The coin landed on its edge, which everyone agreed meant \"yes\". That is how {ev} happened.",
        "The lucky keepsake did nothing — except give {t} the calm confidence to finally go through with {ev}."
      ],
      [
        "The red button rewired reality; the timeline bent and {ev} rewrote itself across seven universes.",
        "The ritual cracked the sky; lightning wrote {t}'s name across the stars and {ev} followed by popular demand.",
        "The warranty activated: destiny was officially insured, so {t} proceeded to {ev} without fear and with negative paperwork."
      ]
    ],
    close: [
      "History records {ev}. It does not record {n}. {n} has made peace with that.",
      "{t} got the credit. {n} got a lifetime of \"you did WHAT?\" and a surprisingly valid reference letter.",
      "The timeline sealed itself shut, the raccoon sent an invoice, and {n} was named Honorary Chaos {role} across forty-two dimensions."
    ],
    items: [
      ["The Megaphone of Unverified Rumors", "Makes any sentence sound true for exactly 12 seconds."],
      ["Coin of Inevitable Edge", "Lands on its edge whenever a historic decision is pending."],
      ["Lucky Keepsake of Misplaced Confidence", "+100% courage, −100% judgment."]
    ],
    sfx: ["", ", Collector's Edition", ", Dimensional Edition"]
  },
  vi: {
    head: [
      "{NU} LẶNG LẼ CÓ MẶT TRONG KHOẢNH KHẮC LỊCH SỬ CỦA {TU}",
      "{RU} ĐỊA PHƯƠNG BỊ CÁO BUỘC GÂY RA BƯỚC ĐỘT PHÁ NỔI TIẾNG CỦA {TU}",
      "ĐA VŨ TRỤ KHỞI ĐỘNG LẠI SAU KHI {RU} {NU} BẤM NÚT ĐỎ"
    ],
    ch1: [
      [
        "{slip} Đó là tất cả những gì {n} ({who}) có trong tay. Trong vai {role}, {n} cuối cùng cũng chạm mặt {t} ({target_role}, {bc}). Hồ sơ ghi rõ: {f1} Mọi điều về {t} dưới đây đều có thật; chi tiết lạ duy nhất là {n} đứng lặng lẽ phía sau, mang theo hành lý quen thuộc: {h}.",
        "Chương đầu rất giản dị. {n}, {who}, xuất hiện với tư cách {role} bên cạnh {t} ({target_role}, {bc}). Bách khoa toàn thư nói thẳng: {f1} {n} lắng nghe, ghi chép, và với món hành lý {h}, bỗng thấy mình ở đúng chỗ."
      ],
      [
        "{slip} Vũ trụ đọc xong, bật cười, rồi giao {t} ({target_role}, {bc}) thay thế. {n} ({who}) — chức danh là {role}, lý lịch là thảm họa — gặp {t} khi đang mang theo {h} và không có kế hoạch nào. Để cho công bằng: {f1}",
        "Vào một ngày thứ Ba bình thường đến mức không còn bình thường, {n} ({who}) vấp qua một khe hở thời gian và rơi ngay trước mặt {t} ({target_role}). \"Tôi là {role} của bạn đây,\" {n} tuyên bố, chủ yếu vì chẳng ai hỏi. {t} chớp mắt. {f1}"
      ],
      [
        "{slip} Vũ trụ xé nát tờ phiếu rồi nhét vào một máy bán hàng tự động có ý thức, và nó nhả ra một cánh cổng. {n} ({who}), {role} với thẩm quyền vũ trụ đáng ngờ, bước qua, tay ôm {h} — và rơi vào thế giới của {t} ({target_role}, {bc}). Vì hỗn loạn cũng cần trích dẫn: {f1}",
        "Giữa bữa sáng và cái chết nhiệt của vũ trụ, một quả trứng gacha bằng vàng nứt ra trên đầu {n} ({who}). Bên trong có một vết nứt không gian, tấm bản đồ dẫn tới {t} ({target_role}, {bc}) và một chức danh: {role}. {n} nhận luôn mà không đọc điều khoản. Lý lịch trích ngang: {f1}"
      ]
    ],
    ch2: [
      [
        "Đến đây lịch sử bắt đầu đông đúc. {t} đang tiến dần tới {ev}, còn {n} — {age} tuổi, mang theo {h} — liên tục đưa ra sự giúp đỡ chân thành nhưng vô dụng. {f2} Sự thật vẫn nguyên vẹn; chỉ có phần lề trang là đầy những can thiệp thiện chí của {n}.",
        "Rồi đến đoạn mà sách tiểu sử nào cũng lướt qua. {t} đều đặn làm việc hướng tới {ev}; {n}, {age} tuổi, lởn vởn gần đó với {h}, đảm nhận vai {role} cực kỳ nghiêm túc. {f2}"
      ],
      [
        "Rồi mọi thứ đi chệch hướng. Khi {t} chuẩn bị cho {ev}, {n} — {age} tuổi, mang theo {h} và sự tự tin của một {role} — \"tốt bụng\" sắp xếp lại lịch trình, hoán đổi hai nhãn quan trọng, rồi tuyên bố mọi chuyện ổn. Không ổn. Nhưng nó đã đi vào lịch sử.",
        "{t} chỉ có một việc: {ev}. {n} có {h} và một ý kiến. Sự kết hợp đó tạo ra ba ngày hiểu lầm, một chiếc mũ mượn, và lời đồn rằng {t} \"chỉ làm việc được khi có {h} ở gần\". {f2}"
      ],
      [
        "3 giờ 14 sáng, đa vũ trụ nấc cụt. {n}, {age} tuổi và tỏa ra năng lượng {h}, cùng {t} đấu tay đôi với một tủ hồ sơ có tri giác, ký hiệp ước với một con gấu mèo du hành thời gian, và vô tình đấu dây {ev} qua sáu chiều không gian song song.",
        "Trọng lực xin nghỉ phép. {t} lơ lửng tiến về {ev} trong khi {n}, chạy bằng {h} và giấy phép {role}, chỉ huy dàn nhạc của những dòng thời gian đang va nhau. Một con rồng xuất hiện để hòa giải. Không ai nhờ nó."
      ]
    ],
    ch: [
      [
        "Bảo {t} nghe theo số đông và bỏ qua các chuyên gia thận trọng.",
        "Giục {t} quyết định ngay thay vì ngủ một đêm suy nghĩ.",
        "Gợi ý {t} bỏ qua một dấu hiệu cảnh báo nhỏ đang làm phiền."
      ],
      [
        "Bảo {t} tin vào lời đồn to nhất thị trấn.",
        "Thuyết phục {t} tung đồng xu để quyết định chuyện hệ trọng.",
        "Nhét món bùa may mắn của bạn vào tay {t}: \"chưa bao giờ hỏng\"."
      ],
      [
        "Đưa cho {t} chiếc điều khiển đa vũ trụ phát sáng và thì thầm: \"bấm nút đỏ đi.\"",
        "Dạy {t} nghi lễ sở thích cấm kỵ của bạn ngay giữa cơn bão thời gian.",
        "Bán cho {t} gói bảo hành định mệnh trọn đời (không hoàn tiền)."
      ]
    ],
    rev: [
      "Và đây là điều bí mật nằm lặng lẽ trong phần chú thích của trang Wikipedia về {t}:",
      "Cú twist nằm sâu trong lịch sử chỉnh sửa trang Wikipedia của {t}:",
      "Đa vũ trụ cuối cùng tiết lộ bí mật, được một biên tập viên vô hình khắc lên trang Wikipedia của {t}:"
    ],
    cons: [
      [
        "Lời khuyên theo số đông của {n} đẩy {t} đi đúng con đường dẫn tới {ev}.",
        "Việc {n} giục quyết định ngay khiến {t} cam kết ngay hôm đó — quyết định dẫn thẳng tới {ev}.",
        "Gợi ý bỏ qua dấu hiệu cảnh báo của {n} để {t} cứ thế tiến lên — thẳng tới {ev}."
      ],
      [
        "Vì {t} tin vào lời đồn to nhất thị trấn, kế hoạch đổi hướng chỉ sau một đêm; sai lầm huy hoàng đó trở thành {ev}.",
        "Đồng xu rơi dựng đứng, và mọi người nhất trí rằng nghĩa là \"có\". Đó là cách {ev} xảy ra.",
        "Món bùa may mắn chẳng làm gì cả — ngoài việc cho {t} đủ bình tĩnh để cuối cùng thực hiện {ev}."
      ],
      [
        "Nút đỏ nối lại thực tại; dòng thời gian cong đi và {ev} tự viết lại qua bảy vũ trụ.",
        "Nghi lễ làm nứt bầu trời; sấm sét viết tên {t} lên các vì sao và {ev} xảy ra theo yêu cầu của đông đảo khán giả.",
        "Bảo hành có hiệu lực: định mệnh chính thức được bảo hiểm, nên {t} tiến tới {ev} mà không sợ gì, kèm một núi giấy tờ âm."
      ]
    ],
    close: [
      "Lịch sử ghi lại {ev}. Lịch sử không ghi lại {n}. {n} đã chấp nhận điều đó.",
      "{t} nhận công trạng. {n} nhận về một đời câu hỏi \"bạn đã làm GÌ cơ?\" và một thư giới thiệu hợp lệ đến bất ngờ.",
      "Dòng thời gian tự đóng lại, con gấu mèo gửi hóa đơn, và {n} được phong Danh Dự {role} Hỗn Loạn tại bốn mươi hai chiều không gian."
    ],
    items: [
      ["Loa Phóng Thanh Tin Đồn Chưa Kiểm Chứng", "Khiến mọi câu nói nghe có vẻ đúng trong đúng 12 giây."],
      ["Đồng Xu Đứng Cạnh Định Mệnh", "Luôn rơi dựng đứng mỗi khi một quyết định lịch sử đang chờ."],
      ["Bùa May Mắn Của Sự Tự Tin Sai Chỗ", "+100% can đảm, −100% phán đoán."]
    ],
    sfx: ["", " (Bản Sưu Tầm)", " (Bản Liên Chiều)"]
  }
};

export class StoryModel {
  constructor() {
    this.storageKey = 'wg_set';
    this.settings = this._loadSettings();
  }

  _loadSettings() {
    try {
      if (typeof localStorage === 'undefined') {
        return {
          provider: 'gemini',
          apiKey: '',
          key: '',
          selectedModel: 'gemini-3.8-flash',
          model: 'gemini-3.8-flash'
        };
      }

      // Check direct individual keys
      const dirProv = localStorage.getItem('provider');
      const dirKey = localStorage.getItem('apiKey');
      const dirModel = localStorage.getItem('selectedModel');

      // Check serialized object storage
      let parsed = {};
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (e) {}
      }

      let provider = dirProv || parsed.provider || 'gemini';
      if (provider === 'none') provider = 'gemini';

      const apiKey = (dirKey !== null ? dirKey : (parsed.apiKey || parsed.key || '')).trim();
      const defaultModel = DEF_MODELS[provider] || 'gemini-3.8-flash';
      const selectedModel = dirModel || parsed.selectedModel || parsed.model || defaultModel;

      return {
        provider,
        apiKey,
        key: apiKey,
        selectedModel,
        model: selectedModel
      };
    } catch (e) {
      return {
        provider: 'gemini',
        apiKey: '',
        key: '',
        selectedModel: 'gemini-3.8-flash',
        model: 'gemini-3.8-flash'
      };
    }
  }

  saveSettings(settings) {
    const provider = settings.provider || 'gemini';
    const apiKey = (settings.apiKey !== undefined ? settings.apiKey : (settings.key !== undefined ? settings.key : this.settings.apiKey || '')).trim();
    const selectedModel = settings.selectedModel || settings.model || DEF_MODELS[provider] || 'gemini-3.8-flash';

    this.settings = {
      provider,
      apiKey,
      key: apiKey,
      selectedModel,
      model: selectedModel
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('provider', provider);
        localStorage.setItem('apiKey', apiKey);
        localStorage.setItem('selectedModel', selectedModel);
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      }
    } catch (e) {}

    return this.settings;
  }

  clearSettings() {
    this.settings = {
      provider: 'gemini',
      apiKey: '',
      key: '',
      selectedModel: 'gemini-3.8-flash',
      model: 'gemini-3.8-flash'
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('apiKey');
        localStorage.setItem('provider', 'gemini');
        localStorage.setItem('selectedModel', 'gemini-3.8-flash');
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      }
    } catch (e) {}
    return this.settings;
  }

  getSettings() {
    return this.settings;
  }

  fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (m, k) => (values[k] != null ? values[k] : '')).replace(/\s{2,}/g, ' ').trim();
  }

  buildCtx(card, inp, userProfileModel) {
    const rk = inp.roleKey === 'random'
      ? ['advisor', 'chaos', 'nemesis', 'bystander', 'scammer', 'roommate'][Math.floor(Math.random() * 6)]
      : inp.roleKey;
    const tone = (userProfileModel && typeof userProfileModel.getStoryTone === 'function')
      ? userProfileModel.getStoryTone()
      : 'comedy';
    const band = inp.absurd <= 24 ? 0 : inp.absurd <= 74 ? 1 : 2;
    const v = {};

    const cleanSummary = (card.summary || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    const sentences = cleanSummary.match(/[^.!?]+[.!?]+/g) || [cleanSummary];
    const lim = (x, n) => (x && x.length > n ? x.slice(0, n).replace(/\s+\S*$/, '') + '…' : (x || ''));
    const s1 = lim((sentences[0] || '').trim(), 240);
    const s2 = lim((sentences[1] || '').trim(), 200);

    const targetRole = card.targetRole || (card.dossier && card.dossier.targetRole) || (card.desc ? 'Huyền Thoại ' + card.desc : 'Nhân Vật Lịch Sử');
    const eraEn = userProfileModel.getEraLabel(card.era || inp.era, 'en');
    const eraVi = userProfileModel.getEraLabel(card.era || inp.era, 'vi');
    const ethEn = userProfileModel.getEthnicityLabel(card.ethnicity || inp.ethnicity, inp.ethnicityCustom, 'en');
    const ethVi = userProfileModel.getEthnicityLabel(card.ethnicity || inp.ethnicity, inp.ethnicityCustom, 'vi');
    const relEn = userProfileModel.getReligionLabel(card.religion || inp.religion, 'en');
    const relVi = userProfileModel.getReligionLabel(card.religion || inp.religion, 'vi');

    for (const L of ['en', 'vi']) {
      const roleL = rk === 'custom'
        ? (inp.roleCustom || (L === 'en' ? 'Wildcard' : 'Nhân Vật Bí Ẩn'))
        : userProfileModel.t('role_' + rk);

      const tgMatch = TG.find(x => x[0] === inp.tgender);
      const tg = tgMatch ? (L === 'en' ? tgMatch[1] : tgMatch[2]) : 'Any';
      const cl = card.countryId && card.countryId !== 'any' ? userProfileModel.getCountryLabel(card.countryId, L) : '';
      const reqC = inp.country === 'any' ? (L === 'en' ? 'anywhere' : 'bất kỳ đâu') : userProfileModel.getCountryLabel(inp.country, L);
      const trait = inp.trait || (L === 'en' ? 'none' : 'không có');
      const hobby = inp.hobbies || (L === 'en' ? 'professional napping' : 'ngủ nướng chuyên nghiệp');
      const born = card.birth + (card.death ? '–' + card.death : '');
      const curEra = L === 'vi' ? eraVi : eraEn;
      const curEth = L === 'vi' ? ethVi : ethEn;
      const curRel = L === 'vi' ? relVi : relEn;
      const ev = card.ev
        ? card.ev[L]
        : (L === 'en' ? `the legendary "${card.desc}" chapter of ${card.name}'s life` : `chương đời "${card.desc}" huyền thoại của ${card.name}`);

      const safeName = inp.name || userProfileModel.t('anon');
      v[L] = {
        n: safeName,
        NU: safeName.toUpperCase(),
        t: card.name,
        TU: card.name.toUpperCase(),
        role: roleL,
        RU: roleL.toUpperCase(),
        target_role: targetRole,
        TARGET_ROLE_U: targetRole.toUpperCase(),
        era: curEra,
        target_ethnicity: curEth,
        target_religion: curRel,
        age: inp.age,
        who: L === 'en' ? `${inp.age} years old${inp.gender ? ', ' + inp.gender : ''}` : `${inp.age} tuổi${inp.gender ? ', ' + inp.gender : ''}`,
        bc: born + (cl ? ', ' + cl : ''),
        f1: s1,
        f2: s2,
        ev,
        h: hobby,
        slip: L === 'en'
          ? `Your order slip read: [${tg} · ${curEra} · ${curEth} · ${curRel} · origin: ${reqC} · quirk: ${trait}].`
          : `Phiếu triệu hồi thời gian: [${tg} · ${curEra} · ${curEth} · ${curRel} · xuất thân: ${reqC} · điểm lạ: ${trait}].`
      };
    }

    return { band, v, inp, card, roleKey: rk, tone };
  }

  tonePrefix(tone, L) {
    const F = STORY_TONE_FRAGMENTS[tone] || STORY_TONE_FRAGMENTS.comedy;
    return L === 'vi'
      ? (TONE_VI_PREFIX[tone] || '')
      : (TONE_EN_PREFIX[tone] || '');
  }

  _toneCh1Prefix(tone, L) {
    return (L === 'vi' ? TONE_VI_PREFIX : TONE_EN_PREFIX)[tone] || '';
  }

  offlineStory(X) {
    const b = X.band;
    const v1 = Math.floor(Math.random() * 2);
    const v2 = Math.floor(Math.random() * 2);
    const tone = X.tone || 'comedy';
    const out = {};

    for (const L of ['en', 'vi']) {
      const V = X.v[L];
      const Tp = STORY_TEMPLATES[L];
      const f = s => this.fill(s, V);
      const tp = this._toneCh1Prefix(tone, L);

      // Single-paragraph 3-4 sentence intro (concise, one block, no bullets)
      const intro = f(L === 'en'
        ? 'A {role} named {n} ({who}) has just stepped through a rip in the timeline and landed in {t}\'s world ({target_role}, {bc}). The order slip was simple: meet the target, watch history happen, and stay out of the way. But the universe had other plans.'
        : 'Một {role} tên {n} ({who}) vừa bước qua một khe rạn thời gian và xuất hiện trong thế giới của {t} ({target_role}, {bc}). Phiếu triệu hồi rất đơn giản: gặp người mục tiêu, quan sát lịch sử xảy ra, và đừng can thiệp. Nhưng vũ trụ có ý khác.');

      out[L] = {
        headline: f(Tp.head[b]),
        intro,
        ch1: tp + f(Tp.ch1[b][v1]),
        ch2: f(Tp.ch2[b][v2]),
        choices: [0, 1, 2].map(i => ({
          text: f(Tp.ch[b][i]),
          ch3: f(Tp.rev[b] + ' ' + Tp.cons[b][i] + ' ' + Tp.close[b]),
          item: {
            name: Tp.items[i][0] + Tp.sfx[b],
            desc: Tp.items[i][1]
          }
        }))
      };
    }

    return out;
  }

  async callLLM(prompt) {
    const { provider, key, apiKey, selectedModel, model } = this.settings;
    const finalKey = (apiKey || key || '').trim();
    const finalModel = selectedModel || model || DEF_MODELS[provider] || 'gemini-3.8-flash';
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 70000);

    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(finalModel)}:generateContent?key=${encodeURIComponent(finalKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          signal: ac.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.95,
              responseMimeType: 'application/json'
            }
          })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error && j.error.message ? j.error.message : 'HTTP ' + res.status);
        return j.candidates[0].content.parts.map(p => p.text).join('');
      }

      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: ac.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + finalKey
          },
          body: JSON.stringify({
            model: finalModel,
            temperature: 0.95,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error && j.error.message ? j.error.message : 'HTTP ' + res.status);
        return j.choices[0].message.content;
      }

      if (provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: ac.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': finalKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: finalModel,
            max_tokens: 4096,
            temperature: 0.95,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error && j.error.message ? j.error.message : 'HTTP ' + res.status);
        return j.content.map(p => p.text || '').join('');
      }

      throw new Error('Unsupported provider: ' + provider);
    } finally {
      clearTimeout(to);
    }
  }

  isStoryValid(o) {
    return o &&
      typeof o.ch1 === 'string' &&
      typeof o.ch2 === 'string' &&
      Array.isArray(o.choices) &&
      o.choices.length >= 3 &&
      o.choices.slice(0, 3).every(c => c && c.text && c.ch3 && c.item && c.item.name);
  }

  async llmStory(X, userProfileModel) {
    const { inp, card, v, tone } = X;
    const toneConfig = STORY_TONE_CONFIG[tone] || STORY_TONE_CONFIG.comedy;
    const bands = [
      '0-24 = strictly grounded in the real biography; invent nothing about the target',
      '25-74 = time-travel comedy with ironic twists and chaotic synergy',
      '75-100 = pure absurdity / magic realism / multiverse layered over the real timeline'
    ];
    const bandDesc = bands[X.band];
    const tgMatch = TG.find(x => x[0] === inp.tgender);
    const tg = tgMatch ? tgMatch[1] : 'Any';
    const sum = (card.summary || '').replace(/\s+/g, ' ').slice(0, 900);

    // Target attributes
    const targetRole = card.targetRole || (card.dossier && card.dossier.targetRole) || (card.desc ? 'Huyền Thoại ' + card.desc : 'Nhân Vật Lịch Sử');
    const eraLabel = userProfileModel.getEraLabel(card.era || inp.era, 'vi');
    const ethnicityLabel = card.ethnicity || (card.dossier && card.dossier.originAndEthnicity) || userProfileModel.getEthnicityLabel(inp.ethnicity, inp.ethnicityCustom, 'vi');
    const religionLabel = card.religion || (card.dossier && card.dossier.religion) || userProfileModel.getReligionLabel(inp.religion, 'vi');

    // Standardized Structured Request Schema
    const standardizedPayload = {
      target_bio: `${card.name} (${card.birth}${card.death ? '–' + card.death : ' - alive'}): ${card.desc}. ${sum}`,
      target_role: targetRole,
      era: eraLabel,
      target_ethnicity: ethnicityLabel,
      target_religion: religionLabel,
      user_name: inp.name,
      user_role: `${X.v.en.role} (VI: ${X.v.vi.role})`,
      user_hobbies: inp.hobbies || 'professional napping',
      absurdity_percent: inp.absurd,
      story_tone: toneConfig.label,
      tone_voice: toneConfig.voice
    };

    const prompt = `You are the narrator of "Live Wikipedia Gacha", a historical story engine.
Write the SAME story in BOTH English and Vietnamese (natural, fluent Vietnamese).
Story Tone: ${toneConfig.label} — ${toneConfig.voice}
Absurdity level: ${inp.absurd}/100 → ${bandDesc}.

STANDARDIZED INPUT PAYLOAD:
${JSON.stringify(standardizedPayload, null, 2)}

ORDER SLIP FLAVOR: ${tg}, era "${eraLabel}", ethnicity "${ethnicityLabel}", religion "${religionLabel}", origin ${inp.country === 'any' ? 'anywhere' : userProfileModel.getCountryLabel(inp.country, 'en')}, quirk "${inp.trait || 'none'}", color swatch ${inp.skin}.

MISSION & STORYTELLING DIRECTIVE:
You MUST actively incorporate the target's specific cultural, historical era, ethnicity/heritage, and religious background elements ({ target_role, era, target_ethnicity, target_religion }) into the 3-Chapter story plot and the 3 interactive Butterfly Effect choices.
Highlight the clash or alliance between the user's role ("${X.v.vi.role}") and the historical target's role ("${targetRole}"), set in the context of their era (${eraLabel}) and beliefs (${religionLabel}).

NARRATOR VOICE: ${toneConfig.voice}
CHAPTER 1 FLAVOUR: ${toneConfig.ch1}
CHAPTER 2 FLAVOUR: ${toneConfig.ch2}
CHAPTER 3 REVELATION FLAVOUR: ${toneConfig.ch3}
BUTTERFLY EFFECT CHOICES: Each is ${toneConfig.choice}
CURSED ITEMS: Each is ${toneConfig.item}

RULES: Keep real facts about the target faithful to the summary. Be respectful: never mock anyone's gender, skin colour, ethnicity, nationality or disability. No sexual or graphic violent content. Use "they" for the target if unsure.
STRUCTURE: ch1 = "The Fateful Encounter" (how the protagonist in their role met the target in their era/cultural context, 70-100 words). ch2 = "The Historical Misadventure" (chaos mixing the target's real achievements with the protagonist's age, gender and weird habit, 80-110 words). choices = exactly 3 DISTINCT "bad advice" actions the protagonist could give the target before the climax (text ≤ 16 words, weaving in the cultural/religious/era flavor). For each choice, ch3 = "The Secret Wiki Revelation" (60-90 words) revealing that the famous event on the target's Wikipedia page happened because of THAT advice; plus item = a "Cursed Item" {name, desc (one line)}. Keep the choices in the same order in both languages.
Return ONLY valid JSON, no markdown:
{"en":{"headline":"newspaper headline","ch1":"","ch2":"","choices":[{"text":"","ch3":"","item":{"name":"","desc":""}},{...},{...}]},"vi":{same structure in Vietnamese}}`;

    const raw = await this.callLLM(prompt);
    const a = raw.indexOf('{');
    const b = raw.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('bad JSON');
    const j = JSON.parse(raw.slice(a, b + 1));
    if (!this.isStoryValid(j.en) || !this.isStoryValid(j.vi)) throw new Error('incomplete story');

    for (const L of ['en', 'vi']) {
      j[L].headline = j[L].headline || X.v[L].NU;
      j[L].choices = j[L].choices.slice(0, 3).map(c => ({
        text: String(c.text),
        ch3: String(c.ch3),
        item: {
          name: String(c.item.name),
          desc: String(c.item.desc || '')
        }
      }));
    }

    return j;
  }

  async generateStory(card, inp, userProfileModel) {
    const X = this.buildCtx(card, inp, userProfileModel);
    let story = null;
    let mode = 'offline';

    // Refresh settings from storage to ensure latest API key and model selection
    this.settings = this._loadSettings();

    const apiKey = (this.settings.apiKey || this.settings.key || '').trim();
    const provider = this.settings.provider;

    if (provider && provider !== 'none' && apiKey) {
      try {
        story = await this.llmStory(X, userProfileModel);
        mode = provider;
      } catch (err) {
        console.warn(`[StoryModel] ${provider} generation failed, safely falling back to offline template engine:`, err);
        story = null;
        mode = 'offline';
      }
    }

    if (!story) {
      story = this.offlineStory(X);
      mode = 'offline';
    }

    return { story, mode, context: X };
  }

  getSecret2077Entry() {
    const mk = (arr) => ({
      headline: arr[0],
      ch1: arr[1],
      ch2: arr[2],
      ch3: arr[3],
      choice: '—',
      itemName: arr[4],
      itemDesc: arr[5]
    });

    const en = [
      'LOCAL DEVELOPER FROM 2077 REFUSES TO EXPLAIN THE FUTURE',
      'You, aged 2077 years of accumulated browser tabs, appear in the doorway of a very confused present.',
      'You warn everyone about the one bug that will ruin the next century. Nobody listens; they are busy rebasing.',
      'The secret revelation: every historical edit war began with a typo you made at 3 a.m. Everything is, regrettably, your fault.',
      'Stack Overflow of Destiny',
      'Every answer is marked as duplicate. Includes a free time paradox.'
    ];

    const vi = [
      'LẬP TRÌNH VIÊN TỪ NĂM 2077 TỪ CHỐI GIẢI THÍCH TƯƠNG LAI',
      'Bạn, với 2077 năm tích lũy tab trình duyệt, xuất hiện ở ngưỡng cửa của một hiện tại đang rất bối rối.',
      'Bạn cảnh báo mọi người về con bug duy nhất sẽ phá hỏng thế kỷ tới. Không ai nghe; họ đang bận rebase.',
      'Bí mật được tiết lộ: mọi cuộc chiến chỉnh sửa trong lịch sử đều bắt đầu từ một lỗi chính tả bạn gõ lúc 3 giờ sáng. Thật tiếc, mọi thứ đều là lỗi của bạn.',
      'Stack Overflow của Định Mệnh',
      'Mọi câu trả lời đều bị đánh dấu trùng lặp. Tặng kèm một nghịch lý thời gian.'
    ];

    return {
      id: 'secret-2077',
      ts: Date.now(),
      card: {
        name: 'You, from 2077',
        birth: 2077,
        death: null,
        countryId: 'any',
        desc: 'Time-traveling developer',
        summary: 'A mysterious figure who knows what the next commit will break.',
        img: null,
        url: 'https://en.wikipedia.org/wiki/Time_travel',
        urlVi: null,
        tier: 'rare',
        score: 100,
        source: 'offline'
      },
      st: { en: mk(en), vi: mk(vi) },
      absurd: 100
    };
  }
}

export default StoryModel;
