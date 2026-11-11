/**
 * @file UserProfileModel.js
 * @description Handles User Profile, Age, Role, Hobbies, Target Console Parameters,
 * LocalStorage persistence, i18n dictionaries, and locks state.
 */

export const COUNTRIES = [
  ['any', 'Anywhere', 'Bất kỳ nơi nào', '', '', '🌐'],
  ['US', 'United States', 'Hoa Kỳ', 'American', 'American|United States', '🇺🇸'],
  ['GB', 'United Kingdom', 'Vương quốc Anh', 'British', 'British|English|Scottish|Welsh|United Kingdom', '🇬🇧'],
  ['FR', 'France', 'Pháp', 'French', 'French|France', '🇫🇷'],
  ['DE', 'Germany', 'Đức', 'German', 'German|Germany', '🇩🇪'],
  ['IT', 'Italy', 'Ý', 'Italian', 'Italian|Italy', '🇮🇹'],
  ['ES', 'Spain', 'Tây Ban Nha', 'Spanish', 'Spanish|Spain', '🇪🇸'],
  ['RU', 'Russia', 'Nga', 'Russian', 'Russian|Soviet', '🇷🇺'],
  ['CN', 'China', 'Trung Quốc', 'Chinese', 'Chinese|China', '🇨🇳'],
  ['JP', 'Japan', 'Nhật Bản', 'Japanese', 'Japanese|Japan', '🇯🇵'],
  ['KR', 'South Korea', 'Hàn Quốc', 'South Korean', 'South Korean|Korean', '🇰🇷'],
  ['IN', 'India', 'Ấn Độ', 'Indian', 'Indian|India', '🇮🇳'],
  ['VN', 'Vietnam', 'Việt Nam', 'Vietnamese', 'Vietnamese|Vietnam', '🇻🇳'],
  ['BR', 'Brazil', 'Brazil', 'Brazilian', 'Brazilian|Brazil', '🇧🇷'],
  ['MX', 'Mexico', 'Mexico', 'Mexican', 'Mexican|Mexico', '🇲🇽'],
  ['CA', 'Canada', 'Canada', 'Canadian', 'Canadian|Canada', '🇨🇦'],
  ['AU', 'Australia', 'Úc', 'Australian', 'Australian|Australia', '🇦🇺'],
  ['EG', 'Egypt', 'Ai Cập', 'Egyptian', 'Egyptian|Egypt', '🇪🇬'],
  ['NG', 'Nigeria', 'Nigeria', 'Nigerian', 'Nigerian|Nigeria', '🇳🇬'],
  ['ZA', 'South Africa', 'Nam Phi', 'South African', 'South African', '🇿🇦'],
  ['TR', 'Turkey', 'Thổ Nhĩ Kỳ', 'Turkish', 'Turkish|Turkey', '🇹🇷'],
  ['SE', 'Sweden', 'Thụy Điển', 'Swedish', 'Swedish|Sweden', '🇸🇪'],
  ['PL', 'Poland', 'Ba Lan', 'Polish', 'Polish|Poland', '🇵🇱'],
  ['NL', 'Netherlands', 'Hà Lan', 'Dutch', 'Dutch|Netherlands', '🇳🇱'],
  ['AR', 'Argentina', 'Argentina', 'Argentine', 'Argentine|Argentina', '🇦🇷'],
  ['TH', 'Thailand', 'Thái Lan', 'Thai', 'Thai|Thailand', '🇹🇭'],
  ['ID', 'Indonesia', 'Indonesia', 'Indonesian', 'Indonesian|Indonesia', '🇮🇩'],
  ['IE', 'Ireland', 'Ireland', 'Irish', 'Irish|Ireland', '🇮🇪'],
  ['GR', 'Greece', 'Hy Lạp', 'Greek', 'Greek|Greece', '🇬🇷'],
  ['IR', 'Iran', 'Iran', 'Iranian', 'Iranian|Iran', '🇮🇷'],
  ['PH', 'Philippines', 'Philippines', 'Filipino', 'Filipino|Philippine', '🇵🇭']
];

export const CRX = COUNTRIES.filter(c => c[4]).map(c => [c[0], new RegExp('\\b(' + c[4] + ')\\b', 'i')]);

export const ERAS = [
  ['any', 'Any Era / All-Time', 'Mọi kỷ nguyên (Any Era / All-Time)', -3000, 2026],
  ['ancient_medieval', 'Ancient & Medieval (Before 1500)', 'Thời Cổ Đại & Trung Đại (Trước 1500)', -3000, 1499],
  ['century_16_18', '16th – 18th Century (1500 – 1799)', 'Thế kỷ 16 - 18 (1500 – 1799)', 1500, 1799],
  ['century_19', '19th Century (1800 – 1899)', 'Thế kỷ 19 (1800 – 1899)', 1800, 1899],
  ['century_20_early', '20th Century: World Wars & Classic (1900 – 1949)', 'Thế kỷ 20: Thế chiến & Cổ điển (1900 – 1949)', 1900, 1949],
  ['century_20_late', '20th Century: Modern & Retro (1950 – 1999)', 'Thế kỷ 20: Hiện đại & Retro (1950 – 1999)', 1950, 1999],
  ['century_21', '21st Century: Contemporary (2000 – Present)', 'Thế kỷ 21: Đương đại (2000 – Nay)', 2000, 2026]
];

export const ETHNICITIES = [
  ['any', 'Any', 'Mọi nguồn gốc (Any)', ''],
  ['jewish', 'Jewish', 'Người Do Thái (Jewish)', 'Jewish|Jew|Judaism|Hebrew|Do Thái'],
  ['austrian', 'Austrian', 'Người Áo (Austrian)', 'Austrian|Austria|Áo'],
  ['german', 'Germanian', 'Người Đức (Germanian)', 'German|Germanic|Germany|Đức'],
  ['han', 'Han Chinese', 'Người Han (Han Chinese)', 'Han|Chinese|China|Hán|Trung Quốc'],
  ['slavic', 'Slavic', 'Người Slav (Slavic)', 'Slav|Slavic|Russian|Polish|Ukrainian|Czech|Slavơ|Nga|Ba Lan'],
  ['anglo_saxon', 'Anglo-Saxon', 'Người Anglo-Saxon', 'Anglo-Saxon|English|British|Anh'],
  ['roman_italic', 'Italic / Roman', 'Người La Mã / Ý (Italic / Roman)', 'Roman|Italic|Italian|Italy|La Mã|Ý'],
  ['custom', 'Custom Input...', 'Tự nhập tùy chỉnh (Custom Input)...', '']
];

export const RELIGIONS = [
  ['any', 'Any', 'Mọi tín ngưỡng (Any)', ''],
  ['christianity', 'Christianity / Catholic', 'Công giáo / Thiên Chúa giáo (Christianity)', 'Christian|Christianity|Catholic|Protestant|Orthodox|Công giáo|Thiên Chúa giáo|Cơ Đốc'],
  ['islam', 'Islam', 'Hồi giáo (Islam)', 'Islam|Muslim|Sunni|Shia|Hồi giáo|Đạo Hồi'],
  ['buddhism', 'Buddhism', 'Phật giáo (Buddhism)', 'Buddhism|Buddhist|Phật giáo|Đạo Phật'],
  ['judaism', 'Judaism', 'Do Thái giáo (Judaism)', 'Judaism|Jewish|Do Thái giáo'],
  ['atheist', 'Atheist / Secular', 'Vô thần / Triết học (Atheist / Secular)', 'Atheist|Atheism|Secular|Philosophical|Agnostic|Vô thần|Triết học'],
  ['polytheism', 'Polytheism / Pagans', 'Thần thoại / Đa thần (Polytheism / Pagans)', 'Polytheism|Pagan|Mythology|Greek mythology|Norse mythology|Pantheon|Đa thần|Thần thoại']
];

export const TG = [
  ['any', 'Surprise me / Any', 'Ngẫu nhiên / Bất kỳ'],
  ['male', 'Male', 'Nam'],
  ['female', 'Female', 'Nữ'],
  ['helicopter', 'Apache Helicopter', 'Trực thăng Apache'],
  ['washer', 'Vintage Washing Machine', 'Máy giặt cổ'],
  ['alien', 'Alien Entity', 'Thực thể ngoài hành tinh'],
  ['toaster', 'Sentient Toaster', 'Máy nướng bánh có ý thức'],
  ['printer', 'Haunted Printer', 'Máy in bị ma ám']
];

export const ROLES = ['advisor', 'chaos', 'nemesis', 'bystander', 'scammer', 'roommate'];

export const PRESETS = ['#f6d7c3', '#e8b98f', '#c68642', '#8d5524', '#5c3a21', '#3b2417'];

export const WEIRD = {
  en: [
    'collects left socks',
    'argues with pigeons',
    'keeps a spreadsheet of clouds',
    'whispers to houseplants',
    'speed-reads cereal boxes',
    'hoards expired coupons',
    'narrates life like a nature documentary',
    'knits sweaters for statues',
    'rates sandwiches out of 11',
    'plays chess against a mirror'
  ],
  vi: [
    'sưu tầm tất cả tất lẻ',
    'cãi nhau với bồ câu',
    'lập bảng tính các đám mây',
    'thì thầm với cây cảnh',
    'đọc nhanh hộp ngũ cốc',
    'tích trữ phiếu giảm giá hết hạn',
    'bình luận cuộc sống như phim tài liệu thiên nhiên',
    'đan áo len cho tượng',
    'chấm điểm bánh mì trên thang 11',
    'chơi cờ với chính cái gương'
  ]
};

export const NAMES = {
  en: [
    'Sir Reginald Noodlebottom',
    'Captain Waffle McFlurry',
    'Professor Pigeonwhisper',
    'Lady Zigzag Von Toast',
    'Doctor Sock Gobbler',
    'Count Cheddar Quill'
  ],
  vi: [
    'Nguyễn Văn Lầy',
    'Trần Thị Bánh Bèo',
    'Lê Hoàng Mì Gói',
    'Phạm Quang Trà Đá',
    'Hoàng Thị Cà Phê Muối',
    'Vũ Minh Bánh Mì'
  ]
};

export const I18N = {
  en: {
    title: 'Live Wikipedia Gacha',
    subtitle: 'Real-Time History Matcher & Absurd Story Engine',
    invTip: 'Museum of Curiosities',
    langTip: 'Language / Ngôn ngữ',
    themeTip: 'Toggle theme',
    soundTip: 'Toggle sound',
    setTip: 'Settings',
    diceTip: 'Randomize',
    profileTip: 'Your Profile — Traveler',
    profileBtn: 'Profile',
    pull1x: 'SPIN 1X',
    pull10x: 'SPIN 10X',
    multi10xTitle: '⚡ 10X Gacha Pull Results',
    multiPullNote: '10 historical figures summoned from the timeline:',
    inspectBest: 'Inspect Best Pull ★',
    skinPrefix: 'Skin Tone: ',
    yearPrefix: 'Target Birth Year: ',
    absurdPrefix: 'Story Absurdity Level: ',
    dossierTitle: 'WIKI HISTORICAL DOSSIER',
    dossierName: 'Full Name',
    dossierTargetRole: 'Target Role',
    dossierLifespan: 'Lifespan & Era',
    dossierEra: 'Era Filter',
    dossierOrigin: 'Origin & Ethnicity',
    dossierReligion: 'Religion / Beliefs',
    dossierFame: 'Claim to Fame',
    skipAnim: '⏩ Skip Animation',
    vs: 'VS',
    yearsOld: 'years old',
    profileH: '🧑 Your Profile — you are in the story',
    userName: 'Your name',
    ageL: 'Age',
    genderL: 'Gender identity',
    genderPh: 'Pick or type your own',
    hobbiesL: 'Weird hobbies & quirks',
    hobbiesPh: 'e.g. collects expired coupons, argues with pigeons…',
    roleL: 'Historical role',
    customRolePh: 'Type your custom role',
    g_male: 'Male',
    g_female: 'Female',
    g_nb: 'Non-binary',
    g_pns: 'Prefer not to say',
    roleRandom: '🎲 Random',
    roleCustom: '✍️ Custom…',
    role_advisor: 'Grand Advisor',
    role_chaos: 'Chaos Disciple',
    role_nemesis: 'Arch-Nemesis',
    role_bystander: 'Accidental Bystander',
    role_scammer: 'Time-Traveling Scammer',
    role_roommate: 'Unfortunate Roommate',
    targetH: '🎯 Target Attribute Console',
    skinL: 'Skin tone (RGB / presets)',
    tgenderL: 'Target gender identity',
    eraL: 'Historical Era / Time Period',
    ethnicityL: 'Ethnicity / Heritage',
    customEthnicityPh: 'Type custom ethnicity...',
    religionL: 'Religion / Beliefs',
    yearL: 'Target birth year',
    countryL: 'Country / origin',
    traitL: 'Custom trait & weird hobby',
    traitPh: 'e.g. collects left socks',
    absurdL: 'Story absurdity',
    abs0: 'Historical Fact',
    abs1: 'Time-Travel Comedy',
    abs2: 'Pure Absurdity',
    absd0: 'Grounded in real Wikipedia facts — the user only sneaks into the margins.',
    absd1: 'Ironic twists and chaotic synergy between you and the target.',
    absd2: 'Multiverse madness: magic and sci-fi layered over a real timeline.',
    randomAll: '🎲 Gacha Random All',
    unlockAll: '🔓 Unlock all',
    lockOn: 'Locked — Random All keeps this',
    lockOff: 'Unlocked — Random All can change this',
    pull: 'PULL FROM HISTORY',
    pityL: 'Pity',
    pityGuar: 'Next pull: guaranteed ★ rare!',
    st_idle: 'Set your parameters, then pull from the timeline. (Click the wheel to skip the spin)',
    st_search: 'Querying Wikipedia in real time…',
    st_found: '{n} historical candidates loaded.',
    st_offline: 'Wikipedia unreachable — using the offline archive.',
    st_spin: 'Rolling the timeline…',
    r_rare: '★ Special Rare / Covert',
    r_mid: 'Classified / Restricted',
    r_common: 'Mil-Spec / Consumer',
    present: 'present',
    unknownC: 'Origin unknown',
    sim: 'Similarity',
    readWiki: 'Read on Wikipedia',
    weave: '🪄 Weave the story',
    srcWiki: 'Live Wikipedia',
    srcOff: 'Offline archive',
    b_era: 'Era match',
    b_ethnicity: 'Ethnicity match',
    b_religion: 'Beliefs match',
    b_year: 'Birth-year match',
    b_country: 'Origin match',
    b_gender: 'Gender match',
    b_trait: 'Quirk keywords',
    b_fame: 'Wiki fame',
    storyH: '📜 The Absurd Chronicle',
    loading: 'Consulting the Chronicles…',
    ch1: 'Chapter 1 — The Fateful Encounter',
    ch2: 'Chapter 2 — The Historical Misadventure',
    ch3: 'Chapter 3 — The Secret Wiki Revelation',
    butterfly: '🦋 Butterfly Effect — choose the terrible advice you whisper before the climax',
    itemGot: '🏺 Cursed Item acquired',
    saved: 'Added to your Museum of Curiosities.',
    modeOff: 'Offline Story Engine',
    modeLLM: 'LLM: {p}',
    skipTip: 'Tip: click the story text to skip the typewriter.',
    copyStory: '📋 Copy story',
    copied: 'Story copied!',
    copyFail: 'Could not copy.',
    again: '🔁 Weave another tale',
    paperBtn: '📰 Newspaper',
    holoBtn: '🌈 Holo card',
    expTitle: 'Share your fate',
    paper: '📰 Vintage Newspaper',
    holo: '🌈 Holographic Fate Card',
    dl: '⬇ Download PNG',
    rendering: 'Rendering…',
    expFail: 'Could not render the image.',
    dlFail: 'Download blocked (image taint). Try again.',
    invH: '🏛 Museum of Curiosities',
    invEmpty: 'Your museum is empty. Pull a card and finish a story!',
    invStats: '{n} collected · ★ {r} · Classified {m} · Mil-Spec {c}',
    clearInv: '🗑 Clear museum',
    confirmClear: 'Delete the whole museum?',
    back: '← Back',
    cursed: 'Cursed item',
    setH: '⚙️ AI Settings & Audio',
    provider: 'AI Provider',
    pNone: 'None — offline story engine',
    keyL: 'API Key',
    keyNote: 'Stored only in this browser (localStorage) and sent directly to the selected AI provider. Leave empty to use the built-in offline engine.',
    modelL: 'AI Model',
    modelRecTitle: '💡 Model Recommendation',
    volume: 'Volume',
    save: 'Save',
    clearKey: 'Clear Key',
    savedSet: 'Settings saved.',
    llmFail: 'LLM failed, using the offline engine',
    anon: 'Time Traveler',
    chaos: '🌀 CHAOS MODE UNLOCKED — absurdity 100%!',
    secret: '⏳ Secret card unlocked: You, from 2077!',
    secretHave: 'You already own the 2077 card.',
    footer: 'Data © Wikipedia contributors (CC BY-SA). Not affiliated with any game. History may have been edited by raccoons.',
    paperName: 'THE TEMPORAL TIMES',
    paperPrice: 'Price: one cursed item',
    paperI: 'II. THE MISADVENTURE',
    paperIII: 'III. THE SECRET REVELATION',
    paperCursed: 'CURSED ITEM',
    holoSim: 'Similarity'
  },
  vi: {
    title: 'Live Wikipedia Gacha',
    subtitle: 'Máy ghép lịch sử thời gian thực & Động cơ truyện phi lý',
    invTip: 'Bảo tàng Vật thể Kỳ quặc',
    langTip: 'Language / Ngôn ngữ',
    themeTip: 'Đổi giao diện',
    soundTip: 'Bật/tắt âm thanh',
    setTip: 'Cài đặt',
    diceTip: 'Ngẫu nhiên',
    profileTip: 'Hồ sơ người du hành',
    profileBtn: 'Hồ sơ',
    pull1x: 'QUAY 1 LẦN',
    pull10x: 'QUAY 10 LẦN',
    multi10xTitle: '⚡ Kết Quả Quay 10 Lần',
    multiPullNote: '10 nhân vật lịch sử được triệu hồi từ dòng thời gian:',
    inspectBest: 'Xem Thẻ Cao Nhất ★',
    skinPrefix: 'Màu da: ',
    yearPrefix: 'Năm sinh mục tiêu: ',
    absurdPrefix: 'Độ phi lý của truyện: ',
    dossierTitle: 'HỒ SƠ LỊCH SỬ WIKIPEDIA',
    dossierName: 'Tên thật',
    dossierTargetRole: 'Vai trò mục tiêu',
    dossierLifespan: 'Giai đoạn / Năm sống',
    dossierEra: 'Thuộc giai đoạn',
    dossierOrigin: 'Xuất thân & Sắc tộc',
    dossierReligion: 'Tôn giáo / Tín ngưỡng',
    dossierFame: 'Sự kiện nổi bật',
    skipAnim: '⏩ Bỏ qua hoạt ảnh',
    vs: 'VS',
    yearsOld: 'tuổi',
    profileH: '🧑 Hồ sơ của bạn — bạn xuất hiện trong truyện',
    userName: 'Tên của bạn',
    ageL: 'Tuổi',
    genderL: 'Bản dạng giới',
    genderPh: 'Chọn hoặc tự nhập',
    hobbiesL: 'Sở thích & tật lạ',
    hobbiesPh: 'vd: sưu tầm phiếu giảm giá hết hạn, cãi nhau với bồ câu…',
    roleL: 'Vai trò trong lịch sử',
    customRolePh: 'Nhập vai trò riêng',
    g_male: 'Nam',
    g_female: 'Nữ',
    g_nb: 'Phi nhị nguyên',
    g_pns: 'Không muốn nói',
    roleRandom: '🎲 Ngẫu nhiên',
    roleCustom: '✍️ Tự nhập…',
    role_advisor: 'Đại Cố Vấn',
    role_chaos: 'Tín Đồ Hỗn Loạn',
    role_nemesis: 'Kẻ Thù Không Đội Trời Chung',
    role_bystander: 'Người Qua Đường Ngẫu Nhiên',
    role_scammer: 'Kẻ Lừa Đảo Xuyên Thời Gian',
    role_roommate: 'Người Bạn Cùng Phòng Xui Xẻo',
    targetH: '🎯 Bảng điều khiển thuộc tính mục tiêu',
    skinL: 'Màu da (RGB / mẫu sẵn)',
    tgenderL: 'Bản dạng giới của mục tiêu',
    eraL: 'Thời kỳ / Kỷ nguyên lịch sử',
    ethnicityL: 'Gốc sắc tộc / Dân tộc',
    customEthnicityPh: 'Nhập sắc tộc tùy chỉnh...',
    religionL: 'Tôn giáo / Tín ngưỡng',
    yearL: 'Năm sinh mục tiêu',
    countryL: 'Quốc gia / nguồn gốc',
    traitL: 'Đặc điểm & sở thích kỳ quặc',
    traitPh: 'vd: sưu tầm tất lẻ',
    absurdL: 'Độ phi lý của truyện',
    abs0: 'Sự thật lịch sử',
    abs1: 'Hài du hành thời gian',
    abs2: 'Phi lý tuyệt đối',
    absd0: 'Bám sát sự thật trên Wikipedia — bạn chỉ lén xuất hiện ở lề trang.',
    absd1: 'Những cú twist mỉa mai và sự ăn ý hỗn loạn giữa bạn và mục tiêu.',
    absd2: 'Đa vũ trụ điên loạn: phép thuật và khoa học viễn tưởng phủ lên dòng thời gian thật.',
    randomAll: '🎲 Gacha ngẫu nhiên tất cả',
    unlockAll: '🔓 Mở khóa hết',
    lockOn: 'Đã khóa — Ngẫu nhiên tất cả sẽ giữ nguyên',
    lockOff: 'Đã mở — Ngẫu nhiên tất cả có thể đổi',
    pull: 'QUAY TỪ LỊCH SỬ',
    pityL: 'Bảo hiểm',
    pityGuar: 'Lần quay tới: chắc chắn ra thẻ ★ hiếm!',
    st_idle: 'Đặt thông số rồi quay từ dòng thời gian. (Bấm vào vòng quay để bỏ qua hiệu ứng)',
    st_search: 'Đang truy vấn Wikipedia theo thời gian thực…',
    st_found: 'Đã tải {n} ứng viên lịch sử.',
    st_offline: 'Không kết nối được Wikipedia — dùng kho dữ liệu ngoại tuyến.',
    st_spin: 'Đang quay dòng thời gian…',
    r_rare: '★ Đặc biệt hiếm / Covert',
    r_mid: 'Mật / Hạn chế',
    r_common: 'Phổ thông / Tiêu dùng',
    present: 'nay',
    unknownC: 'Chưa rõ nguồn gốc',
    sim: 'Độ tương đồng',
    readWiki: 'Đọc trên Wikipedia',
    weave: '🪄 Dệt câu chuyện',
    srcWiki: 'Wikipedia trực tiếp',
    srcOff: 'Kho ngoại tuyến',
    b_era: 'Khớp kỷ nguyên',
    b_ethnicity: 'Khớp sắc tộc',
    b_religion: 'Khớp tín ngưỡng',
    b_year: 'Khớp năm sinh',
    b_country: 'Khớp nguồn gốc',
    b_gender: 'Khớp giới tính',
    b_trait: 'Từ khóa tật lạ',
    b_fame: 'Độ nổi tiếng',
    storyH: '📜 Biên niên sử phi lý',
    loading: 'Đang tham khảo Biên niên sử…',
    ch1: 'Chương 1 — Cuộc gặp định mệnh',
    ch2: 'Chương 2 — Cuộc phiêu lưu lịch sử',
    ch3: 'Chương 3 — Bí mật Wikipedia bị lộ',
    butterfly: '🦋 Hiệu ứng cánh bướm — chọn lời khuyên tệ hại bạn thì thầm trước cao trào',
    itemGot: '🏺 Nhận được Vật Bị Nguyền',
    saved: 'Đã thêm vào Bảo tàng Vật thể Kỳ quặc.',
    modeOff: 'Động cơ truyện ngoại tuyến',
    modeLLM: 'LLM: {p}',
    skipTip: 'Mẹo: bấm vào chữ để bỏ qua hiệu ứng gõ máy.',
    copyStory: '📋 Sao chép truyện',
    copied: 'Đã sao chép truyện!',
    copyFail: 'Không sao chép được.',
    again: '🔁 Dệt chuyện khác',
    paperBtn: '📰 Báo cổ',
    holoBtn: '🌈 Thẻ holo',
    expTitle: 'Chia sẻ số phận của bạn',
    paper: '📰 Trang nhất báo cổ',
    holo: '🌈 Thẻ Định Mệnh Holographic',
    dl: '⬇ Tải PNG',
    rendering: 'Đang vẽ…',
    expFail: 'Không vẽ được ảnh.',
    dlFail: 'Tải xuống bị chặn. Hãy thử lại.',
    invH: '🏛 Bảo tàng Vật thể Kỳ quặc',
    invEmpty: 'Bảo tàng còn trống. Hãy quay một thẻ và đọc hết truyện!',
    invStats: 'Đã sưu tầm {n} · ★ {r} · Mật {m} · Phổ thông {c}',
    clearInv: '🗑 Xóa bảo tàng',
    confirmClear: 'Xóa toàn bộ bảo tàng?',
    back: '← Quay lại',
    cursed: 'Vật bị nguyền',
    setH: '⚙️ Cài đặt AI & Âm thanh',
    provider: 'Nhà cung cấp AI',
    pNone: 'Không — dùng động cơ truyện ngoại tuyến',
    keyL: 'Khóa API',
    keyNote: 'Chỉ lưu trong trình duyệt này (localStorage) và chỉ gửi trực tiếp tới nhà cung cấp đã chọn. Để trống để dùng động cơ ngoại tuyến có sẵn.',
    modelL: 'Mô hình AI',
    modelRecTitle: '💡 Gợi ý Mô hình',
    volume: 'Âm lượng',
    save: 'Lưu cài đặt',
    clearKey: 'Xóa khóa API',
    savedSet: 'Đã lưu cài đặt AI & âm thanh.',
    llmFail: 'LLM lỗi, chuyển sang động cơ ngoại tuyến',
    anon: 'Lữ khách thời gian',
    chaos: '🌀 ĐÃ MỞ CHẾ ĐỘ HỖN LOẠN — phi lý 100%!',
    secret: '⏳ Mở thẻ bí mật: Bạn, từ năm 2077!',
    secretHave: 'Bạn đã có thẻ 2077 rồi.',
    footer: 'Dữ liệu © những người đóng góp Wikipedia (CC BY-SA). Không liên kết với trò chơi nào. Lịch sử có thể đã bị gấu mèo chỉnh sửa.',
    paperName: 'BÁO THỜI KHÔNG',
    paperPrice: 'Giá: một vật bị nguyền',
    paperI: 'II. CUỘC PHIÊU LƯU',
    paperIII: 'III. BÍ MẬT BỊ LỘ',
    paperCursed: 'VẬT BỊ NGUYỀN',
    holoSim: 'Tương đồng'
  }
};

export class UserProfileModel {
  static instance = null;

  static getBirthYear() {
    return UserProfileModel.instance ? UserProfileModel.instance.getBirthYear() : 1900;
  }

  constructor() {
    UserProfileModel.instance = this;
    this.storageKey = 'wg_form';
    this.langKey = 'wg_lang';
    this.themeKey = 'wg_theme';

    const navLang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
    this.lang = this._load(this.langKey, navLang.toLowerCase().startsWith('vi') ? 'vi' : 'en');
    this.theme = this._load(this.themeKey, 'dark');

    this.locks = {
      skin: false,
      tgender: false,
      era: false,
      ethnicity: false,
      religion: false,
      year: false,
      country: false,
      trait: false,
      absurd: true
    };

    this.fields = {
      uName: '',
      uAge: 25,
      uGender: '',
      uHobby: '',
      uRole: 'random',
      uRoleCustom: '',
      skin: '#c68642',
      tGender: 'any',
      era: 1900,
      eraYear: 1900,
      year: 1900,
      ethnicity: 'any',
      ethnicityCustom: '',
      religion: 'any',
      country: 'any',
      trait: '',
      absurd: 50
    };

    this.load();
  }

  _load(key, def) {
    try {
      if (typeof localStorage === 'undefined') return def;
      const v = localStorage.getItem(key);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  }

  _save(key, val) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  load() {
    const saved = this._load(this.storageKey, null);
    if (saved) {
      Object.keys(this.fields).forEach(k => {
        if (saved[k] != null) this.fields[k] = saved[k];
      });
    }
    if (!this.fields.uName) {
      this.fields.uName = this.getRandomName();
    }
  }

  save() {
    this._save(this.storageKey, this.fields);
  }

  setField(key, value) {
    if (key in this.fields) {
      this.fields[key] = value;
      if (key === 'eraYear' || key === 'year') {
        const num = Number(value);
        this.fields.eraYear = num;
        this.fields.year = num;
        this.fields.era = num;
      }
      this.save();
    }
  }

  getBirthYear() {
    const val = Number(this.fields.eraYear || this.fields.year || 1900);
    return Math.min(2020, Math.max(500, isNaN(val) ? 1900 : val));
  }

  getField(key) {
    return this.fields[key];
  }

  t(k, vars) {
    let s = (I18N[this.lang] && I18N[this.lang][k] != null)
      ? I18N[this.lang][k]
      : (I18N.en[k] != null ? I18N.en[k] : k);
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, (m, x) => (vars[x] != null ? vars[x] : ''));
    }
    return s;
  }

  cleanGender(g) {
    g = (g || '').trim();
    if ([I18N.en.g_pns, I18N.vi.g_pns].includes(g)) return '';
    return g;
  }

  getInputs() {
    const f = this.fields;
    const minYear = this.getBirthYear();
    return {
      name: String(f.uName || '').trim() || this.t('anon'),
      age: Math.min(120, Math.max(1, Number(f.uAge) || 25)),
      gender: this.cleanGender(f.uGender),
      hobbies: String(f.uHobby || '').trim(),
      roleKey: f.uRole || 'random',
      roleCustom: String(f.uRoleCustom || '').trim(),
      skin: f.skin || '#c68642',
      tgender: f.tGender || 'any',
      era: minYear,
      eraYear: minYear,
      year: minYear,
      selectedMinYear: minYear,
      ethnicity: f.ethnicity || 'any',
      ethnicityCustom: String(f.ethnicityCustom || '').trim(),
      religion: f.religion || 'any',
      country: f.country || 'any',
      trait: String(f.trait || '').trim(),
      absurd: Number(f.absurd) || 50
    };
  }

  getRandomName() {
    const list = NAMES[this.lang] || NAMES.en;
    return list[Math.floor(Math.random() * list.length)];
  }

  getRandomHobby() {
    const list = WEIRD[this.lang] || WEIRD.en;
    return list[Math.floor(Math.random() * list.length)];
  }

  toggleLock(key) {
    if (key in this.locks) {
      this.locks[key] = !this.locks[key];
    }
    return this.locks[key];
  }

  unlockAll() {
    Object.keys(this.locks).forEach(k => {
      this.locks[k] = false;
    });
  }

  rollField(k) {
    switch (k) {
      case 'skin':
        if (Math.random() < 0.7) {
          this.fields.skin = PRESETS[Math.floor(Math.random() * PRESETS.length)];
        } else {
          this.fields.skin = '#' + [0, 0, 0].map(() => Math.floor(Math.random() * 181 + 60).toString(16).padStart(2, '0')).join('');
        }
        break;
      case 'tgender': {
        const pool = TG.filter(x => x[0] !== 'any');
        this.fields.tGender = pool[Math.floor(Math.random() * pool.length)][0];
        break;
      }
      case 'era':
      case 'eraYear':
      case 'year': {
        const steps = Math.floor((2020 - 500) / 10);
        const rolled = 500 + Math.floor(Math.random() * (steps + 1)) * 10;
        this.fields.year = rolled;
        this.fields.eraYear = rolled;
        this.fields.era = rolled;
        break;
      }
      case 'ethnicity': {
        const pool = ETHNICITIES.filter(x => x[0] !== 'any' && x[0] !== 'custom');
        this.fields.ethnicity = pool[Math.floor(Math.random() * pool.length)][0];
        break;
      }
      case 'religion': {
        const pool = RELIGIONS.filter(x => x[0] !== 'any');
        this.fields.religion = pool[Math.floor(Math.random() * pool.length)][0];
        break;
      }
      case 'country': {
        const pool = COUNTRIES.filter(c => c[0] !== 'any');
        this.fields.country = pool[Math.floor(Math.random() * pool.length)][0];
        break;
      }
      case 'trait':
        this.fields.trait = this.getRandomHobby();
        break;
      case 'absurd':
        this.fields.absurd = Math.floor(Math.random() * 101);
        break;
    }
    this.save();
    return this.fields;
  }

  randomizeAllUnlocked() {
    ['skin', 'tgender', 'era', 'ethnicity', 'religion', 'country', 'trait', 'absurd'].forEach(k => {
      if (!this.locks[k]) {
        this.rollField(k);
      }
    });
    return this.fields;
  }

  getEraLabel(id, lang = this.lang) {
    const num = Number(id);
    if (!isNaN(num) && num > 0) {
      if (num <= 500) {
        return lang === 'vi'
          ? 'Toàn bộ Lịch sử (Cổ đại đến Nay)'
          : 'All History (Ancient to Present)';
      }
      return lang === 'vi'
        ? `Từ ${num} đến Nay`
        : `From ${num} to Present`;
    }
    const e = ERAS.find(x => x[0] === id);
    if (!e) return lang === 'vi' ? 'Toàn bộ Lịch sử (Cổ đại đến Nay)' : 'All History (Ancient to Present)';
    return lang === 'vi' ? e[2] : e[1];
  }

  getEthnicityLabel(id, customVal = '', lang = this.lang) {
    if (id === 'custom') {
      return customVal || (lang === 'vi' ? 'Tự nhập tùy chỉnh' : 'Custom');
    }
    const item = ETHNICITIES.find(x => x[0] === id);
    if (!item) return lang === 'vi' ? 'Mọi nguồn gốc (Any)' : 'Any';
    return lang === 'vi' ? item[2] : item[1];
  }

  getReligionLabel(id, lang = this.lang) {
    const r = RELIGIONS.find(x => x[0] === id);
    if (!r) return lang === 'vi' ? 'Mọi tín ngưỡng (Any)' : 'Any';
    return lang === 'vi' ? r[2] : r[1];
  }

  getRoleLabel(roleKey = this.fields.uRole) {
    if (roleKey === 'custom') {
      return this.fields.uRoleCustom || this.t('roleCustom');
    }
    if (roleKey && roleKey !== 'random') {
      const key = 'role_' + roleKey;
      const trans = this.t(key);
      if (trans && trans !== key) return trans;
      return roleKey;
    }
    return this.t('role_advisor');
  }

  getGenderLabel(genderKey = this.fields.uGender) {
    if (!genderKey) return this.lang === 'vi' ? 'Không rõ' : 'Unspecified';
    const key = 'g_' + genderKey;
    const trans = this.t(key);
    if (trans && trans !== key) return trans;
    return genderKey;
  }

  getCountryLabel(id, lang = this.lang) {
    const c = COUNTRIES.find(x => x[0] === id);
    if (!c) return '';
    return lang === 'vi' ? c[2] : c[1];
  }

  getCountryFlag(id) {
    const c = COUNTRIES.find(x => x[0] === id);
    return c && c[5] ? c[5] : '🌐';
  }

  setLanguage(lang) {
    this.lang = lang === 'vi' ? 'vi' : 'en';
    this._save(this.langKey, this.lang);
    return this.lang;
  }

  setTheme(theme) {
    this.theme = theme === 'light' ? 'light' : 'dark';
    this._save(this.themeKey, this.theme);
    return this.theme;
  }
}

export default UserProfileModel;
