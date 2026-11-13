/**
 * @file WikipediaModel.js
 * @description Live Wikipedia API queries, priority Vietnamese search with fallback translation,
 * country/gender/era/ethnicity/religion matching, similarity scoring, funny Target Role extraction,
 * structured dossier building, and offline historical archive fallback.
 */

import { COUNTRIES, CRX, ERAS, ETHNICITIES, RELIGIONS, UserProfileModel, HOBBY_SEMANTIC_MAP, hobbyKeywordsFor } from './UserProfileModel.js';
import { evaluateCandidateMatch, filterAndRankCandidates } from './ScoringEngine.js';

export const OFFLINE = [
  // [name, birth, death, countryId, era, ethnicityId, religionId, descEn, descVi, summaryEn, summaryVi, gender, evEn, evVi, targetRoleEn, targetRoleVi]
  [
    'Alexander Bogdanov', 1873, 1928, 'RU', 'century_19', 'slavic', 'atheist',
    'Russian physician, philosopher and science fiction writer',
    'Bác sĩ, triết gia và nhà tiên phong truyền máu người Nga',
    'Alexander Bogdanov was a Russian and Soviet physician, philosopher, science fiction writer, and Bolshevik revolutionary who pioneered blood transfusions and eternal youth experiments.',
    'Alexander Bogdanov là một bác sĩ, triết gia và nhà cách mạng người Nga, người tiên phong trong các thí nghiệm truyền máu và tìm kiếm bí quyết trường sinh bất lão.',
    'male', 'blood transfusions for eternal youth', 'thí nghiệm truyền máu tìm kiếm sự bất tử',
    'Mad Blood-Swapping Scientist', 'Nhà Khoa Học Tự Đổi Máu'
  ],
  [
    'Franz Reichelt', 1878, 1912, 'FR', 'century_19', 'austrian', 'christianity',
    'Austrian-born French tailor and parachuting pioneer',
    'Thợ may và nhà phát minh áo dù người Pháp gốc Áo',
    'Franz Reichelt was an Austrian-born French tailor, inventor and parachuting pioneer, known for jumping from the Eiffel Tower wearing his parachute suit.',
    'Franz Reichelt là một thợ may và nhà sáng chế người Pháp gốc Áo, nổi danh với bộ đồ dù tự chế và cú nhảy thử nghiệm lịch sử từ Tháp Eiffel.',
    'male', 'jumping from the Eiffel Tower in a parachute suit in 1912', 'cú nhảy từ Tháp Eiffel bằng bộ đồ dù tự chế năm 1912',
    'Quirky Parachute-Suit Tailor', 'Thợ May Nhảy Dù Kỳ Cục'
  ],
  [
    'Joshua Norton', 1818, 1880, 'US', 'century_19', 'anglo_saxon', 'atheist',
    'Citizen of San Francisco who proclaimed himself Emperor of the United States',
    'Công dân San Francisco tự phong làm Hoàng đế nước Mỹ',
    'Joshua Abraham Norton was a resident of San Francisco, California, who in 1859 proclaimed himself Emperor of the United States and later Protector of Mexico.',
    'Joshua Abraham Norton là một nhân vật kỳ dị tại San Francisco, người đã chính thức tự sắc phong làm Hoàng đế nước Mỹ và Người bảo hộ Mexico năm 1859.',
    'male', 'proclaiming himself Emperor of the United States in 1859', 'việc tự sắc phong làm Hoàng đế nước Mỹ năm 1859',
    'Self-Proclaimed Emperor of the USA', 'Vua Tự Phong Của Nước Mỹ'
  ],
  [
    'Albert Einstein', 1879, 1955, 'DE', 'century_19', 'jewish', 'atheist',
    'German-born theoretical physicist and Nobel laureate',
    'Nhà vật lý lý thuyết người Đức gốc Do Thái, đoạt giải Nobel',
    'Albert Einstein was a German-born theoretical physicist widely acknowledged to be one of the greatest physicists of all time, best known for developing the theory of relativity.',
    'Albert Einstein là nhà vật lý lý thuyết người Đức gốc Do Thái, được tôn vinh là một trong những bộ óc vĩ đại nhất lịch sử nhân loại với thuyết tương đối và công thức E=mc².',
    'male', 'developing the theory of relativity and E=mc²', 'phát triển thuyết tương đối và phương trình E=mc²',
    'Wild-Haired Spacetime Bender', 'Giáo Sư Tóc Xù Bẻ Cong Thời Không'
  ],
  [
    'Julius Caesar', -100, -44, 'IT', 'ancient_medieval', 'roman_italic', 'polytheism',
    'Roman general and statesman',
    'Đại tướng và chính khách La Mã cổ đại',
    'Julius Caesar was a Roman general and statesman who played a critical role in the demise of the Roman Republic and the rise of the Roman Empire.',
    'Julius Caesar là một đại tướng và chính khách La Mã cổ đại, người đóng vai trò then chốt trong sự sụp đổ của nền Cộng hòa La Mã và sự thành lập Đế quốc La Mã.',
    'male', 'crossing the Rubicon in 49 BC', 'vượt dòng sông Rubicon năm 49 TCN',
    'Rubicon-Crossing Grand General', 'Đại Tướng Băng Qua Sông Rubicon'
  ],
  [
    'Leonardo da Vinci', 1452, 1519, 'IT', 'ancient_medieval', 'roman_italic', 'christianity',
    'Italian polymath of the Renaissance',
    'Thiên tài toàn năng thời Phục Hưng người Ý',
    'Leonardo da Vinci was an Italian polymath active as a painter, draughtsman, engineer, scientist, theorist, sculptor, and architect.',
    'Leonardo da Vinci là một thiên tài toàn năng người Ý thời Phục Hưng, bậc thầy hội họa, kỹ sư sáng chế máy bay và nhà giải phẫu học tiên phong.',
    'male', 'painting the Mona Lisa and designing flying machines', 'vẽ kiệt tác Mona Lisa và thiết kế các cỗ máy bay',
    'Multiverse Renaissance Polymath', 'Họa Sĩ Kiêm Kỹ Sư Đa Năng Vũ Trụ'
  ],
  [
    'Trần Hưng Đạo', 1228, 1300, 'VN', 'ancient_medieval', 'han', 'buddhism',
    'Vietnamese imperial prince and supreme military commander',
    'Tiết chế Quốc công, đại danh tướng kiệt xuất của Đại Việt',
    'Trần Hưng Đạo was a Vietnamese imperial prince, statesman and supreme commander of Đại Việt military forces who successfully repelled three major Mongol invasions.',
    'Trần Hưng Đạo là bậc danh tướng vĩ đại của Đại Việt, người ba lần lãnh đạo quân dân đánh tan các cuộc xâm lược của vó ngựa quân Nguyên Mông hùng mạnh.',
    'male', 'the historic victory on the Bạch Đằng River in 1288', 'chiến thắng vang dội trên sông Bạch Đằng năm 1288',
    'Invincible Mongol Fleet Crusher', 'Đại Tướng Đánh Bại Thủy Quái Mông Cổ'
  ],
  [
    'Joan of Arc', 1412, 1431, 'FR', 'ancient_medieval', 'anglo_saxon', 'christianity',
    'French heroine and Roman Catholic saint',
    'Nữ anh hùng dân tộc và thánh tử đạo của nước Pháp',
    'Joan of Arc is considered a heroine of France for her role during the Hundred Years\' War, claiming divine guidance to lead the French army to decisive victories.',
    'Joan of Arc là nữ anh hùng dân tộc của nước Pháp, người khẳng định nghe thấy tiếng nói của thiên sứ để chỉ huy quân đội Pháp giành lại vương quyền trong Chiến tranh Trăm Năm.',
    'female', 'lifting the siege of Orléans in 1429', 'giải vây thành phố Orléans năm 1429',
    'Celestial Voice Vanguard', 'Nữ Chiến Binh Nghe Tiếng Nói Của Trời'
  ],
  [
    'Isaac Newton', 1643, 1727, 'GB', 'century_16_18', 'anglo_saxon', 'christianity',
    'English polymath, mathematician and physicist',
    'Nhà bác học, toán học và vật lý học vĩ đại người Anh',
    'Sir Isaac Newton was an English polymath who formulated the laws of motion and universal gravitation, laying the groundwork for modern classical physics.',
    'Isaac Newton là nhà bác học người Anh, người đã tìm ra các định luật chuyển động và định luật vạn vật hấp dẫn sau câu chuyện quả táo rơi.',
    'male', 'discovering the law of universal gravitation', 'tìm ra định luật vạn vật hấp dẫn nhờ quả táo rơi',
    'Apple-Struck Gravity Mastermind', 'Nhà Bác Học Bị Táo Rơi Trúng Đầu'
  ],
  [
    'Napoleon Bonaparte', 1769, 1821, 'FR', 'century_16_18', 'roman_italic', 'christianity',
    'French military commander and Emperor of the French',
    'Hoàng đế nước Pháp và thiên tài quân sự',
    'Napoleon Bonaparte was a French military and political leader who rose to prominence during the French Revolution and conquered much of continental Europe.',
    'Napoleon Bonaparte là hoàng đế nước Pháp và nhà cầm quân xuất chúng, người từng làm rung chuyển cả châu Âu với tài điều binh khiển tướng siêu phàm.',
    'male', 'the decisive victory at the Battle of Austerlitz in 1805', 'chiến thắng vang dội tại trận Austerlitz năm 1805',
    'Bicorn-Hat Petite Emperor', 'Hoàng Đế Thấp Bé Thích Đội Mũ Ngang'
  ],
  [
    'Alan Turing', 1912, 1954, 'GB', 'century_20_early', 'anglo_saxon', 'atheist',
    'British mathematician, logician, and father of computer science',
    'Nhà toán học, chuyên gia giải mã và cha đẻ khoa học máy tính người Anh',
    'Alan Turing was an English mathematician, computer scientist, logician and cryptanalyst who led efforts at Bletchley Park to crack German Enigma ciphers.',
    'Alan Turing là nhà toán học và giải mã người Anh, người chế tạo cỗ máy phá mã Enigma tại Bletchley Park và đặt nền móng cho trí tuệ nhân tạo ngày nay.',
    'male', 'breaking the Enigma code at Bletchley Park', 'việc phá vỡ cỗ máy mật mã Enigma tại Bletchley Park',
    'Enigma Codebreaker & AI Grandfather', 'Phù Thủy Giải Mã & Tổ Phụ AI'
  ],
  [
    'Frida Kahlo', 1907, 1954, 'MX', 'century_20_early', 'jewish', 'atheist',
    'Mexican painter celebrated for surrealist self-portraits',
    'Nữ họa sĩ tài hoa người Mexico nổi tiếng với các bức tự họa',
    'Frida Kahlo was a Mexican painter known for her many portraits, self-portraits, and works inspired by the nature and artifacts of Mexico.',
    'Frida Kahlo là nữ họa sĩ lừng danh người Mexico, nổi tiếng với những bức tự họa đậm chất siêu thực, rực rỡ sắc màu và chan chứa nỗi đau cùng nghị lực.',
    'female', 'her unforgettable vibrant self-portraits', 'những bức chân dung tự họa bất hủ',
    'Rebellious Self-Portrait Virtuoso', 'Họa Sĩ Tự Họa Rực Rỡ & Nổi Loạn'
  ],
  [
    'Neil Armstrong', 1930, 2012, 'US', 'century_20_early', 'anglo_saxon', 'christianity',
    'American astronaut and first person to walk on the Moon',
    'Phi hành gia người Mỹ, người đầu tiên đặt chân lên Mặt Trăng',
    'Neil Armstrong was an American astronaut and aeronautical engineer who became the first person to walk on the Moon during the Apollo 11 mission in 1969.',
    'Neil Armstrong là phi hành gia người Mỹ, chỉ huy tàu Apollo 11 và là người đầu tiên trong lịch sử nhân loại bước đi trên bề mặt Mặt Trăng năm 1969.',
    'male', 'the first human steps on the Moon in 1969', 'những bước chân đầu tiên của nhân loại trên Mặt Trăng năm 1969',
    'First Moonwalker & Space Scout', 'Lữ Khách Đầu Tiên Cắm Cờ Mặt Trăng'
  ],
  [
    'Sigmund Freud', 1856, 1939, 'DE', 'century_19', 'austrian', 'atheist',
    'Austrian neurologist and founder of psychoanalysis',
    'Bác sĩ thần kinh người Áo, người sáng lập ngành phân tâm học',
    'Sigmund Freud was an Austrian neurologist who founded psychoanalysis, creating clinical methods for evaluating unconscious desires and dreams.',
    'Sigmund Freud là bác sĩ thần kinh người Áo, người đã sáng lập ngành phân tâm học và mở ra cách hiểu hoàn toàn mới về giấc mơ và tiềm thức con người.',
    'male', 'founding psychoanalysis and dream interpretation', 'sáng lập ngành phân tâm học và giải mã giấc mơ',
    'Subconscious Dream Decoder', 'Bác Sĩ Đọc Giấc Mơ Bí Ẩn'
  ],
  [
    'Nikola Tesla', 1856, 1943, 'US', 'century_19', 'slavic', 'atheist',
    'Serbian-American inventor, electrical and mechanical engineer',
    'Nhà phát minh và kỹ sư điện người Mỹ gốc Serb',
    'Nikola Tesla was a Serbian-American engineer and futurist best known for his contributions to the design of the modern alternating current (AC) electricity supply system.',
    'Nikola Tesla là kỹ sư điện và nhà phát minh thiên tài, người sáng chế hệ thống điện xoay chiều AC và vô số công nghệ đi trước thời đại cả thế kỷ.',
    'male', 'developing the alternating current electricity system', 'phát minh hệ thống dòng điện xoay chiều AC',
    'Wireless Lightning Sorcerer', 'Phù Thủy Sấm Sét Không Dây'
  ],
  [
    'Marie Curie', 1867, 1934, 'FR', 'century_19', 'slavic', 'atheist',
    'Polish-French physicist and chemist, two-time Nobel laureate',
    'Nhà vật lý và hóa học người Pháp gốc Ba Lan, hai lần đoạt giải Nobel',
    'Marie Curie was a Polish and naturalised-French physicist and chemist who conducted pioneering research on radioactivity, winning Nobel Prizes in Physics and Chemistry.',
    'Marie Curie là nhà khoa học người Pháp gốc Ba Lan, người phụ nữ đầu tiên đoạt giải Nobel và là người duy nhất giành được hai giải Nobel ở hai ngành khoa học khác nhau.',
    'female', 'discovering the radioactive elements polonium and radium', 'phát hiện ra hai nguyên tố phóng xạ poloni và radi',
    'Glowing Radioactive Pioneer', 'Nữ Bá Tước Phóng Xạ Phát Sáng'
  ],
  [
    'Nelson Mandela', 1918, 2013, 'ZA', 'century_20_early', 'any', 'christianity',
    'South African anti-apartheid revolutionary and president',
    'Nhà hoạt động giải phóng Nam Phi và tổng thống da đen đầu tiên',
    'Nelson Mandela was a South African anti-apartheid activist and politician who served as the first president of South Africa from 1994 to 1999.',
    'Nelson Mandela là biểu tượng đấu tranh chống phân biệt chủng tộc Apartheid, người đã dành 27 năm trong tù trước khi trở thành Tổng thống Nam Phi.',
    'male', 'ending apartheid and becoming president in 1994', 'chấm dứt chế độ Apartheid và đắc cử tổng thống năm 1994',
    'Unshakable Freedom Champion', 'Hiệp Sĩ Phá Bỏ Bức Tường Ngăn Cách'
  ],
  [
    'Audrey Hepburn', 1929, 1993, 'GB', 'century_20_early', 'anglo_saxon', 'christianity',
    'British actress, fashion icon and humanitarian',
    'Nữ diễn viên điện ảnh người Anh, biểu tượng thời trang và đại sứ UNICEF',
    'Audrey Hepburn was a British actress and humanitarian. She won an Academy Award for Roman Holiday and later devoted much of her life to UNICEF.',
    'Audrey Hepburn là nữ minh tinh điện ảnh đoạt giải Oscar trong Roman Holiday, biểu tượng thanh lịch vĩnh cửu và nhà hoạt động nhân đạo tận tụy của UNICEF.',
    'female', 'her Oscar-winning turn in Roman Holiday', 'vai diễn đoạt giải Oscar trong Kỳ Nghỉ La Mã',
    'Timeless Elegance & Kindness Icon', 'Nàng Thơ Thanh Lịch Vượt Thời Gian'
  ],
  [
    'Muhammad Ali', 1942, 2016, 'US', 'century_20_early', 'any', 'islam',
    'American heavyweight boxing champion and activist',
    'Võ sĩ quyền anh hạng nặng huyền thoại và nhà hoạt động nhân quyền người Mỹ',
    'Muhammad Ali was an American professional boxer and activist, celebrated as one of the greatest heavyweight boxers of all time.',
    'Muhammad Ali là tay đấm huyền thoại người Mỹ, người từng làm nức lòng hàng triệu khán giả với lối di chuyển "bay như bướm, chích như ong" trên võ đài.',
    'male', 'the historic "Rumble in the Jungle" victory in 1974', 'chiến thắng trong trận quyền anh thế kỷ "Rumble in the Jungle" năm 1974',
    'Float Like A Butterfly Heavyweight King', 'Vua Quyền Anh Bay Như Bướm Chích Như Ong'
  ],
  [
    'Stephen Hawking', 1942, 2018, 'GB', 'century_20_early', 'anglo_saxon', 'atheist',
    'English theoretical physicist, cosmologist and author',
    'Nhà vật lý lý thuyết và vũ trụ học người Anh',
    'Stephen Hawking was an English theoretical physicist and cosmologist whose work on black holes and A Brief History of Time inspired millions worldwide.',
    'Stephen Hawking là nhà vật lý lý thuyết thiên tài người Anh, tác giả cuốn sách "Lược sử thời gian" giải mã sự hình thành của vũ trụ và hố đen.',
    'male', 'explaining black holes in A Brief History of Time', 'giải mã bí ẩn hố đen trong Lược sử thời gian',
    'Black Hole Cosmic Explorer', 'Kẻ Thám Hiểm Hố Đen Vũ Trụ'
  ],
  [
    'Steve Jobs', 1955, 2011, 'US', 'century_20_late', 'anglo_saxon', 'buddhism',
    'American businessman, inventor and co-founder of Apple Inc.',
    'Nhà đồng sáng lập Apple và phù thủy công nghệ người Mỹ',
    'Steve Jobs was an American businessman and inventor who co-founded Apple Inc. and transformed computers, music, and smartphones with the Macintosh and iPhone.',
    'Steve Jobs là doanh nhân và nhà sáng chế vĩ đại người Mỹ, người đồng sáng lập Apple và thay đổi toàn bộ thế giới công nghệ với Macintosh, iPod và iPhone.',
    'male', 'unveiling the revolutionary iPhone in 2007', 'buổi ra mắt chiếc iPhone đầu tiên năm 2007',
    'Bitten-Apple Visionary Shaman', 'Phù Thủy Quả Táo Cắn Dở'
  ],
  [
    'Freddie Mercury', 1946, 1991, 'GB', 'century_20_early', 'any', 'polytheism',
    'British singer, songwriter, and lead vocalist of rock band Queen',
    'Huyền thoại nhạc rock và giọng ca chính của ban nhạc Queen',
    'Freddie Mercury was a British singer and songwriter, best known as the flamboyant lead vocalist of Queen with a legendary four-octave vocal range.',
    'Freddie Mercury là giọng ca chính của ban nhạc rock Queen lừng danh, sở hữu chất giọng bốn quãng tám hiếm có và phong cách biểu diễn cuồng nhiệt.',
    'male', 'the unforgettable Live Aid performance in 1985', 'màn trình diễn đỉnh cao tại sân khấu Live Aid năm 1985',
    'Four-Octave Rock Monarch', 'Hoàng Tử Rock Giọng Ca 4 Quãng Tám'
  ],
  [
    'Pelé', 1940, 2022, 'BR', 'century_20_early', 'any', 'christianity',
    'Brazilian footballer and three-time World Cup champion',
    'Huyền thoại bóng đá Brazil, ba lần vô địch World Cup',
    'Pelé was a Brazilian professional footballer who played as a forward and became the only player in history to win three FIFA World Cups.',
    'Pelé là huyền thoại bóng đá người Brazil, được người hâm mộ tôn xưng là "Vua Bóng Đá" và là cầu thủ duy nhất ba lần nâng cao cúp vàng World Cup.',
    'male', 'winning three FIFA World Cups for Brazil', 'ba lần đăng quang ngôi vô địch thế giới World Cup',
    'Three-Time World Cup King', 'Vua Bóng Đá Ba Lần Nâng Cúp'
  ],
  [
    'Yuri Gagarin', 1934, 1968, 'RU', 'century_20_early', 'slavic', 'atheist',
    'Soviet cosmonaut and the first human to journey into outer space',
    'Phi hành gia Liên Xô, người đầu tiên bay vào không gian vũ trụ',
    'Yuri Gagarin was a Soviet pilot and cosmonaut who became the first human in outer space when his Vostok spacecraft orbited the Earth in 1961.',
    'Yuri Gagarin là phi hành gia Liên Xô, người đầu tiên trong lịch sử nhân loại bay vào vũ trụ và bay một vòng quanh Trái Đất trên tàu Phương Đông 1 năm 1961.',
    'male', 'becoming the first human in space aboard Vostok 1', 'trở thành người đầu tiên bay vào không gian vũ trụ năm 1961',
    'First Orbit Earth-Flyer', 'Người Đầu Tiên Lượn Vòng Trái Đất'
  ],
  [
    'Akira Kurosawa', 1910, 1998, 'JP', 'century_20_early', 'any', 'buddhism',
    'Japanese film director and cinematic master',
    'Đạo diễn điện ảnh huyền thoại của Nhật Bản',
    'Akira Kurosawa was a Japanese filmmaker and painter regarded as one of the most important and influential directors in cinematic history.',
    'Akira Kurosawa là nhà làm phim bậc thầy người Nhật Bản, cha đẻ của các tuyệt tác điện ảnh kinh điển như Rashomon, Bảy Samurai và Kagemusha.',
    'male', 'directing the cinematic masterpiece Seven Samurai', 'đạo diễn kiệt tác điện ảnh Bảy Samurai năm 1954',
    'Seven Samurai Film Maestro', 'Đại Sư Bảy Samurai Điện Ảnh'
  ],
  [
    'Võ Nguyên Giáp', 1911, 2013, 'VN', 'century_20_early', 'han', 'atheist',
    'Vietnamese general and commander-in-chief of the People\'s Army of Vietnam',
    'Đại tướng Tổng tư lệnh Quân đội Nhân dân Việt Nam',
    'Võ Nguyên Giáp was a Vietnamese general and supreme military commander who led forces to victory at the Battle of Điện Biên Phủ in 1954.',
    'Đại tướng Võ Nguyên Giáp là vị tướng huyền thoại của Việt Nam, người chỉ huy chiến dịch Điện Biên Phủ chấn động địa cầu năm 1954.',
    'male', 'the historic victory at the Battle of Điện Biên Phủ in 1954', 'chiến thắng lịch sử Điện Biên Phủ năm 1954',
    'Legendary Dien Bien Commander', 'Đại Tướng Điện Biên Lừng Lẫy'
  ],
  [
    'Ngô Bảo Châu', 1972, null, 'VN', 'century_20_late', 'han', 'atheist',
    'Vietnamese-French mathematician and Fields Medalist',
    'Nhà toán học Việt Nam đầu tiên đoạt Huy chương Fields',
    'Ngô Bảo Châu is a Vietnamese-French mathematician awarded the Fields Medal in 2010 for his proof of the fundamental lemma in the theory of automorphic forms.',
    'Ngô Bảo Châu là nhà toán học người Việt Nam đầu tiên đoạt Huy chương Fields danh giá vào năm 2010 nhờ công trình chứng minh Bổ đề cơ bản.',
    'male', 'winning the Fields Medal in 2010', 'đoạt Huy chương Fields danh giá năm 2010',
    'Fundamental Lemma Knight', 'Hiệp Sĩ Bổ Đề Cơ Bản'
  ],
  [
    'Trịnh Công Sơn', 1939, 2001, 'VN', 'century_20_early', 'han', 'buddhism',
    'Vietnamese composer, songwriter and painter',
    'Nhạc sĩ huyền thoại của tân nhạc Việt Nam',
    'Trịnh Công Sơn was a Vietnamese composer regarded as one of the most influential and beloved songwriters in modern Vietnamese history.',
    'Trịnh Công Sơn là nhạc sĩ tài hoa bậc nhất của Việt Nam, tác giả của những bản tình ca và bài hát hòa bình lay động lòng người qua nhiều thế hệ.',
    'male', 'writing timeless songs that defined a generation', 'viết những ca khúc bất hủ định hình cả một thế hệ',
    'Great Circle Songsmith', 'Nhạc Sĩ Nối Vòng Tay Lớn'
  ],
  [
    'Phạm Tuân', 1947, null, 'VN', 'century_20_early', 'han', 'atheist',
    'Vietnamese cosmonaut and first Asian in space',
    'Anh hùng lực lượng vũ trang, phi công vũ trụ đầu tiên của châu Á',
    'Phạm Tuân is a retired Vietnamese air force officer and cosmonaut who flew aboard Soyuz 37 in 1980, becoming the first Vietnamese and first Asian in space.',
    'Phạm Tuân là phi công vũ trụ đầu tiên của Việt Nam và châu Á bay vào không gian trên con tàu Soyuz 37 vào năm 1980.',
    'male', 'flying to outer space aboard Soyuz 37 in 1980', 'chuyến bay lịch sử vào vũ trụ trên tàu Soyuz 37 năm 1980',
    'Flying Fortress Space Ace', 'Anh Hùng Bắn Rơi Pháo Đài Bay'
  ],
  [
    'Lionel Messi', 1987, null, 'AR', 'century_20_late', 'roman_italic', 'christianity',
    'Argentine professional footballer and World Cup champion',
    'Siêu sao bóng đá người Argentina, nhà vô địch World Cup',
    'Lionel Messi is an Argentine footballer who captained his nation to victory at the 2022 FIFA World Cup and has won a record eight Ballon d\'Or awards.',
    'Lionel Messi là huyền thoại bóng đá người Argentina, chủ nhân của 8 Quả Bóng Vàng và người đội trưởng đưa Argentina vô địch World Cup 2022.',
    'male', 'lifting the FIFA World Cup trophy in 2022', 'nâng cao cúp vàng World Cup 2022 tại Qatar',
    'Ballon d\'Or Century Magician', 'Thuật Sĩ Quả Bóng Vàng Thế Kỷ'
  ],
  [
    'Greta Thunberg', 2003, null, 'SE', 'century_21', 'any', 'atheist',
    'Swedish environmental activist',
    'Nhà hoạt động môi trường trẻ tuổi người Thụy Điển',
    'Greta Thunberg is a Swedish climate activist who began the school strike for climate in 2018, which rapidly grew into a worldwide movement.',
    'Greta Thunberg là nhà hoạt động môi trường người Thụy Điển, người khởi xướng chiến dịch bãi khóa vì khí hậu lan rộng khắp năm châu.',
    'female', 'starting the global school strike for climate', 'khởi xướng cuộc bãi khóa toàn cầu vì khí hậu năm 2018',
    'School Strike Climate Crusader', 'Hiệp Sĩ Bãi Khóa Vì Trái Đất'
  ],
  [
    'Barack Obama', 1961, null, 'US', 'century_20_late', 'any', 'christianity',
    'American politician and 44th president of the United States',
    'Tổng thống thứ 44 của Hợp chúng quốc Hoa Kỳ',
    'Barack Obama is an American politician who served as the 44th president of the United States from 2009 to 2017, the first African American to hold the office.',
    'Barack Obama là tổng thống thứ 44 của Hoa Kỳ, vị tổng thống người Mỹ gốc Phi đầu tiên trong lịch sử nước Mỹ.',
    'male', 'winning the historic 2008 presidential election', 'chiến thắng vang dội trong cuộc bầu cử tổng thống Mỹ năm 2008',
    'Yes We Can Orator', 'Chính Khách Hùng Biện "Yes We Can"'
  ],
  [
    'Michael Jordan', 1963, null, 'US', 'century_20_late', 'any', 'christianity',
    'American basketball player and six-time NBA champion',
    'Huyền thoại bóng rổ NBA người Mỹ',
    'Michael Jordan is an American former professional basketball player who won six NBA championships with the Chicago Bulls.',
    'Michael Jordan là huyền thoại bóng rổ người Mỹ, người đã sáu lần đưa câu lạc bộ Chicago Bulls lên đỉnh vinh quang NBA.',
    'male', 'winning six NBA championships with the Chicago Bulls', 'sáu chức vô địch NBA lừng lẫy cùng Chicago Bulls',
    'Airborne NBA Court Deity', 'Vị Thần Bay Trên Sàn Gỗ NBA'
  ],
  [
    'Marilyn Monroe', 1926, 1962, 'US', 'century_20_early', 'anglo_saxon', 'judaism',
    'American actress, model and cultural icon',
    'Nữ minh tinh điện ảnh và biểu tượng sắc đẹp nước Mỹ',
    'Marilyn Monroe was an American actress and model who became one of the most popular film stars of the 1950s and a lasting pop cultural icon.',
    'Marilyn Monroe là nữ diễn viên và biểu tượng sắc đẹp kinh điển của Hollywood trong thập niên 1950.',
    'female', 'the famous subway-grate dress scene in The Seven Year Itch', 'cảnh quay tung váy trắng bất hủ bên khe thông gió tàu điện ngầm',
    'Windblown White-Dress Goddess', 'Nữ Thần Váy Trắng Bay Trong Gió'
  ],
  [
    'Rosalind Franklin', 1920, 1958, 'GB', 'century_20_early', 'jewish', 'judaism',
    'English chemist and X-ray crystallographer',
    'Nhà hóa học và tinh thể học tia X người Anh gốc Do Thái',
    'Rosalind Franklin was an English chemist whose work on X-ray diffraction images of DNA, notably Photo 51, was crucial to understanding its structure.',
    'Rosalind Franklin là nhà khoa học người Anh gốc Do Thái, người chụp bức ảnh 51 chìa khóa mở đường giải mã chuỗi xoắn kép DNA.',
    'female', 'capturing Photo 51 which revealed the double-helix DNA structure', 'chụp Bức ảnh 51 giúp giải mã cấu trúc xoắn kép của DNA',
    'Double-Helix Shadow Cryptic', 'Bóng Ma Giải Mã Chuỗi Xoắn Kép'
  ],
  [
    'Walt Disney', 1901, 1966, 'US', 'century_20_early', 'anglo_saxon', 'christianity',
    'American animator, film producer and entrepreneur',
    'Người tiên phong của ngành hoạt hình và sáng lập Disney',
    'Walt Disney was an American animator and entrepreneur who pioneered the animation industry and co-created Mickey Mouse.',
    'Walt Disney là nhà làm phim và doanh nhân người Mỹ, người sáng tạo ra chú chuột Mickey và xây dựng đế chế giải trí Walt Disney.',
    'male', 'creating Mickey Mouse and modern feature animation', 'sáng tạo ra chú chuột Mickey và vương quốc Disneyland',
    'Round-Eared Mouse Kingdom Baron', 'Chúa Tể Vương Quốc Chuột Tai Tròn'
  ],
  [
    'Salvador Dalí', 1904, 1989, 'ES', 'century_20_early', 'roman_italic', 'atheist',
    'Spanish surrealist artist and painter',
    'Danh họa theo trường phái siêu thực người Tây Ban Nha',
    'Salvador Dalí was a Spanish surrealist artist renowned for his technical skill, striking dream imagery, and The Persistence of Memory.',
    'Salvador Dalí là danh họa siêu thực người Tây Ban Nha, nổi tiếng với bức tranh những chiếc đồng hồ tan chảy và cá tính lập dị.',
    'male', 'the melting clocks of The Persistence of Memory', 'những chiếc đồng hồ tan chảy trong kiệt tác The Persistence of Memory',
    'Melting-Clock Surrealist Guru', 'Thánh Nấu Chảy Đồng Hồ Siêu Thực'
  ],
  [
    'Jackie Chan', 1954, null, 'CN', 'century_20_late', 'han', 'buddhism',
    'Hong Kong actor, martial artist and director',
    'Ngôi sao võ thuật và diễn viên hài hành động Hồng Kông',
    'Jackie Chan is a Hong Kong actor and martial artist known for his acrobatic fighting style and performing his own dangerous stunts.',
    'Thành Long là diễn viên võ thuật huyền thoại của Hồng Kông, nổi tiếng với phong cách nhào lộn hài hước và luôn tự thực hiện các pha mạo hiểm.',
    'male', 'performing his own acrobatic stunts in Police Story', 'tự thực hiện các pha nhào lộn mạo hiểm trong Câu Chuyện Cảnh Sát',
    'Furniture-Combat Kung Fu King', 'Vua Đánh Nhau Bằng Bàn Ghế'
  ],
  [
    'Hayao Miyazaki', 1941, null, 'JP', 'century_20_early', 'any', 'polytheism',
    'Japanese animator, director and Studio Ghibli co-founder',
    'Đạo diễn hoạt hình huyền thoại của Studio Ghibli người Nhật Bản',
    'Hayao Miyazaki is a Japanese animator and director whose film Spirited Away won the Academy Award for Best Animated Feature.',
    'Hayao Miyazaki là đạo diễn hoạt hình huyền thoại người Nhật Bản, đồng sáng lập Studio Ghibli với kiệt tác Vùng Đất Linh Hồn đoạt giải Oscar.',
    'male', 'directing the Academy Award-winning Spirited Away', 'bộ phim Vùng Đất Linh Hồn đoạt giải Oscar danh giá',
    'Wind-Gliding Animation Sorcerer', 'Phù Thủy Hoạt Hình Bay Cùng Gió'
  ]
];

export const FAMOUS_ROLES = {
  'Alexander Bogdanov': { vi: 'Nhà Khoa Học Tự Đổi Máu', en: 'Mad Blood-Swapping Scientist' },
  'Franz Reichelt': { vi: 'Thợ May Nhảy Dù Kỳ Cục', en: 'Quirky Parachute-Suit Tailor' },
  'Joshua Norton': { vi: 'Vua Tự Phong Của Nước Mỹ', en: 'Self-Proclaimed Emperor of the USA' },
  'Albert Einstein': { vi: 'Giáo Sư Tóc Xù Bẻ Cong Thời Không', en: 'Wild-Haired Spacetime Bender' },
  'Julius Caesar': { vi: 'Đại Tướng Băng Qua Sông Rubicon', en: 'Rubicon-Crossing Grand General' },
  'Leonardo da Vinci': { vi: 'Họa Sĩ Kiêm Kỹ Sư Đa Năng Vũ Trụ', en: 'Multiverse Renaissance Polymath' },
  'Trần Hưng Đạo': { vi: 'Đại Tướng Đánh Bại Thủy Quái Mông Cổ', en: 'Invincible Mongol Fleet Crusher' },
  'Joan of Arc': { vi: 'Nữ Chiến Binh Nghe Tiếng Nói Của Trời', en: 'Celestial Voice Vanguard' },
  'Isaac Newton': { vi: 'Nhà Bác Học Bị Táo Rơi Trúng Đầu', en: 'Apple-Struck Gravity Mastermind' },
  'Napoleon Bonaparte': { vi: 'Hoàng Đế Thấp Bé Thích Đội Mũ Ngang', en: 'Bicorn-Hat Petite Emperor' },
  'Alan Turing': { vi: 'Phù Thủy Giải Mã & Tổ Phụ AI', en: 'Enigma Codebreaker & AI Grandfather' },
  'Frida Kahlo': { vi: 'Họa Sĩ Tự Họa Rực Rỡ & Nổi Loạn', en: 'Rebellious Self-Portrait Virtuoso' },
  'Neil Armstrong': { vi: 'Lữ Khách Đầu Tiên Cắm Cờ Mặt Trăng', en: 'First Moonwalker & Space Scout' },
  'Sigmund Freud': { vi: 'Bác Sĩ Đọc Giấc Mơ Bí Ẩn', en: 'Subconscious Dream Decoder' },
  'Nikola Tesla': { vi: 'Phù Thủy Sấm Sét Không Dây', en: 'Wireless Lightning Sorcerer' },
  'Marie Curie': { vi: 'Nữ Bá Tước Phóng Xạ Phát Sáng', en: 'Glowing Radioactive Pioneer' },
  'Nelson Mandela': { vi: 'Hiệp Sĩ Phá Bỏ Bức Tường Ngăn Cách', en: 'Unshakable Freedom Champion' },
  'Audrey Hepburn': { vi: 'Nàng Thơ Thanh Lịch Vượt Thời Gian', en: 'Timeless Elegance & Kindness Icon' },
  'Muhammad Ali': { vi: 'Vua Quyền Anh Bay Như Bướm Chích Như Ong', en: 'Float Like A Butterfly Heavyweight King' },
  'Stephen Hawking': { vi: 'Kẻ Thám Hiểm Hố Đen Vũ Trụ', en: 'Black Hole Cosmic Explorer' },
  'Steve Jobs': { vi: 'Phù Thủy Quả Táo Cắn Dở', en: 'Bitten-Apple Visionary Shaman' },
  'Freddie Mercury': { vi: 'Hoàng Tử Rock Giọng Ca 4 Quãng Tám', en: 'Four-Octave Rock Monarch' },
  'Pelé': { vi: 'Vua Bóng Đá Ba Lần Nâng Cúp', en: 'Three-Time World Cup King' },
  'Yuri Gagarin': { vi: 'Người Đầu Tiên Lượn Vòng Trái Đất', en: 'First Orbit Earth-Flyer' },
  'Akira Kurosawa': { vi: 'Đại Sư Bảy Samurai Điện Ảnh', en: 'Seven Samurai Film Maestro' },
  'Võ Nguyên Giáp': { vi: 'Đại Tướng Điện Biên Lừng Lẫy', en: 'Legendary Dien Bien Commander' },
  'Ngô Bảo Châu': { vi: 'Hiệp Sĩ Bổ Đề Cơ Bản', en: 'Fundamental Lemma Knight' },
  'Trịnh Công Sơn': { vi: 'Nhạc Sĩ Nối Vòng Tay Lớn', en: 'Great Circle Songsmith' },
  'Phạm Tuân': { vi: 'Anh Hùng Bắn Rơi Pháo Đài Bay', en: 'Flying Fortress Space Ace' },
  'Lionel Messi': { vi: 'Thuật Sĩ Quả Bóng Vàng Thế Kỷ', en: 'Ballon d\'Or Century Magician' },
  'Greta Thunberg': { vi: 'Hiệp Sĩ Bãi Khóa Vì Trái Đất', en: 'School Strike Climate Crusader' },
  'Barack Obama': { vi: 'Chính Khách Hùng Biện "Yes We Can"', en: 'Yes We Can Orator' },
  'Michael Jordan': { vi: 'Vị Thần Bay Trên Sàn Gỗ NBA', en: 'Airborne NBA Court Deity' },
  'Marilyn Monroe': { vi: 'Nữ Thần Váy Trắng Bay Trong Gió', en: 'Windblown White-Dress Goddess' },
  'Rosalind Franklin': { vi: 'Bóng Ma Giải Mã Chuỗi Xoắn Kép', en: 'Double-Helix Shadow Cryptic' },
  'Walt Disney': { vi: 'Chúa Tể Vương Quốc Chuột Tai Tròn', en: 'Round-Eared Mouse Kingdom Baron' },
  'Salvador Dalí': { vi: 'Thánh Nấu Chảy Đồng Hồ Siêu Thực', en: 'Melting-Clock Surrealist Guru' },
  'Jackie Chan': { vi: 'Vua Đánh Nhau Bằng Bàn Ghế', en: 'Furniture-Combat Kung Fu King' },
  'Hayao Miyazaki': { vi: 'Phù Thủy Hoạt Hình Bay Cùng Gió', en: 'Wind-Gliding Animation Sorcerer' }
};

export const OFFLINE_FICTIONAL = [
  // [name, birth, countryId, descEn, descVi, summaryEn, summaryVi, img, url, gender, evEn, evVi, targetRoleEn, targetRoleVi]
  [
    'Son Goku', 1984, 'JP',
    'Legendary Saiyan warrior and savior of Earth from Dragon Ball',
    'Chiến binh Saiyan huyền thoại và người bảo vệ Trái Đất trong Dragon Ball',
    'Son Goku, born Kakarot, is the legendary Saiyan warrior and defender of Earth who constantly seeks stronger opponents across the multiverse and achieved Ultra Instinct.',
    'Son Goku (tên thật là Kakarot) là chiến binh Saiyan huyền thoại của Trái Đất, người đã đạt tới cảnh giới Bản Năng Vô Cực (Ultra Instinct) và nhiều lần cứu vũ trụ khỏi diệt vong.',
    'https://upload.wikimedia.org/wikipedia/vi/a/af/Son_Goku_YoungAdult.PNG',
    'https://vi.wikipedia.org/wiki/Son_Goku',
    'male', 'achieving Ultra Instinct in the Tournament of Power', 'đạt tới cảnh giới Bản Năng Vô Cực tại Giải đấu Sức mạnh',
    'Ultra Instinct Saiyan Legend', 'Chiến Binh Saiyan Bản Năng Vô Cực'
  ],
  [
    'Naruto Uzumaki', 1999, 'JP',
    'Seventh Hokage of Konohagakure and Nine-Tails Jinchuriki',
    'Hokage Đệ Thất của Làng Lá và Jinchuriki của Cửu Vĩ Kurama',
    'Naruto Uzumaki is a heroic shinobi of Konohagakure and the jinchuriki of the Nine-Tails who overcame immense solitude to unite the ninja world as the Seventh Hokage.',
    'Naruto Uzumaki là ninja anh hùng của Làng Lá, người mang trong mình sức mạnh Cửu Vĩ Hồ Ly Kurama, người đã kết thúc Đại chiến Ninja lần thứ tư và trở thành Hokage Đệ Thất.',
    'https://upload.wikimedia.org/wikipedia/vi/9/9a/NarutoUzumaki.png',
    'https://vi.wikipedia.org/wiki/Uzumaki_Naruto',
    'male', 'uniting the ninja nations and befriending Kurama', 'hòa giải với Cửu Vĩ Kurama và đoàn kết các làng nhẫn giả',
    'Nine-Tails Hokage Vanguard', 'Hokage Đệ Thất Hiệp Sĩ Cửu Vĩ'
  ],
  [
    'Raiden Shogun', 2021, 'JP',
    'Electro Archon of Inazuma pursuing eternal stasis',
    'Lôi Thần tối cao của Inazuma, người theo đuổi sự Vĩnh Hằng tuyệt đối',
    'The Raiden Shogun (Ei) is the sovereign Electro Archon of Inazuma who wields the devastating Musou no Hitotachi sword technique and rules over thunder and lightning.',
    'Raiden Shogun (Lôi Đòn Tướng Quân - Ei) là vị Lôi Thần thống trị vương quốc Inazuma, sở hữu thần kiếm Vô Tưởng Nhất Đao có thể chém đứt núi non và bẻ cong sấm sét.',
    'https://upload.wikimedia.org/wikipedia/en/e/e2/Raiden-shogun-arm.png',
    'https://en.wikipedia.org/wiki/Raiden_Shogun',
    'female', 'cleaving Yashiori Island with the Musou no Hitotachi', 'chém đôi đảo Yashiori bằng một nhát kiếm Vô Tưởng Nhất Đao',
    'Musou Sword Electro Archon', 'Lôi Thần Chém Đôi Thời Không'
  ],
  [
    '2B (YoRHa No.2 Type B)', 2017, 'JP',
    'YoRHa elite all-purpose combat android from NieR:Automata',
    'Nữ chiến binh người máy tác chiến tinh nhuệ YoRHa trong NieR:Automata',
    'YoRHa No.2 Type B (2B) is a master combat blade android deployed by humanity\'s automated resistance to reclaim the ruined Earth from machine lifeforms.',
    '2B (YoRHa No.2 Type B) là nữ người máy chiến đấu tinh nhuệ với mái tóc bạc và dải bịt mắt đen, sử dụng song kiếm katana siêu việt trong cuộc chiến giải phóng Trái Đất.',
    'https://static.wikia.nocookie.net/p__/images/4/4a/2B.png/revision/latest/scale-to-width-down/500?cb=20230518025841&path-prefix=protagonist',
    'https://hero.fandom.com/wiki/2B',
    'female', 'the climactic battle against Goliath machine cores', 'cuộc đụng độ nghẹt thở với các cỗ máy khổng lồ Goliath',
    'Dual-Katana Android Ace', 'Nữ Kiếm Sĩ Người Máy Băng Giá'
  ],
  [
    'Bruce Wayne (Batman)', 1939, 'US',
    'The Dark Knight detective and vigilante protector of Gotham City',
    'Hiệp sĩ bóng đêm và thám tử vĩ đại bảo vệ thành phố Gotham',
    'Batman is the vigilante persona of billionaire Bruce Wayne, dedicated to fighting the criminal underworld of Gotham City through supreme martial mastery, detective intellect, and advanced technology.',
    'Batman là biểu tượng công lý bóng đêm của tỷ phú Bruce Wayne, sử dụng trí tuệ thiên tài, võ thuật siêu đẳng và kho công nghệ tối tân để thanh trừng tội phạm tại Gotham.',
    'https://upload.wikimedia.org/wikipedia/en/c/c7/Batman_Infobox.jpg',
    'https://vi.wikipedia.org/wiki/Batman',
    'male', 'outsmarting the Joker and the Court of Owls', 'đánh bại Joker và giải mã hội kín Tòa án Cú',
    'Prep-Time Caped Crusader', 'Hiệp Sĩ Áo Choàng Bóng Đêm Gotham'
  ],
  [
    'Darth Vader', 1977, 'US',
    'Fearsome Sith Lord and cybernetic commander of the Galactic Empire',
    'Chúa tể Sith người máy đáng sợ của Đế chế Thiên hà',
    'Darth Vader, formerly Anakin Skywalker, is the cybernetic Sith Lord who wields the dark side of the Force and commands the Imperial military across the galaxy.',
    'Darth Vader (từng là hiệp sĩ Jedi Anakin Skywalker) là Chúa tể Sith nửa người nửa máy khét tiếng, nắm giữ Thần Lực Hắc Ám và thanh kiếm ánh sáng đỏ reo rắc kinh hoàng dải ngân hà.',
    'https://upload.wikimedia.org/wikipedia/en/0/0b/Darth_Vader_in_The_Empire_Strikes_Back.jpg',
    'https://vi.wikipedia.org/wiki/Darth_Vader',
    'male', 'wielding the crimson lightsaber on the Death Star', 'chỉ huy Hạm đội Tinh nhuệ trên Trạm không gian Ngôi Sao Chết',
    'Red Lightsaber Force Choker', 'Chúa Tể Sith Bóp Cổ Bằng Thần Lực'
  ],
  [
    'Monkey D. Luffy', 1997, 'JP',
    'Rubber-bodied captain of the Straw Hat Pirates seeking the One Piece',
    'Thuyền trưởng băng Mũ Rơm với cơ thể cao su tìm kiếm kho báu One Piece',
    'Monkey D. Luffy is the free-spirited captain of the Straw Hat Pirates who ate the Gum-Gum Fruit and awakened the Sun God Nika Gear 5 power to become King of the Pirates.',
    'Monkey D. Luffy là thuyền trưởng băng hải tặc Mũ Rơm, người sở hữu cơ thể cao su co giãn vô hạn và đã thức tỉnh trạng thái Thần Mặt Trời Nika (Gear 5) đầy tự do.',
    'https://upload.wikimedia.org/wikipedia/en/c/cb/Monkey_D_Luffy.png',
    'https://vi.wikipedia.org/wiki/Monkey_D._Luffy',
    'male', 'awakening Gear 5 Sun God Nika on Onigashima', 'thức tỉnh trạng thái Thần Mặt Trời Nika Gear 5 tại đảo Quỷ',
    'Gear 5 Sun God Pirate King', 'Vua Hải Tặc Thần Mặt Trời Nika'
  ],
  [
    'Sherlock Holmes', 1887, 'GB',
    'World-renowned consulting detective of 221B Baker Street',
    'Thám tử tư vấn huyền thoại tại số 221B phố Baker, Luân Đôn',
    'Sherlock Holmes is the brilliant fictional consulting detective created by Sir Arthur Conan Doyle, celebrated for observation, forensic science, and flawless logical deduction.',
    'Sherlock Holmes là bậc thầy thám tử tư vấn số một thế giới, người sở hữu óc quan sát vi mô và phương pháp suy luận logic phá giải những vụ án kỳ bí nhất lịch sử văn học.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Sherlock_Holmes_Portrait_Paget.jpg/330px-Sherlock_Holmes_Portrait_Paget.jpg',
    'https://en.wikipedia.org/wiki/Sherlock_Holmes',
    'male', 'the intellectual duel at Reichenbach Falls', 'màn đấu trí kinh điển tại thác nước Reichenbach',
    'Baker Street Deduction Mastermind', 'Đại Pháp Sư Suy Luận Phố Baker'
  ],
  [
    'Geralt of Rivia', 1993, 'PL',
    'Mutated monster-hunting Witcher known as the White Wolf',
    'Thợ săn quái vật đột biến mang biệt danh Sói Trắng xứ Rivia',
    'Geralt of Rivia is a magically mutated monster slayer for hire from The Witcher series, renowned for his superhuman reflexes, silver swordplay, and alchemy.',
    'Geralt xứ Rivia là thợ săn quái vật Witcher sở hữu mái tóc bạc trắng, đôi mắt mèo và thanh kiếm bạc diệt ma, người chu du khắp Lục Địa để giải trừ những lời nguyền hắc ám.',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Geralt.jpg/330px-Geralt.jpg',
    'https://en.wikipedia.org/wiki/Geralt_of_Rivia',
    'male', 'slaying the Striga and defending Cintra', 'tiêu diệt quái thú Striga và hộ tống công chúa Cintra',
    'White Wolf Silver Swordsman', 'Thợ Săn Quái Vật Kiếm Bạc Sói Trắng'
  ],
  [
    'Mario', 1981, 'IT',
    'Mushroom Kingdom plumber and superstar hero of Nintendo',
    'Chàng thợ sửa ống nước và siêu anh hùng của Vương quốc Nấm',
    'Mario is Nintendo\'s celebrated Italian plumber who repeatedly embarks on epic adventures across the Mushroom Kingdom to rescue Princess Peach from Bowser.',
    'Mario là biểu tượng game lừng danh toàn cầu, chàng thợ sửa ống nước dũng cảm luôn nhảy qua đầu quân thù và nuốt nấm ma thuật để giải cứu Công chúa Peach khỏi nanh vuốt Bowser.',
    'https://upload.wikimedia.org/wikipedia/en/5/5c/Mario_by_Shigehisa_Nakaue.png',
    'https://en.wikipedia.org/wiki/Mario',
    'male', 'stomping Bowser and conquering World 8', 'vượt qua Lâu đài Thế giới 8 và đánh bại trùm rùa Bowser',
    'Mushroom Stomping Plumber Hero', 'Hiệp Sĩ Nấm Đạp Rùa Đỉnh Cao'
  ]
];

export class WikipediaModel {
  // Core caching and circuit breaker state
  constructor() {
    // Query cache: Map keyed by normalized query URL, 10-minute TTL, 100-entry max
    this._queryCache = new Map();
    this._rateLimitedUntil = 0;
    // Prefetch state for reactive background loading.
    // _prefetchPool is a flat array of pre-scored candidates (never a Map):
    // arrays preserve insertion order for weighted sampling and avoid the
    // per-key bookkeeping that broke when filters changed mid-flight.
    this._prefetchPool = [];
    this._prefetchFilterKey = null;
    this._prefetchPromise = null;
    this._prefetchTimer = null;

    // --- Resolved image cache (Map + localStorage) ---
    // Every successfully resolved portrait URL is persisted so future spins
    // load the exact URL in 0ms — no per-card REST round-trip.
    this._imageCache = this._loadImageCache();

    // --- Rotating multi-session discovery cache ---
    // Up to 300 characters persisted across sessions in localStorage so the
    // roulette never repeats the same small cast. When sampling 20 cards we
    // exclude the last 25 pulled IDs to force diversity.
    this._discoveredCache = this._loadDiscoveredCache();
    this._pulledIds = this._loadPulledIds();
  }

  _loadDiscoveredCache() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem('wg_discovered_cache');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, 300) : [];
    } catch (e) {
      return [];
    }
  }

  _loadImageCache() {
    try {
      if (typeof localStorage === 'undefined') return new Map();
      const raw = localStorage.getItem('wg_image_cache');
      if (!raw) return new Map();
      const obj = JSON.parse(raw);
      const m = new Map();
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          if (v) m.set(k, v);
        }
      }
      return m;
    } catch (e) {
      return new Map();
    }
  }

  _saveImageCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      const obj = {};
      for (const [k, v] of this._imageCache.entries()) obj[k] = v;
      localStorage.setItem('wg_image_cache', JSON.stringify(obj));
    } catch (e) {}
  }

  // Persist a resolved portrait URL keyed by the card's canonical title so
  // future spins resolve the exact URL in 0ms.
  _cacheImage(title, url) {
    if (!title || !url) return;
    const key = String(title).toLowerCase().trim();
    if (this._imageCache.get(key) === url) return;
    this._imageCache.set(key, url);
    this._saveImageCache();
  }

  // Return a previously-resolved portrait URL, or null.
  _getCachedImage(title) {
    if (!title) return null;
    return this._imageCache.get(String(title).toLowerCase().trim()) || null;
  }

  _saveDiscoveredCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('wg_discovered_cache', JSON.stringify(this._discoveredCache.slice(0, 300)));
    } catch (e) {}
  }

  _loadPulledIds() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem('wg_pulled_ids');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-25) : [];
    } catch (e) {
      return [];
    }
  }

  _savePulledIds() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('wg_pulled_ids', JSON.stringify(this._pulledIds.slice(-25)));
    } catch (e) {}
  }

  // Merge freshly discovered candidates into the rotating cache (max 300).
  _mergeDiscovered(candidates) {
    if (!Array.isArray(candidates) || !candidates.length) return;
    const seen = new Set(this._discoveredCache.map(c => c.pageid != null ? c.pageid : c.name));
    for (const c of candidates) {
      if (!c) continue;
      const key = c.pageid != null ? c.pageid : c.name;
      if (key == null || seen.has(key)) continue;
      seen.add(key);
      this._discoveredCache.push(c);
    }
    // Keep the most recent 300 (FIFO trim)
    if (this._discoveredCache.length > 300) {
      this._discoveredCache = this._discoveredCache.slice(-300);
    }
    this._saveDiscoveredCache();
  }

  // Record the IDs that were just pulled so the next 20-card sample excludes them.
  _recordPulledIds(cards) {
    if (!Array.isArray(cards)) return;
    for (const c of cards) {
      if (!c) continue;
      const key = c.pageid != null ? c.pageid : (c.char_key != null ? c.char_key : c.name);
      if (key == null) continue;
      this._pulledIds.push(key);
    }
    // Keep only the last 30 pulled keys so the next 20-card sample is diverse.
    if (this._pulledIds.length > 30) {
      this._pulledIds = this._pulledIds.slice(-30);
    }
    this._savePulledIds();
  }

  // Convert a persistent `discovered_characters` DB row into the card shape the
  // rest of the app expects (title/name/img/url/...). DB rows carry no
  // `_eval`/`score`, so we score them here with the same engine the live pool
  // uses — that keeps weighted sampling fair between DB-backed and live cards.
  _dbRowToCard(row, inp = {}) {
    if (!row) return null;
    const name = row.name || row.en_title || row.char_key;
    if (!name) return null;
    const card = {
      title: String(name),
      name: String(name).replace(/\s*\(.*\)$/, ''),
      enTitle: row.en_title || String(name),
      wikiTitle: row.en_title || String(name),
      birth: row.era_year != null ? Number(row.era_year) : null,
      death: null,
      countryId: row.country || 'any',
      era: this.deriveEra(row.era_year != null ? Number(row.era_year) : null),
      ethnicity: row.ethnicity || 'any',
      religion: row.religion || 'any',
      desc: row.bio_en || row.bio_vi || '',
      descEn: row.bio_en || null,
      descVi: row.bio_vi || null,
      summary: row.bio_en || row.bio_vi || '',
      summaryEn: row.bio_en || null,
      summaryVi: row.bio_vi || null,
      img: row.img_url || null,
      url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(String(name).replace(/ /g, '_')),
      urlVi: null,
      gender: row.gender || null,
      source: row.source_wiki || 'wiki',
      universe: row.universe || 'historical',
      ev: null,
      targetRole: row.target_role || null,
      text: ((row.bio_en || '') + ' ' + (row.bio_vi || '') + ' ' + name).toLowerCase(),
      char_key: row.char_key,
      _dbRow: row
    };
    const sc = this.score(card, inp);
    card.score = sc.total;
    card.parts = sc.parts;
    card.tier = sc.tier;
    return card;
  }

  // Hydrate `_prefetchPool` immediately from the persistent DB character pool
  // (`GET /api/character-pool`). Runs BEFORE the live Wikipedia fetch so instant
  // spins work even when Wikipedia is slow or rate-limited. Falls back to the
  // offline pool if the endpoint is unreachable.
  async _fetchCharacterPoolFromDB(inputs = {}) {
    if (typeof fetch === 'undefined') return [];
    const q = new URLSearchParams();
    if (inputs.universe) q.set('universe', inputs.universe);
    if (inputs.country) q.set('country', inputs.country);
    if (inputs.gender) q.set('gender', inputs.gender);
    q.set('limit', '120');

    const url = '/api/character-pool?' + q.toString();
    let j;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return [];
      j = await resp.json();
    } catch (e) {
      return [];
    }
    if (!j || !Array.isArray(j.characters)) return [];

    return j.characters
      .map(row => this._dbRowToCard(row, inputs))
      .filter(Boolean);
  }

  // --- Query Cache with 10-min TTL and 100-entry max ---
  _cacheKey(url) {
    return url.split('?')[0] + '?' + new URLSearchParams(url.split('?')[1] || '').toString();
  }

  async cachedFetchJSON(url, timeoutMs = 9000) {
    const key = this._cacheKey(url);
    const now = Date.now();
    const entry = this._queryCache.get(key);
    if (entry && now - entry.ts < 600000) { // 10 minutes TTL
      return entry.data;
    }

    if (this._rateLimitedUntil > now) {
      throw new Error('rate limited');
    }

    let data;
    try {
      data = await this.fetchJSON(url, timeoutMs);
    } catch (err) {
      if (err && err.message === 'rate limited') throw err;
      throw err;
    }

    // Prune when size exceeds 100
    if (this._queryCache.size >= 100) {
      const firstKey = this._queryCache.keys().next().value;
      this._queryCache.delete(firstKey);
    }
    this._queryCache.set(key, { ts: now, data });
    return data;
  }

  // --- HTTP 429 Circuit Breaker ---
  isRateLimited() {
    return Date.now() < this._rateLimitedUntil;
  }

  // --- Reactive background prefetching ---
  // Schedule a prefetch with debounce. Returns a promise that resolves with the
  // current pool once ready (either immediately from cache or after fetch).
  // The pool is a flat array of pre-scored candidates so weighted sampling and
  // instant 20-card spins are O(n) with zero network delay.
  schedulePrefetch(inputs = {}, { debounceMs = 450, onStatus } = {}) {
    if (this._prefetchTimer) clearTimeout(this._prefetchTimer);
    if (this._prefetchPromise) {
      // Swallow previous pending prefetch — superseded by this call
      this._prefetchPromise = null;
    }

    const filterKey = this._filterKey(inputs);

    // Immediate resolution if filter unchanged and pool already >= 20
    if (this._prefetchFilterKey === filterKey && this._prefetchPool.length >= 20) {
      this._prefetchFilterKey = filterKey;
      if (onStatus) onStatus('ready', this._prefetchPool.length);
      return Promise.resolve(this._prefetchPool.slice());
    }

    return new Promise((resolve, reject) => {
      this._prefetchTimer = setTimeout(async () => {
        try {
          if (onStatus) onStatus('fetching', 0);

          // 1. Hydrate the pool IMMEDIATELY from the persistent DB character
          //    pool so instant spins work even when Wikipedia is slow. This
          //    runs first and never blocks on live Wikipedia.
          const dbCards = await this._fetchCharacterPoolFromDB(inputs);

          // 2. If the persistent pool has < 40 characters, ALWAYS trigger
          //    the background harvester immediately (even on initial page load!)
          //    to populate the pool with fresh Wikipedia + Fandom characters.
          if (dbCards.length < 40) {
            this._runBackgroundHarvester(inputs).catch(() => {});
          } else {
            // 3. Run a non-blocking background Wikipedia + Fandom harvester
            //    (max 3-4 requests, randomized gsroffset 0-45) that POSTs newly
            //    discovered characters to /api/character-pool. Fire-and-forget —
            //    it must never stall the spin animation.
            this._runBackgroundHarvester(inputs).catch(() => {});
          }

          // 4. Merge: DB pool first (already image-verified), then live pool
          //    fetched WITHOUT resolving images (avoids 429 floods).
          let pool = dbCards;
          try {
            const liveCards = await this._fetchPoolImpl({ ...inputs, selectedMinYear: inputs.eraYear || inputs.year || inputs.era || 1900 });
            const seen = new Set(pool.map(c => c.title));
            for (const c of liveCards) {
              if (c && c.title && !seen.has(c.title)) {
                seen.add(c.title);
                pool.push(c);
              }
            }
          } catch (err) {
            // Live fetch failed — DB pool is still enough for a spin.
          }

          // Score with the 3-stage hard-constraint + weighted engine (ScoringEngine)
          // _fetchPoolImpl now returns pre-scored, ranked candidates
          const passing = pool.filter(c => c && c._eval && c._eval.pass && c._eval.score >= 30);
          this._prefetchPool = passing;
          this._prefetchFilterKey = filterKey;
          if (onStatus) onStatus('ready', this._prefetchPool.length);
          resolve(this._prefetchPool.slice());
        } catch (err) {
          if (onStatus) onStatus('offline', 0);
          reject(err);
        }
      }, debounceMs);
    });
  }

  // Non-blocking background harvester. Runs 3-4 randomized Wikipedia + Fandom
  // requests (gsroffset 0-45) AFTER the pool is hydrated, discovers new
  // characters, and POSTs them to /api/character-pool so the persistent pool
  // grows across sessions. Fire-and-forget — errors are logged and swallowed.
  async _runBackgroundHarvester(inputs = {}) {
    if (typeof fetch === 'undefined') return;
    const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const universe = inputs.universe || 'historical';
    const selectedMinYear = inputs.eraYear || inputs.year || inputs.era || 1900;

    const discovered = [];
    const jobs = [];

    // 3-4 randomized Wikipedia search queries with gsroffset 0-45
    const queryCount = 3 + Math.floor(Math.random() * 2); // 3 or 4
    const queries = ['historical figure', 'famous person', 'biography'];
    for (let i = 0; i < queryCount; i++) {
      const q = queries[i % queries.length];
      const offset = rnd(0, 45);
      jobs.push(this.wikiSearch(q, offset, 20, 'en.wikipedia.org', selectedMinYear, 2026, false));
    }

    // Optionally one Fandom category fetch for fictional universes
    if (universe === 'fictional' || universe === 'multiverse') {
      const fandoms = ['genshin-impact.fandom.com', 'naruto.fandom.com', 'onepiece.fandom.com', 'dragonball.fandom.com'];
      const cats = ['Playable_Characters', 'Characters', 'Characters', 'Characters'];
      const idx = Math.floor(Math.random() * fandoms.length);
      jobs.push(this.fetchFandomCategory(fandoms[idx], cats[idx], 20));
    }

    const results = await Promise.allSettled(jobs);
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const c of r.value) {
          if (c && c.title) discovered.push(c);
        }
      }
    }

    if (!discovered.length) return;

    // De-duplicate against what's already in the rotating discovery cache
    const seen = new Set(this._discoveredCache.map(c => c.pageid != null ? c.pageid : c.name));
    const fresh = discovered.filter(c => {
      const k = c.pageid != null ? c.pageid : c.name;
      return k != null && !seen.has(k);
    });

    if (!fresh.length) return;

    // POST the newly discovered characters to the persistent pool.
    const payload = fresh.map(c => ({
      char_key: String(c.title).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '').slice(0, 220),
      name: c.name || c.title,
      enTitle: c.enTitle || c.title,
      universe: c.universe || universe,
      country: c.countryId || 'any',
      gender: c.gender || 'any',
      ethnicity: c.ethnicity || 'any',
      religion: c.religion || 'any',
      eraYear: c.birth != null ? Number(c.birth) : null,
      targetRole: c.targetRole || null,
      bioVi: c.summaryVi || c.descVi || null,
      bioEn: c.summaryEn || c.descEn || c.summary || c.desc || null,
      imageUrl: c.img || null,
      source: c.source || 'wiki'
    }));

    try {
      const resp = await fetch('/api/character-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters: payload })
      });
      if (resp.ok) {
        const resData = await resp.json().catch(() => ({}));
        if (resData && resData.upserted) {
          // Also merge into the local rotating cache so the next spin
          // benefits without another DB round-trip.
          this._mergeDiscovered(fresh);
          console.log('[CharacterPool] Synced:', resData);
        }
      } else {
        const errText = await resp.text().catch(() => '');
        console.error('[Harvester] Upload failed:', resp.status, errText);
      }
    } catch (e) {
      console.error('[Harvester] Upload error:', e);
      // Fire-and-forget — never stall the spin.
    }
  }

  // Stable filter key for the reactive prefetch — only the filters that
  // actually constrain the candidate pool participate, so unrelated changes
  // (skin tone, absurdity, name) don't trigger a wasteful refetch.
  _filterKey(inputs = {}) {
    return JSON.stringify({
      universe: inputs.universe,
      ethnicity: inputs.ethnicity,
      religion: inputs.religion,
      country: inputs.country,
      trait: inputs.trait,
      hobbies: inputs.hobbies,
      eraYear: inputs.eraYear || inputs.year || inputs.era
    });
  }

  // Return up to `sampleSize` pre-scored candidates from the prefetch pool,
  // using weighted random sampling biased toward higher score. Zero network
  // delay — the pool is already in memory.
  // Also resolves images for the chosen 20 cards (max 4 concurrent).
  async getInstantSpinCandidates(inputs = {}, sampleSize = 20) {
    const filterKey = this._filterKey(inputs);

    // 1. Hydrate the pool IMMEDIATELY from the persistent DB character pool
    //    (GET /api/character-pool) so instant spins work even when Wikipedia
    //    is slow or rate-limited. Runs BEFORE any live Wikipedia fetch.
    if (!this._prefetchFilterKey || this._prefetchFilterKey !== filterKey || this._prefetchPool.length === 0) {
      try {
        const dbCards = await this._fetchCharacterPoolFromDB(inputs);
        if (dbCards.length) {
          // DB pool first (already image-verified), then whatever live pool is
          // currently warm — merge without duplicating by title.
          const seen = new Set(dbCards.map(c => c.title));
          const live = this._prefetchPool.filter(c => c && c.title && !seen.has(c.title));
          this._prefetchPool = [...dbCards, ...live];
          this._prefetchFilterKey = filterKey;
        }
        // If the persistent pool has < 40 characters, ALWAYS trigger
        // the background harvester immediately (even on initial page load!)
        // to populate the pool with fresh Wikipedia + Fandom characters.
        if (dbCards.length < 40) {
          this._runBackgroundHarvester(inputs).catch(() => {});
        }
      } catch (e) {
        // DB unreachable — fall back to the warm live pool below.
      }
    }

    let pool = this._prefetchPool;
    if (this._prefetchFilterKey !== filterKey || pool.length === 0) {
      // Fall back to whatever pool is currently warm (filters may have drifted)
      pool = this._prefetchPool;
    }
    if (!pool || pool.length === 0) return [];

    // Merge the freshly fetched pool into the rotating multi-session cache
    // so the roulette can draw from a large, diverse cast across sessions.
    this._mergeDiscovered(pool);

    // Build the sampling pool: live pool first, then cached discovered chars.
    // Exclude the last 30 pulled keys so the same characters don't return
    // immediately — forces diversity across consecutive 20-card spins.
    const pulledSet = new Set(this._pulledIds);
    const cachedExtra = this._discoveredCache
      .filter(c => c && !pulledSet.has(c.pageid != null ? c.pageid : (c.char_key != null ? c.char_key : c.name)))
      .filter(c => !pool.some(p => (p.pageid != null ? p.pageid : (p.char_key != null ? p.char_key : p.name)) === (c.pageid != null ? c.pageid : (c.char_key != null ? c.char_key : c.name))));

    const all = [...pool, ...cachedExtra];

    // Weighted random sampling biased toward higher score
    const pick = () => {
      const totalWeight = all.reduce((s, c) => s + Math.max(1, (c.score || 0)), 0);
      let r = Math.random() * totalWeight;
      for (const c of all) {
        r -= Math.max(1, (c.score || 0));
        if (r <= 0) return c;
      }
      return all[all.length - 1];
    };

    const chosen = [];
    const used = new Set();
    while (chosen.length < Math.min(sampleSize, all.length)) {
      const c = pick();
      const key = c.pageid || c.title || c.name;
      if (!used.has(key)) {
        used.add(key);
        chosen.push(c);
      }
      if (chosen.length >= all.length) break;
    }

    // Record the pulled IDs so the next 20-card sample excludes them.
    this._recordPulledIds(chosen);

    // Resolve images for the chosen 20 cards with max 4 concurrent requests
    // to avoid 429 floods. Each REST lookup is hard-capped at 3000ms so a
    // slow Wikipedia never stalls the spin animation.
    const CONCURRENCY = 4;
    const IMG_TIMEOUT_MS = 3000;
    for (let i = 0; i < chosen.length; i += CONCURRENCY) {
      const chunk = chosen.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(c =>
        Promise.race([
          this.resolveCardImage(c),
          new Promise(resolve => setTimeout(() => resolve(), IMG_TIMEOUT_MS))
        ])
      ));
    }

    return chosen;
  }

  async fetchJSON(url, timeoutMs = 9000) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (res.status === 429) {
        // Circuit breaker: 15-second cooldown
        this._rateLimitedUntil = Date.now() + 15000;
        throw new Error('rate limited');
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(to);
    }
  }

  parseLife(extract) {
    if (!extract) return null;
    // Check BC dates e.g. (100 BC – 44 BC) or (100 TCN – 44 TCN)
    const mBc = extract.slice(0, 320).match(/\(([^)]*\b(\d{1,4})\s*(?:BC|BCE|TCN)\b[^)]*)\)/i);
    if (mBc) {
      const nums = [...mBc[1].matchAll(/\b(\d{1,4})\b/g)].map(x => Number(x[1]));
      if (nums.length) {
        return { b: -nums[0], d: nums.length > 1 ? -nums[nums.length - 1] : null };
      }
    }

    // Standard AD dates (e.g. 1228 – 1300, 1912 – 1954, born 1972)
    const m = extract.slice(0, 320).match(/\(([^)]*\b(?:[1-9]\d{2,3}|20[0-2]\d)\b[^)]*)\)/);
    if (!m) return null;
    const ys = [...m[1].matchAll(/\b([1-9]\d{2,3}|20[0-2]\d)\b/g)].map(x => Number(x[1]));
    if (!ys.length) return null;
    let d = null;
    if (ys.length > 1 && /[–—-]|died|d\.|mất/i.test(m[1])) {
      d = ys[ys.length - 1];
    }
    if (d != null && d < ys[0]) d = null;
    return { b: ys[0], d };
  }

  guessGender(extract, desc) {
    const text = (desc + ' ' + extract).toLowerCase();
    const f = (text.match(/\b(she|her|hers|herself|bà|cô|nữ|nữ vương|nữ hoàng|actress|queen|princess|phu nhân)\b/gi) || []).length;
    const m = (text.match(/\b(he|his|him|himself|ông|nam|vua|hoàng đế|chàng|businessman|king|prince|actor|nam vương)\b/gi) || []).length;
    return f > m ? 'female' : m > f ? 'male' : null;
  }

  translateLeadToVietnamese(text, card = {}) {
    if (!text) return '';
    // If text already contains Vietnamese diacritics, return directly
    if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text.slice(0, 80))) {
      return text.trim();
    }

    let s = text.trim();
    // Strip Wikipedia reference brackets like [1], [2], [note 1]
    s = s.replace(/\[\s*(?:\d+|note\s*\d+)\s*\]/gi, '');

    // Translate common date patterns inside brackets
    s = s.replace(/\((?:born\s+)?(\d{1,2}\s+[A-Za-z]+\s+\d{3,4})\s*[–—-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{3,4})?\)/gi, (m, b, d) => {
      return `(sinh ${b}${d ? ' – mất ' + d : ''})`;
    });

    // Use Google Translate GTX free endpoint for clean translation.
    // If running in browser, we call the endpoint directly. In Node (offline/ssr),
    // we fall back to a minimal phrase map for common patterns only.
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      // We'll use an async approach via a wrapper, but for sync compatibility
      // we just return the English text here — the browser-side CardView will
      // call the GTX API asynchronously via fetch in rescueImage/translateText.
      // This synchronous method is kept for SSR/offline fallback only.
    }

    // Minimal fallback phrase map — only for truly common boilerplate patterns.
    const phraseMap = [
      [/\(born\s+(\d{1,2}\s+[A-Za-z]+\s+\d{3,4})\s*[–—-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{3,4})?\)/gi, '(sinh $1$2)'],
      [/\bwas an?\b/gi, 'là một'],
      [/\bis an?\b/gi, 'là một'],
      [/\bwas the\b/gi, 'là'],
      [/\bis the\b/gi, 'là'],
      [/\bwho\b/g, 'người'],
      [/\band\b/g, 'và']
    ];

    phraseMap.forEach(([rx, rep]) => { s = s.replace(rx, rep); });

    s = s.replace(/\s{2,}/g, ' ').replace(/\s+([,.;!?])/g, '$1').trim();
    return s;
  }

  // Async translation using Google Translate GTX endpoint.
  // Returns the translated Vietnamese text, or the original text on failure.
  async translateTextToVietnamese(text) {
    if (!text || typeof fetch === 'undefined') return text;
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(text);
      const resp = await fetch(url);
      if (!resp.ok) return text;
      const data = await resp.json();
      // data[0] is an array of [translated, original, ...] tuples
      if (Array.isArray(data[0])) {
        return data[0].map(t => t[0]).join(' ');
      }
      return text;
    } catch (e) {
      console.warn('[WikipediaModel] GTX translate failed:', e);
      return text;
    }
  }

  extractTargetRole(card, lang = 'vi') {
    const rawName = (card.name || card.title || '').replace(/\s*\(.*\)$/, '').trim();
    if (FAMOUS_ROLES[rawName]) {
      return FAMOUS_ROLES[rawName][lang] || FAMOUS_ROLES[rawName].vi;
    }

    const blob = ((card.desc || '') + ' ' + (card.summary || '')).toLowerCase();

    // Specific quirky patterns
    if (blob.includes('parachute') || blob.includes('nhảy dù')) return lang === 'vi' ? 'Thợ May Nhảy Dù Kỳ Cục' : 'Quirky Parachute Jumper';
    if (blob.includes('blood') || blob.includes('truyền máu')) return lang === 'vi' ? 'Nhà Khoa Học Tự Đổi Máu' : 'Mad Blood-Swapping Scientist';
    if (blob.includes('emperor of the united states') || blob.includes('hoàng đế nước mỹ')) return lang === 'vi' ? 'Vua Tự Phong Của Nước Mỹ' : 'Self-Proclaimed Emperor of the USA';

    // Profession heuristics
    if (blob.includes('mathematician') || blob.includes('toán học')) return lang === 'vi' ? 'Đại Sư Tính Nhẩm Thần Sầu' : 'Lightning Mental Math Wizard';
    if (blob.includes('physicist') || blob.includes('vật lý')) return lang === 'vi' ? 'Nhà Khoa Học Bẻ Cong Không Gian' : 'Quantum Spacetime Bender';
    if (blob.includes('astronomer') || blob.includes('thiên văn')) return lang === 'vi' ? 'Kẻ Ngắm Sao Lạc Lối' : 'Cosmic Stargazer';
    if (blob.includes('astronaut') || blob.includes('cosmonaut') || blob.includes('phi hành gia')) return lang === 'vi' ? 'Phi Hành Gia Đạp Gió Ngân Hà' : 'Intergalactic Space Ace';
    if (blob.includes('biologist') || blob.includes('sinh học')) return lang === 'vi' ? 'Chuyên Gia Nói Chuyện Với Vi Khuẩn' : 'Microbe Whisperer';
    if (blob.includes('chemist') || blob.includes('hóa học')) return lang === 'vi' ? 'Phù Thủy Lọ Thủy Tinh Khói Mù' : 'Smoking Flask Alchemist';
    if (blob.includes('inventor') || blob.includes('phát minh')) return lang === 'vi' ? 'Kỹ Sư Chế Tạo Thiết Bị Kỳ Quái' : 'Wild Contraption Engineer';
    if (blob.includes('philosopher') || blob.includes('triết gia')) return lang === 'vi' ? 'Triết Gia Cãi Nhau Với Cuộc Đời' : 'Debater of Existential Woes';
    if (blob.includes('painter') || blob.includes('họa sĩ') || blob.includes('artist')) return lang === 'vi' ? 'Họa Sĩ Múa Cọ Điên Loạn' : 'Frenzied Brush Sorcerer';
    if (blob.includes('composer') || blob.includes('nhạc sĩ') || blob.includes('musician')) return lang === 'vi' ? 'Phù Thủy Nốt Nhạc Gây Mê Hoặc' : 'Melodic Spellcaster';
    if (blob.includes('writer') || blob.includes('novel') || blob.includes('nhà văn')) return lang === 'vi' ? 'Thánh Bốc Phét Bằng Ngòi Bút' : 'Grand Weaver of Legends';
    if (blob.includes('poet') || blob.includes('nhà thơ')) return lang === 'vi' ? 'Nhà Thơ Thở Ra Khói Mộng' : 'Dream-Breathing Bard';
    if (blob.includes('emperor') || blob.includes('hoàng đế')) return lang === 'vi' ? 'Bá Chủ Thích Ra Lệnh Toàn Cầu' : 'Imperious Global Overlord';
    if (blob.includes('king') || blob.includes('quốc vương') || blob.includes('vua')) return lang === 'vi' ? 'Vua Đội Vương Miện Vàng Ròng' : 'Golden Crown Sovereign';
    if (blob.includes('queen') || blob.includes('nữ hoàng')) return lang === 'vi' ? 'Nữ Vương Quyền Lực Nghiêng Thành' : 'Regal Queen of Dominance';
    if (blob.includes('general') || blob.includes('tướng quân') || blob.includes('chỉ huy')) return lang === 'vi' ? 'Đại Tướng Bách Chiến Bách Thắng' : 'Undefeated Grand Commander';
    if (blob.includes('doctor') || blob.includes('bác sĩ') || blob.includes('physician')) return lang === 'vi' ? 'Thầy Thuốc Chữa Bằng Niềm Tin' : 'Miracle Placebo Healer';
    if (blob.includes('politician') || blob.includes('chính khách')) return lang === 'vi' ? 'Chuyên Viên Hùng Biện Siêu Cấp' : 'High-Stakes Silver-Tongue Orator';
    if (blob.includes('spy') || blob.includes('gián điệp')) return lang === 'vi' ? 'Bóng Ma Không Tồn Tại' : 'Unregistered Ghost Agent';
    if (blob.includes('tailor') || blob.includes('thợ may')) return lang === 'vi' ? 'Thợ May Vải Thời Không' : 'Chrono-Stitch Tailor';
    if (blob.includes('explorer') || blob.includes('thám hiểm')) return lang === 'vi' ? 'Kẻ Thích Đi Lạc Toàn Cầu' : 'Global Trail-Blazer';
    if (blob.includes('pirate') || blob.includes('cướp biển')) return lang === 'vi' ? 'Chúa Tể Cướp Tàu Biển Sâu' : 'Deep-Sea Ransom Lord';
    if (blob.includes('boxer') || blob.includes('võ sĩ') || blob.includes('martial')) return lang === 'vi' ? 'Võ Sĩ Đấm Phát Bay Màu' : 'Heavyweight Knockout Ace';
    if (blob.includes('footballer') || blob.includes('cầu thủ')) return lang === 'vi' ? 'Vua Sút Bóng Thủng Lưới' : 'Net-Busting Cannon Striker';
    if (blob.includes('monk') || blob.includes('saint') || blob.includes('tu sĩ') || blob.includes('thánh')) return lang === 'vi' ? 'Bậc Chân Tu Đắc Đạo Huyền Bí' : 'Mystic Ascetic Sage';

    if (card.desc && card.desc.length > 2) {
      const cleanDesc = card.desc.replace(/^(an?|the)\s+/i, '');
      return lang === 'vi' ? `Huyền Thoại ${cleanDesc}` : `Legendary ${cleanDesc}`;
    }

    return lang === 'vi' ? 'Nhân Vật Lịch Sử Bí Ẩn' : 'Mysterious Historical Figure';
  }

  extractEthnicity(card, lang = 'vi', profileModel) {
    const ethVal = card.ethnicity || card.ethnicityId;
    if (ethVal && ethVal !== 'any') {
      const match = ETHNICITIES.find(e => e[0] === ethVal);
      if (match) return lang === 'vi' ? match[2] : match[1];
      return ethVal;
    }

    const text = ((card.desc || '') + ' ' + (card.summary || '')).toLowerCase();
    for (const [id, en, vi, rxStr] of ETHNICITIES) {
      if (id !== 'any' && id !== 'custom' && rxStr) {
        if (new RegExp('\\b(' + rxStr + ')\\b', 'i').test(text)) {
          return lang === 'vi' ? vi : en;
        }
      }
    }

    if (card.countryId === 'VN') return lang === 'vi' ? 'Người Việt Nam (Kinh)' : 'Vietnamese (Native)';
    if (card.countryId === 'CN') return lang === 'vi' ? 'Người Han (Han Chinese)' : 'Han Chinese';
    if (card.countryId === 'IT') return lang === 'vi' ? 'Người La Mã / Ý (Italic / Roman)' : 'Italic / Roman';
    if (card.countryId === 'DE') return lang === 'vi' ? 'Người Đức (Germanian)' : 'Germanian';
    if (card.countryId === 'GB') return lang === 'vi' ? 'Người Anglo-Saxon' : 'Anglo-Saxon';
    if (card.countryId === 'RU') return lang === 'vi' ? 'Người Slav (Slavic)' : 'Slavic';
    if (card.countryId === 'AT') return lang === 'vi' ? 'Người Áo (Austrian)' : 'Austrian';

    return lang === 'vi' ? 'Mọi nguồn gốc (Any)' : 'Any';
  }

  extractReligion(card, lang = 'vi', profileModel) {
    const relVal = card.religion || card.religionId;
    if (relVal && relVal !== 'any') {
      const match = RELIGIONS.find(r => r[0] === relVal);
      if (match) return lang === 'vi' ? match[2] : match[1];
      return relVal;
    }

    const text = ((card.desc || '') + ' ' + (card.summary || '')).toLowerCase();
    for (const [id, en, vi, rxStr] of RELIGIONS) {
      if (id !== 'any' && rxStr) {
        if (new RegExp('\\b(' + rxStr + ')\\b', 'i').test(text)) {
          return lang === 'vi' ? vi : en;
        }
      }
    }

    // Cultural / Era heuristics
    if (card.birth && card.birth < 500 && (card.countryId === 'IT' || card.countryId === 'GR')) {
      return lang === 'vi' ? 'Thần thoại / Đa thần (Polytheism / Pagans)' : 'Polytheism / Pagans';
    }
    if (['GB', 'FR', 'ES', 'IT', 'DE', 'AT', 'PL'].includes(card.countryId) && card.birth && card.birth < 1800) {
      return lang === 'vi' ? 'Công giáo / Thiên Chúa giáo (Christianity)' : 'Christianity / Catholic';
    }

    return lang === 'vi' ? 'Vô thần / Triết học (Atheist / Secular)' : 'Atheist / Secular';
  }

  deriveEra(birth) {
    if (birth == null) return 'century_20_early';
    if (birth < 1500) return 'ancient_medieval';
    if (birth <= 1799) return 'century_16_18';
    if (birth <= 1899) return 'century_19';
    if (birth <= 1949) return 'century_20_early';
    if (birth <= 1999) return 'century_20_late';
    return 'century_21';
  }

  validateEntity(p, lang = 'vi', isFictional = false) {
    if (!p || !p.title) return false;
    const title = p.title.trim();
    const ex = (p.extract || '').trim();
    const desc = (p.description || '').trim();
    const fullText = (title + ' ' + desc + ' ' + ex).toLowerCase();

    // 1. Strict Non-Person Patterns (Title & Lead checks)
    //    Block Wikipedia namespace pages that are never characters:
    //    Category: / Category (Thể loại:), List of / Lists of (Danh sách),
    //    Template: (Bản mẫu:), Portal: (Cổng thông tin:).
    const NON_PERSON_TITLE_PREFIXES = [
      /^category:/i,
      /^thể loại:/i,
      /^list of\b/i,
      /^lists of\b/i,
      /^danh sách\b/i,
      /^template:/i,
      /^bản mẫu:/i,
      /^portal:/i,
      /^cổng thông tin:/i,
      /^help:/i,
      /^file:/i,
      /^media wiki:/i,
      /^wikipedia:/i,
      /^special:/i
    ];
    for (const rx of NON_PERSON_TITLE_PREFIXES) {
      if (rx.test(title)) return false;
    }

    const NON_PERSON_PATTERNS = [
      /olympic/i,
      /thế vận hội/i,
      /chiến tranh/i,
      /\bwar\b/i,
      /\bwars\b/i,
      /đế quốc/i,
      /\bempire\b/i,
      /giải vô địch/i,
      /championship/i,
      /tournament/i,
      /\bworld cup\b/i,
      /sự kiện/i,
      /\bevent\b/i,
      /\bevents\b/i,
      /năm\s+\d+/i,
      /\byear\s+\d+/i,
      /thế kỷ/i,
      /\bcentury\b/i,
      /thành phố/i,
      /\bcity\b/i,
      /quốc gia/i,
      /\bcountry\b/i,
      /\bnation\b/i,
      /tổ chức/i,
      /organization/i,
      /organisation/i,
      /trận\s+/i,
      /\bbattle of\b/i,
      /danh sách/i,
      /\blist of\b/i,
      /hiệp ước/i,
      /\btreaty\b/i,
      /sân vận động/i,
      /\bstadium\b/i,
      /tập đoàn/i,
      /công ty/i,
      /đảng phái/i,
      /phong trào/i
    ];

    for (const pat of NON_PERSON_PATTERNS) {
      if (pat.test(title)) {
        return false;
      }
    }

    const NON_PERSON_LEAD_PATTERNS = [
      /là\s+một\s+(sự kiện|cuộc chiến|chiến tranh|giải vô địch|thành phố|quốc gia|tổ chức|hiệp ước|sân vận động|tập đoàn|công ty|phong trào|hiệp hội|đảng phái|địa danh|sách|album|bài hát|phim|trò chơi)/i,
      /is\s+(an?\s+)?(event|war|conflict|championship|tournament|city|country|nation|organization|treaty|stadium|corporation|company|movement|association|album|song|film|movie|game)\b/i,
      /was\s+(an?\s+)?(event|war|conflict|championship|tournament|city|country|nation|organization|treaty|stadium|corporation|company|movement|association|album|song|film|movie|game)\b/i
    ];
    for (const pat of NON_PERSON_LEAD_PATTERNS) {
      if (pat.test(ex.slice(0, 200))) {
        return false;
      }
    }

    // 2. Positive Person / Character Indicators in summary or description
    const FICTIONAL_INDICATORS = [
      /nhân vật/i,
      /nhân vật hư cấu/i,
      /nhân vật hoạt hình/i,
      /nhân vật chính/i,
      /nhân vật phản diện/i,
      /nhân vật phụ/i,
      /\bcharacter\b/i,
      /\bcharacters\b/i,
      /\bfictional\b/i,
      /\bprotagonist\b/i,
      /\bantagonist\b/i,
      /\banime\b/i,
      /\bmanga\b/i,
      /\bvideo game\b/i,
      /\bplayable\b/i,
      /\bhero\b/i,
      /\bheroes\b/i,
      /\bvillain\b/i,
      /\bvillains\b/i,
      /\bsuperhero\b/i
    ];

    const PERSON_INDICATORS = [
      /sinh\s+năm/i,
      /mất\s+năm/i,
      /\bborn\b/i,
      /\bdied\b/i,
      /\(sinh\b/i,
      /\(born\b/i,
      /nhân vật/i,
      /diễn viên/i,
      /tướng lĩnh/i,
      /nhà khoa học/i,
      /nhà văn/i,
      /nhà thơ/i,
      /họa sĩ/i,
      /nhà toán học/i,
      /nhà vật lý/i,
      /triết gia/i,
      /vua\b/i,
      /hoàng đế/i,
      /nữ hoàng/i,
      /chính khách/i,
      /chính trị gia/i,
      /tổng thống/i,
      /thủ tướng/i,
      /bác sĩ/i,
      /kỹ sư/i,
      /nhà phát minh/i,
      /vận động viên/i,
      /cầu thủ/i,
      /võ sĩ/i,
      /ca sĩ/i,
      /nhạc sĩ/i,
      /người sáng lập/i,
      /người tiên phong/i,
      /\bông là\b/i,
      /\bbà là\b/i,
      /\banh là\b/i,
      /\bcô là\b/i,
      /\bhe was\b/i,
      /\bshe was\b/i,
      /\bhe is\b/i,
      /\bshe is\b/i,
      /\bactor\b/i,
      /\bactress\b/i,
      /\bscientist\b/i,
      /\bphysician\b/i,
      /\bphilosopher\b/i,
      /\bgeneral\b/i,
      /\bcommander\b/i,
      /\bking\b/i,
      /\bqueen\b/i,
      /\bemperor\b/i,
      /\bpresident\b/i,
      /\bprime minister\b/i,
      /\bpolitician\b/i,
      /\bstatesman\b/i,
      /\bwriter\b/i,
      /\bpainter\b/i,
      /\bartist\b/i,
      /\bcomposer\b/i,
      /\bmathematician\b/i,
      /\binventor\b/i,
      /\bathlete\b/i,
      /\bfootballer\b/i
    ];

    if (isFictional) {
      const hasFictional = FICTIONAL_INDICATORS.some(rx => rx.test(fullText));
      const hasPerson = PERSON_INDICATORS.some(rx => rx.test(fullText));
      return hasFictional || hasPerson;
    }

    const hasPerson = PERSON_INDICATORS.some(rx => rx.test(fullText));
    return hasPerson;
  }

  extractDebutYear(text, title) {
    if (!text) return 2000;
    const m = text.match(/\b(?:debut|appeared|introduced|published|created|phát hành|xuất hiện|ra mắt|năm)\s*(?:in|vào)?\s*(19\d{2}|20[0-2]\d)\b/i);
    if (m) return Number(m[1]);
    const mAny = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (mAny) return Number(mAny[1]);
    return 2000;
  }

  getCandidateImage(images) {
    if (!Array.isArray(images) || images.length === 0) return null;
    const EXCLUDE_EXT = /\.(svg|ogg|oga|ogv|webm|mp3|mp4|wav|xml)$/i;
    const EXCLUDE_NAMES = /(flag_|icon|logo|coat_of_arms|symbol|map_|stub|disambig|question_mark|portal|commons-logo|wikiquote|crystal_clear|ambox|padlock|arrow|button|red_penc|edit-clear)/i;

    for (const it of images) {
      const title = typeof it === 'string' ? it : it.title;
      if (!title) continue;
      if (EXCLUDE_EXT.test(title)) continue;
      if (EXCLUDE_NAMES.test(title)) continue;
      return title;
    }
    return null;
  }

  async resolveMissingImages(pages, domain) {
    if (!Array.isArray(pages) || pages.length === 0) return;

    // 1. Local page images (already fetched via prop=images) — batch imageinfo.
    const missing = [];
    for (const p of pages) {
      if ((!p.thumbnail || !p.thumbnail.source) && Array.isArray(p.images) && p.images.length > 0) {
        const candidate = this.getCandidateImage(p.images);
        if (candidate) missing.push({ page: p, fileTitle: candidate });
      }
    }
    if (missing.length) {
      for (let i = 0; i < missing.length; i += 15) {
        const chunk = missing.slice(i, i + 15);
        const titles = chunk.map(x => x.fileTitle).join('|');
        try {
          const url = `https://${domain}/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=500`;
          const j = await this.fetchJSON(url, 6000);
          if (j && j.query && j.query.pages) {
            const imgPages = Object.values(j.query.pages);
            for (const item of chunk) {
              const found = imgPages.find(ip => ip.title === item.fileTitle || (item.fileTitle.endsWith(ip.title) || ip.title.endsWith(item.fileTitle)));
              if (found && found.imageinfo && found.imageinfo[0]) {
                const src = found.imageinfo[0].thumburl || found.imageinfo[0].url;
                if (src) {
                  if (!item.page.thumbnail) item.page.thumbnail = {};
                  item.page.thumbnail.source = src;
                }
              }
            }
          }
        } catch (err) {
          console.warn('[WikipediaModel] Error resolving images batch:', err);
        }
      }
    }

    // 2. Any page STILL missing a thumbnail gets the REST Summary resolver
    //    (own domain → EN langlinks → EN pageimages → Wikidata P18), in parallel.
    const stillMissing = pages.filter(p => !p.thumbnail || !p.thumbnail.source);
    if (stillMissing.length) {
      await Promise.all(stillMissing.map(p => this.resolvePageImage(p, domain)));
    }
  }

  // --- Cross-language image fallback for Wikipedia pages ---
  // PRIMARY: Wikipedia REST Summary API (official, single-hop, returns
  // thumbnail + originalimage on the same payload). Falls back to the older
  // langlinks + Wikidata P18 chain only when REST is unavailable.
  getEnTitle(p) {
    if (!p || !Array.isArray(p.langlinks)) return null;
    const en = p.langlinks.find(l => l.lang === 'en');
    return en ? en['*'] : null;
  }

  normalizeWikiImg(url) {
    if (!url) return null;
    let u = String(url).trim().replace(/^http:\/\//i, 'https://');
    // Accept any https:// Wikimedia / Wikipedia / Fandom IMAGE, plus local
    // custom paths (./  /assets/) used by SecretRecipes.js.
    // Reject API endpoints (api.php, /api/rest_v1/, /rest.php, /w/) and
    // article pages (/wiki/...).
    const isWikimedia =
      /^https:\/\/(?:[^/]*\.)?wikimedia\.org\//i.test(u) &&
      !/^https:\/\/(?:[^/]*\.)?wikimedia\.org\/(api|rest_v1|w\/)/i.test(u);
    const isWikipedia =
      /^https:\/\/(?:[^/]*\.)?wikipedia\.org\//i.test(u) &&
      !/^https:\/\/(?:[^/]*\.)?wikipedia\.org\/(api|rest_v1|w\/|\/wiki)/i.test(u);
    const isFandom =
      /^https:\/\/(?:[^/]*\.)?(?:wikia\.nocookie\.net|fandom\.com)\//i.test(u) &&
      !/^https:\/\/(?:[^/]*\.)?(?:wikia\.nocookie\.net|fandom\.com)\/(api|rest_v1|w\/)/i.test(u);
    const isLocal = /^(\.\/|\/assets\/)/i.test(u);

    if (!isWikimedia && !isWikipedia && !isFandom && !isLocal) return null;

    // static.wikia.nocookie.net serves /revision/latest/... variants — strip
    // everything from the file extension onward so the direct .png/.jpg loads.
    u = u.replace(/(\.(?:png|jpg|jpeg|webp|gif))\/revision\/latest.*$/i, '$1');
    return u;
  }

  // Official REST Summary API — returns the canonical portrait for a title.
  // Returns the normalized URL, or null if the page has no image.
  async fetchRestThumbnail(title, domain) {
    if (!title || !domain) return null;
    const u = `https://${domain}/api/rest_v1/page/summary/` + encodeURIComponent(title);
    try {
      const j = await this.fetchJSON(u, 6000);
      if (!j) return null;
      // Skip disambiguation / redirect stubs that carry no image.
      if (j.type === 'disambiguation' || j.type === 'redirect') return null;
      const src = (j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source);
      return src ? this.normalizeWikiImg(src) : null;
    } catch (err) {
      console.warn(`[WikipediaModel] REST summary (${domain}/${title}) failed:`, err);
      return null;
    }
  }

  // Resolve a single page's image in priority order. Mutates p.thumbnail.
  async resolvePageImage(p, domain) {
    if (!p) return;
    if (p.thumbnail && p.thumbnail.source) return;

    // 1. REST summary on the page's own domain (vi.wikipedia.org first).
    const ownDomain = domain || (p.fullurl ? p.fullurl.replace(/^https?:\/\//, '').split('/')[0] : null);
    if (ownDomain) {
      const img = await this.fetchRestThumbnail(p.title, ownDomain);
      if (img) { if (!p.thumbnail) p.thumbnail = {}; p.thumbnail.source = img; return; }
    }

    // 2. English REST summary via langlinks.
    const enTitle = this.getEnTitle(p);
    if (enTitle) {
      const img = await this.fetchRestThumbnail(enTitle, 'en.wikipedia.org');
      if (img) { if (!p.thumbnail) p.thumbnail = {}; p.thumbnail.source = img; return; }
    }

    // 3. Legacy fallback: English pageimages API.
    if (enTitle) {
      const img = await this.fetchEnThumbnail(enTitle);
      if (img) { if (!p.thumbnail) p.thumbnail = {}; p.thumbnail.source = img; return; }
    }

    // 4. Legacy fallback: Wikidata P18 image property.
    const wbId = p.pageprops && p.pageprops.wikibase_item;
    if (wbId) {
      const img = await this.fetchWikidataImage(wbId);
      if (img) { if (!p.thumbnail) p.thumbnail = {}; p.thumbnail.source = img; }
    }
  }

  async fetchEnThumbnail(enTitle) {
    if (!enTitle) return null;
    const params = new URLSearchParams({
      action: 'query', format: 'json', origin: '*',
      titles: enTitle,
      prop: 'pageimages|pageprops',
      pithumbsize: '500',
      piprop: 'thumbnail'
    });
    try {
      const j = await this.fetchJSON('https://en.wikipedia.org/w/api.php?' + params, 6000);
      if (!j || !j.query || !j.query.pages) return null;
      for (const pg of Object.values(j.query.pages)) {
        if (pg.thumbnail && pg.thumbnail.source) {
          return this.normalizeWikiImg(pg.thumbnail.source);
        }
      }
    } catch (err) {
      console.warn('[WikipediaModel] EN thumbnail fetch failed:', err);
    }
    return null;
  }

  async fetchWikidataImage(wbId) {
    if (!wbId) return null;
    try {
      const j = await this.fetchJSON(`https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wbId)}.json`, 6000);
      const ent = j && j.entities && j.entities[wbId];
      if (!ent || !ent.claims || !ent.claims.P18 || !ent.claims.P18.length) return null;
      const val = ent.claims.P18[0].mainsnak && ent.claims.P18[0].mainsnak.datavalue;
      if (!val || val.type !== 'string' || !val.value) return null;
      return this.normalizeWikiImg('https://upload.wikimedia.org/wikipedia/commons/' + val.value);
    } catch (err) {
      console.warn('[WikipediaModel] Wikidata P18 fetch failed:', err);
    }
    return null;
  }

  async resolveViMissingThumbnail(p, domain) {
    // Kept for backwards compatibility — delegates to the unified resolver.
    return this.resolvePageImage(p, domain);
  }

  // Resolve an already-parsed card's image via the REST Summary API.
  // Used by fetchPool() so the Gacha roller never receives a card with img=null.
  async resolveCardImage(card) {
    if (!card) return;
    const title = card.title || card.name;
    if (!title) return;

    // Already resolved — nothing to do.
    if (card.img) return;

    // 1. Serve from the persistent image cache (0ms). Cache is keyed by the
    //    canonical title, so offline cards with the same name always hit.
    const cached = this._getCachedImage(title);
    if (cached) { card.img = cached; return; }

    const hostOf = u => { try { return new URL(u).hostname; } catch (_) { return null; } };

    // Try the card's own article domain first, then its Vi mirror, then EN.
    const domains = [];
    const own = hostOf(card.url);
    if (own) domains.push(own);
    const vi = hostOf(card.urlVi);
    if (vi && !domains.includes(vi)) domains.push(vi);
    if (!domains.includes('en.wikipedia.org')) domains.push('en.wikipedia.org');

    // REST summary lookups need a clean article title. Some cards carry a
    // parenthetical suffix (e.g. "2B (YoRHa No.2 Type B)") or an explicit
    // enTitle/wikiTitle — try all of them so the lookup never 404s.
    const titleCandidates = [
      title,
      card.enTitle,
      card.wikiTitle,
      String(title).replace(/\s*\(.*\)$/, '').trim()
    ].filter(Boolean);

    let resolved = null;
    for (const d of domains) {
      for (const cand of titleCandidates) {
        const img = await this.fetchRestThumbnail(cand, d);
        if (img) { resolved = img; break; }
      }
      if (resolved) break;
    }

    if (resolved) {
      card.img = resolved;
      this._cacheImage(title, resolved);
    }
  }

  async resolveFandomMissingImages(pages, fandomDomain) {
    if (!Array.isArray(pages) || pages.length === 0) return;
    const missing = [];
    for (const p of pages) {
      if ((!p.thumbnail || !p.thumbnail.source) && Array.isArray(p.images) && p.images.length > 0) {
        const candidate = this.getCandidateImage(p.images);
        if (candidate) {
          missing.push({ page: p, fileTitle: candidate });
        }
      }
    }
    if (missing.length === 0) return;

    for (let i = 0; i < missing.length; i += 15) {
      const chunk = missing.slice(i, i + 15);
      const titles = chunk.map(x => x.fileTitle).join('|');
      try {
        const url = `https://${fandomDomain}/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=500`;
        const j = await this.fetchJSON(url, 6000);
        if (j && j.query && j.query.pages) {
          const imgPages = Object.values(j.query.pages);
          for (const item of chunk) {
            const found = imgPages.find(ip => ip.title === item.fileTitle || (item.fileTitle.endsWith(ip.title) || ip.title.endsWith(item.fileTitle)));
            if (found && found.imageinfo && found.imageinfo[0]) {
              const src = found.imageinfo[0].thumburl || found.imageinfo[0].url;
              if (src) {
                if (!item.page.thumbnail) item.page.thumbnail = {};
                item.page.thumbnail.source = src;
              }
            }
          }
        }
      } catch (err) {
        console.warn('[WikipediaModel] Error resolving Fandom images batch:', err);
      }
    }
  }

  extractLeadFromWikitext(wikitext, title) {
    if (!wikitext) return '';
    let s = wikitext;
    s = s.replace(/\{\{[^{}]*\}\}/g, '');
    s = s.replace(/\{\{[^{}]*\}\}/g, '');
    s = s.replace(/<!--[\s\S]*?-->/g, '');
    s = s.replace(/<gallery[\s\S]*?<\/gallery>/gi, '');
    s = s.replace(/<ref[\s\S]*?<\/ref>/gi, '');
    s = s.replace(/<ref[^>]*\/>/gi, '');
    s = s.replace(/<[^>]+>/g, '');
    s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');
    s = s.replace(/'''?/g, '');
    s = s.replace(/==[\s\S]*$/g, '');

    const paras = s.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 25);
    const lead = paras[0] || (title + ' là một nhân vật nổi tiếng trong thế giới giả tưởng.');
    return lead.slice(0, 500).trim();
  }

  async fetchFandomCategory(fandomDomain, category, limit = 12) {
    const catName = category.startsWith('Category:') ? category : 'Category:' + category;
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'categorymembers',
      gcmtitle: catName,
      gcmlimit: String(limit),
      prop: 'pageimages|images|info|revisions',
      rvprop: 'content',
      rvlimit: '1',
      piprop: 'thumbnail',
      pithumbsize: '500',
      imlimit: '10',
      inprop: 'url'
    });

    try {
      const j = await this.fetchJSON(`https://${fandomDomain}/api.php?` + params, 9000);
      const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
      return await this.parseFandomPages(pages, fandomDomain);
    } catch (e) {
      console.warn(`[WikipediaModel] Failed to fetch Fandom ${fandomDomain} ${category}:`, e);
      return [];
    }
  }

  async fetchFandomSearch(fandomDomain, query, limit = 12) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: query,
      gsrlimit: String(limit),
      prop: 'pageimages|images|info|revisions',
      rvprop: 'content',
      rvlimit: '1',
      piprop: 'thumbnail',
      pithumbsize: '500',
      imlimit: '10',
      inprop: 'url'
    });

    try {
      const j = await this.fetchJSON(`https://${fandomDomain}/api.php?` + params, 9000);
      const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
      return await this.parseFandomPages(pages, fandomDomain);
    } catch (e) {
      console.warn(`[WikipediaModel] Failed to fetch Fandom search ${fandomDomain} ${query}:`, e);
      return [];
    }
  }

  async parseFandomPages(pages, fandomDomain) {
    if (!Array.isArray(pages) || pages.length === 0) return [];
    await this.resolveFandomMissingImages(pages, fandomDomain);

    const cards = [];
    for (const p of pages) {
      if (!this.validateEntity(p, 'en', true)) continue;

      let wikitext = '';
      if (p.revisions && p.revisions[0]) {
        wikitext = p.revisions[0]['*'] || (p.revisions[0].slots && p.revisions[0].slots.main ? p.revisions[0].slots.main['*'] : '');
      }

      const summary = this.extractLeadFromWikitext(wikitext, p.title) || p.title + ' is a notable character featured in ' + fandomDomain.replace('.fandom.com', '') + '.';
      const summaryVi = this.translateLeadToVietnamese(summary);

      const img = this.normalizeWikiImg(p.thumbnail && p.thumbnail.source ? p.thumbnail.source : null);
      const cleanName = p.title.replace(/\s*\(.*\)$/, '');

      const card = {
        title: p.title,
        name: cleanName,
        birth: this.extractDebutYear(wikitext + ' ' + summary, p.title),
        death: null,
        countryId: 'any',
        era: 'century_21',
        desc: `Nhân vật giả tưởng (${fandomDomain.replace('.fandom.com', '')})`,
        summary: summaryVi,
        summaryEn: summary,
        summaryVi,
        img,
        url: p.fullurl || (`https://${fandomDomain}/wiki/` + encodeURIComponent(p.title.replace(/ /g, '_'))),
        urlVi: null,
        gender: this.guessGender(summary, ''),
        source: 'fandom',
        universe: 'fictional',
        ev: null,
        text: (p.title + ' ' + summary).toLowerCase()
      };

      card.targetRole = this.extractTargetRole(card, 'vi');
      card.ethnicity = 'Mọi nguồn gốc (Any)';
      card.religion = 'Thần thoại / Đa thần (Polytheism / Pagans)';
      cards.push(card);
    }
    return cards;
  }

  async fetchWikiCategory(category, domain = 'vi.wikipedia.org', limit = 15) {
    const isVi = domain.startsWith('vi');
    const catName = category.startsWith('Category:') || category.startsWith('Thể loại:') ? category : (isVi ? 'Thể loại:' : 'Category:') + category;
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'categorymembers',
      gcmtitle: catName,
      gcmlimit: String(limit),
      prop: 'extracts|pageimages|images|description|info|langlinks',
      exintro: '1',
      explaintext: '1',
      exsentences: '4',
      piprop: 'thumbnail',
      pithumbsize: '500',
      imlimit: '15',
      inprop: 'url',
      lllang: isVi ? 'en' : 'vi',
      lllimit: 'max'
    });

    try {
      const j = await this.fetchJSON(`https://${domain}/w/api.php?` + params, 9000);
      const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
      await this.resolveMissingImages(pages, domain);
      return pages.map(p => this.parsePage(p, isVi ? 'vi' : 'en', true)).filter(Boolean);
    } catch (e) {
      console.warn(`[WikipediaModel] Failed to fetch Wiki category ${domain} ${category}:`, e);
      return [];
    }
  }

  parsePage(p, lang = 'en', isFictional = false) {
    const ex = (p.extract || '').trim();
    if (!ex || /may refer to/i.test(ex.slice(0, 300)) || /có thể đề cập đến/i.test(ex.slice(0, 300))) return null;

    // Strict character entity validation
    if (!this.validateEntity(p, lang, isFictional)) {
      return null;
    }

    const life = this.parseLife(ex);
    if (!isFictional && !life) return null;

    const desc = p.description || '';
    const blob = desc + ' ' + ex.slice(0, 350);
    let cid = 'any';
    for (const [id, rx] of CRX) {
      if (rx.test(desc)) {
        cid = id;
        break;
      }
    }
    if (cid === 'any') {
      for (const [id, rx] of CRX) {
        if (rx.test(blob)) {
          cid = id;
          break;
        }
      }
    }

    const img = this.normalizeWikiImg(p.thumbnail && p.thumbnail.source ? p.thumbnail.source : null);
    const ll = p.langlinks && p.langlinks[0] ? p.langlinks[0]['*'] : null;
    const birthYear = life ? life.b : this.extractDebutYear(ex, p.title);
    const era = this.deriveEra(birthYear);

    const summaryVi = lang === 'vi' ? ex : this.translateLeadToVietnamese(ex);

    const card = {
      title: p.title,
      name: p.title.replace(/\s*\(.*\)$/, ''),
      birth: birthYear,
      death: life ? life.d : null,
      countryId: cid,
      era,
      desc: desc || (isFictional ? (lang === 'vi' ? 'nhân vật hư cấu' : 'fictional character') : (lang === 'vi' ? 'nhân vật lịch sử' : 'historical figure')),
      summary: lang === 'vi' ? ex : summaryVi,
      summaryEn: ex,
      summaryVi,
      img,
      url: p.fullurl || (`https://${lang === 'vi' ? 'vi' : 'en'}.wikipedia.org/wiki/` + encodeURIComponent(p.title.replace(/ /g, '_'))),
      urlVi: lang === 'vi' ? p.fullurl : (ll ? 'https://vi.wikipedia.org/wiki/' + encodeURIComponent(ll.replace(/ /g, '_')) : null),
      gender: this.guessGender(ex, desc),
      source: 'wiki',
      universe: isFictional ? 'fictional' : 'historical',
      ev: null,
      text: (ex + ' ' + desc).toLowerCase()
    };

    card.targetRole = this.extractTargetRole(card, 'vi');
    card.ethnicity = this.extractEthnicity(card, 'vi');
    card.religion = this.extractReligion(card, 'vi');

    return card;
  }

  isFigureInTimeframe(card, minYearParam, maxYearParam = 2026) {
    if (!card) return false;
    // Fictional characters transcend strict historical year constraints
    if (card.universe === 'fictional') return true;

    const selectedMin = Number(minYearParam != null ? minYearParam : (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : 500));
    const maxYear = maxYearParam || 2026;

    // Minimum slider bound (<= 500) represents all historical eras
    if (isNaN(selectedMin) || selectedMin <= 500) return true;

    const b = card.birth;
    const d = card.death;

    // 1. Born in range [selectedMin TO maxYear]
    if (b != null && b >= selectedMin && b <= maxYear) {
      return true;
    }

    // 2. Active during range (alive in [selectedMin TO maxYear])
    if (d != null && d >= selectedMin && (b == null || b <= maxYear)) {
      if (b == null || (d - b <= 125)) {
        return true;
      }
    }
    // Living / contemporary figure (death is null)
    if (d == null && b != null && b <= maxYear && (maxYear - b <= 115) && b >= selectedMin - 100) {
      return true;
    }

    // 3. Major events occurring between selectedMin and maxYear
    const textToScan = [
      card.summary,
      card.summaryEn,
      card.summaryVi,
      card.desc,
      card.descEn,
      card.descVi,
      typeof card.ev === 'object' && card.ev ? (card.ev.en || '') + ' ' + (card.ev.vi || '') : (card.ev || '')
    ].filter(Boolean).join(' ');

    const yearMatches = textToScan.match(/\b(1\d{3}|20[0-2]\d)\b/g);
    if (yearMatches) {
      for (const ym of yearMatches) {
        const yr = Number(ym);
        if (yr >= selectedMin && yr <= maxYear) {
          return true;
        }
      }
    }

    return false;
  }

  async wikiSearch(query, offset, limit, domain = 'vi.wikipedia.org', minYear = null, maxYear = 2026, isFictional = false) {
    const isVi = domain.startsWith('vi');
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '0',
      gsrlimit: String(limit),
      gsroffset: String(offset),
      // Lean payload: no images, no extra props beyond what we need
      prop: 'extracts|description|info|langlinks',
      exintro: '1',
      explaintext: '1',
      exsentences: '4',
      exlimit: 'max',
      // Limit links to just EN to keep payload lean
      lllang: isVi ? 'en' : 'vi',
      lllimit: '50'
    });

    const url = `https://${domain}/w/api.php?` + params;
    let j;
    try {
      j = await this.cachedFetchJSON(url, 9000);
    } catch (err) {
      if (this.isRateLimited()) {
        console.warn('[WikipediaModel] Rate limited — aborting remaining calls in this cycle');
        throw err;
      }
      return [];
    }
    const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];

    // Image resolution deferred to resolveCardImage — keep lean here
    const parsed = pages.map(p => this.parsePage(p, isVi ? 'vi' : 'en', isFictional)).filter(Boolean);
    if (!isFictional && minYear != null && Number(minYear) > 500) {
      return parsed.filter(card => this.isFigureInTimeframe(card, minYear, maxYear));
    }
    return parsed;
  }

  async fetchPool(inp = {}) {
    // Hard timeout: the expanded pool query (5-6 countries × 8 queries each) can
    // take minutes when Wikipedia is slow. Race the whole implementation against
    // a 6000ms wall-clock limit so the UI never freezes mid-spin.
    const POOL_TIMEOUT_MS = 6000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('fetchPool timeout')), POOL_TIMEOUT_MS)
    );

    try {
      return await Promise.race([
        this._fetchPoolImpl(inp),
        timeoutPromise
      ]);
    } catch (err) {
      if (err && err.message === 'fetchPool timeout') {
        console.warn('[WikipediaModel] fetchPool timed out after', POOL_TIMEOUT_MS, 'ms — falling back to offline pool');
      }
      throw err;
    }
  }

  async _fetchPoolImpl(inp = {}) {
    const map = new Map();
    const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const universe = inp.universe || 'historical';

    // 1. Extract selectedMinYear & currentYear
    const selectedMinYear = (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : null)
      ?? inp.selectedMinYear
      ?? inp.eraYear
      ?? inp.year
      ?? 1900;
    const currentYear = 2026;
    const timeframe = selectedMinYear <= 500 ? '[500 TO 2026]' : `[${selectedMinYear} TO ${currentYear}]`;

    // 2. Build search query tokens from country, ethnicity, religion
    const ethItem = ETHNICITIES.find(x => x[0] === inp.ethnicity);
    const relItem = RELIGIONS.find(x => x[0] === inp.religion);
    const cItem = COUNTRIES.find(x => x[0] === inp.country);

    // Vietnamese query tokens (from country/ethnicity/religion)
    const viEthQuery = {
      jewish: 'Do Thái',
      austrian: 'người Áo',
      german: 'người Đức',
      han: 'người Hán',
      slavic: 'người Slav',
      anglo_saxon: 'người Anh',
      roman_italic: 'La Mã',
      custom: inp.ethnicityCustom || ''
    }[inp.ethnicity] || '';

    const viRelQuery = {
      christianity: 'Công giáo',
      islam: 'Hồi giáo',
      buddhism: 'Phật giáo',
      judaism: 'Do Thái giáo',
      atheist: 'vô thần',
      polytheism: 'thần thoại'
    }[inp.religion] || '';

    // Use country's queryVi for dynamic search (falls back to labelVi)
    const viCountryQuery = cItem && cItem[0] !== 'any' ? (cItem[4] || cItem[2]) : '';

    // English query tokens
    const enEthQuery = {
      jewish: 'Jewish',
      austrian: 'Austrian',
      german: 'German',
      han: 'Han Chinese',
      slavic: 'Slavic',
      anglo_saxon: 'Anglo-Saxon',
      roman_italic: 'Roman',
      custom: inp.ethnicityCustom || ''
    }[inp.ethnicity] || '';

    const enRelQuery = {
      christianity: 'Christian',
      islam: 'Muslim',
      buddhism: 'Buddhist',
      judaism: 'Judaism',
      atheist: 'Atheist',
      polytheism: 'Mythology'
    }[inp.religion] || '';

    // Use country's queryEn for dynamic search (falls back to labelEn)
    const enCountryQuery = cItem && cItem[0] !== 'any' ? (cItem[3] || cItem[1]) : '';

    // 3. If country is 'any' and historical/multiverse, sample 5-6 diverse countries
    let dynamicCountries = [cItem];
    if ((universe === 'historical' || universe === 'multiverse') && (!cItem || cItem[0] === 'any')) {
      const regions = [
        { continent: 'Asia', countries: ['CN', 'JP', 'IN', 'VN', 'KR', 'ID', 'TH', 'TR', 'IR', 'SA'] },
        { continent: 'Europe', countries: ['GB', 'FR', 'DE', 'IT', 'ES', 'RU', 'PL', 'NL', 'SE', 'GR'] },
        { continent: 'Americas', countries: ['US', 'BR', 'MX', 'CA', 'AR', 'CO', 'PE', 'CL'] },
        { continent: 'Africa', countries: ['EG', 'NG', 'ZA', 'ET', 'KE', 'MA', 'GH', 'DZ'] },
        { continent: 'Oceania', countries: ['AU', 'NZ', 'FJ', 'PG'] }
      ];
      // Sample 1-2 from each region for diversity
      regions.forEach(region => {
        const sampled = region.countries.sort(() => Math.random() - 0.5).slice(0, 2);
        sampled.forEach(code => {
          const country = COUNTRIES.find(c => c[0] === code);
          if (country) dynamicCountries.push(country);
        });
      });
    }

    // 1. If universe is 'fictional' or 'multiverse', query MASSIVE Fandom Wikis and Wikipedia fictional categories
    if (universe === 'fictional' || universe === 'multiverse') {
      const fictionalJobs = [
        // Gaming Fandom Wikis - MAJOR EXPANSION
        this.fetchFandomCategory('genshin-impact.fandom.com', 'Playable_Characters', 50),
        this.fetchFandomCategory('honkai-star-rail.fandom.com', 'Playable_Characters', 50),
        this.fetchFandomCategory('leagueoflegends.fandom.com', 'Champions', 50),
        this.fetchFandomCategory('finalfantasy.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('zelda.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('naruto.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('onepiece.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('dragonball.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('bleach.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('attackontitan.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('marvel.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('dc.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('starwars.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('harrypotter.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('lotr.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('witcher.fandom.com', 'Characters', 50),
        this.fetchFandomCategory('villains.fandom.com', 'Anime_Villains', 50),
        this.fetchFandomCategory('villains.fandom.com', 'Video_Game_Villains', 50),
        this.fetchFandomCategory('villains.fandom.com', 'Marvel_Villains', 50),
        this.fetchFandomCategory('villains.fandom.com', 'DC_Villains', 50),
        this.fetchFandomCategory('hero.fandom.com', 'Anime_Heroes', 50),
        this.fetchFandomCategory('hero.fandom.com', 'Video_Game_Heroes', 50),
        this.fetchFandomCategory('hero.fandom.com', 'Superheroes', 50),
        this.fetchFandomSearch('anime.fandom.com', 'character', 50),
        this.fetchFandomSearch('gaming.fandom.com', 'character', 50),
        this.fetchFandomSearch('fantasy.fandom.com', 'character', 50),
        this.fetchFandomSearch('mythology.fandom.com', 'character', 50),
        // Vietnamese Wikipedia fictional categories
        this.fetchWikiCategory('Nhân vật trò chơi điện tử', 'vi.wikipedia.org', 50),
        this.fetchWikiCategory('Nhân vật hư cấu', 'vi.wikipedia.org', 50),
        this.fetchWikiCategory('Nhân vật anime', 'vi.wikipedia.org', 50),
        this.fetchWikiCategory('Nhân vật manga', 'vi.wikipedia.org', 50),
        this.fetchWikiCategory('Nhân vật thần thoại', 'vi.wikipedia.org', 50),
        this.wikiSearch('nhân vật hoạt hình OR nhân vật anime OR nhân vật game', rnd(0, 20), 50, 'vi.wikipedia.org', null, 2026, true),
        this.wikiSearch('siêu anh hùng OR nhân vật giả tưởng OR thần thoại', rnd(0, 20), 50, 'vi.wikipedia.org', null, 2026, true),
        // English Wikipedia fictional categories - MAJOR EXPANSION
        this.fetchWikiCategory('Fictional characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Video game characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Anime and manga characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Fantasy characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Mythological figures', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Superhero characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Literary characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Television characters', 'en.wikipedia.org', 50),
        this.fetchWikiCategory('Film characters', 'en.wikipedia.org', 50),
        this.wikiSearch('fictional character OR video game character OR anime character', rnd(0, 30), 50, 'en.wikipedia.org', null, 2026, true),
        this.wikiSearch('superhero OR supervillain OR fantasy character', rnd(0, 30), 50, 'en.wikipedia.org', null, 2026, true)
      ];

      const fResults = await Promise.allSettled(fictionalJobs);
      fResults.forEach(r => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          r.value.forEach(card => {
            if (card && card.title && !map.has(card.title)) {
              card.selectedMinYear = selectedMinYear;
              map.set(card.title, card);
            }
          });
        }
      });
    }

    // 2. If universe is 'historical' or 'multiverse', query Historical Wikipedia sources per dynamic country
    if (universe === 'historical' || universe === 'multiverse') {
      for (const country of dynamicCountries) {
        if (!country || country[0] === 'any') continue;

        const viCQ = country[4] || country[2];
        const enCQ = country[3] || country[1];

        // Vietnamese search queries with country-specific tokens
        const viQueries = [
          [viEthQuery, viRelQuery, viCQ, timeframe].filter(Boolean).join(' '),
          [viEthQuery || viRelQuery || viCQ || 'nhân vật lịch sử', timeframe].filter(Boolean).join(' '),
          [viCQ, 'tiểu sử', timeframe].filter(Boolean).join(' '),
          ['người ' + viCQ, timeframe].filter(Boolean).join(' ')
        ].filter(Boolean);

        const viJobs = viQueries.map(q =>
          this.wikiSearch(q, rnd(0, 20), 50, 'vi.wikipedia.org', selectedMinYear, currentYear, false)
        );

        // English search queries with country-specific tokens
        const enQueries = [
          [enEthQuery, enRelQuery, enCQ, timeframe].filter(Boolean).join(' '),
          [enEthQuery || enRelQuery || enCQ || 'historical figure', timeframe].filter(Boolean).join(' '),
          [enCQ, timeframe || 'biography'].filter(Boolean).join(' '),
          ['people from ' + enCQ, timeframe].filter(Boolean).join(' ')
        ].filter(Boolean);

        const enJobs = enQueries.map(q =>
          this.wikiSearch(q, rnd(0, 30), 50, 'en.wikipedia.org', selectedMinYear, currentYear, false)
        );

        const allJobs = [...viJobs, ...enJobs];
        const allResults = await Promise.allSettled(allJobs);

        allResults.forEach(r => {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            r.value.forEach(card => {
              if (!map.has(card.title) && this.isFigureInTimeframe(card, selectedMinYear, currentYear)) {
                card.selectedMinYear = selectedMinYear;
                map.set(card.title, card);
              }
            });
          }
        });

        // Early exit if we have enough cards
        if (map.size >= 120) break;
      }
    }

    // 3. Fallback to offline archive if still under threshold
    if (map.size < 24) {
      this.offlinePool(selectedMinYear, currentYear, universe).forEach(card => {
        if (!map.has(card.title) && this.isFigureInTimeframe(card, selectedMinYear, currentYear)) {
          card.selectedMinYear = selectedMinYear;
          map.set(card.title, card);
        }
      });
    }

    if (map.size === 0) throw new Error('network');

    // 4. Score and filter candidates using the modular 3-stage ScoringEngine
    // DO NOT resolve images for all cards here — that causes 429 floods!
    // Images will be resolved on-demand for the 20 sampled cards in getInstantSpinCandidates()
    const rawCandidates = [...map.values()];

    // Shuffle to prevent repetitive top results
    const shuffled = rawCandidates.sort(() => Math.random() - 0.5);

    // Apply 3-stage scoring with hard constraints
    const ranked = filterAndRankCandidates(shuffled, inp, 10);

    // Attach evaluation metadata for admin panel and CardView
    ranked.forEach(c => {
      if (c._eval) {
        c.score = c._eval.score;
        c.tier = c._eval.tier;
        c.matchedCriteria = c._eval.matchedCriteria;
        c.hobbyMatch = c._eval.hobbyMatch;
      }
    });

    // Store the full ranked pool for reactive prefetch sampling
    this._lastRankedPool = ranked;

    // Return cards WITHOUT resolving images — only the final 20 spin candidates
    // will have their images resolved via getInstantSpinCandidates()
    return ranked;
  }

  offlineHistoricalPool(minYearParam = null, maxYearParam = 2026) {
    const selectedMinYear = minYearParam != null
      ? Number(minYearParam)
      : (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : 500);
    const currentYear = maxYearParam || 2026;

    const all = OFFLINE.map(o => ({
      title: o[0],
      name: o[0],
      enTitle: o[0],
      wikiTitle: o[0],
      birth: o[1],
      death: o[2],
      countryId: o[3],
      era: o[4],
      ethnicity: o[5],
      religion: o[6],
      desc: o[8] || o[7],
      descEn: o[7],
      descVi: o[8],
      summary: o[10] || o[9],
      summaryEn: o[9],
      summaryVi: o[10],
      img: null,
      url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(o[0].replace(/ /g, '_')),
      urlVi: null,
      gender: o[11],
      source: 'offline',
      universe: 'historical',
      ev: { en: o[12], vi: o[13] },
      targetRole: o[15] || o[14],
      targetRoleEn: o[14],
      targetRoleVi: o[15],
      text: (o[9] + ' ' + o[10] + ' ' + o[7] + ' ' + o[8]).toLowerCase(),
      selectedMinYear
    }));

    return all.filter(c => this.isFigureInTimeframe(c, selectedMinYear, currentYear));
  }

  offlineFictionalPool() {
    return OFFLINE_FICTIONAL.map(f => ({
      title: f[0],
      name: f[0],
      enTitle: f[0],
      wikiTitle: f[0],
      birth: f[1],
      death: null,
      countryId: f[2],
      era: 'century_21',
      ethnicity: 'any',
      religion: 'polytheism',
      desc: f[4] || f[3],
      descEn: f[3],
      descVi: f[4],
      summary: f[6] || f[5],
      summaryEn: f[5],
      summaryVi: f[6],
      img: f[7],
      url: f[8] || ('https://en.wikipedia.org/wiki/' + encodeURIComponent(f[0].replace(/ /g, '_'))),
      urlVi: null,
      gender: f[9],
      source: 'offline',
      universe: 'fictional',
      ev: { en: f[10], vi: f[11] },
      targetRole: f[13] || f[12],
      targetRoleEn: f[12],
      targetRoleVi: f[13],
      text: (f[0] + ' ' + f[5] + ' ' + f[6]).toLowerCase(),
      selectedMinYear: 500
    }));
  }

  offlinePool(minYearParam = null, maxYearParam = 2026, universe = 'historical') {
    if (universe === 'fictional') {
      return this.offlineFictionalPool();
    }
    if (universe === 'multiverse') {
      return [...this.offlineHistoricalPool(minYearParam, maxYearParam), ...this.offlineFictionalPool()];
    }
    return this.offlineHistoricalPool(minYearParam, maxYearParam);
  }

  score(c, inp = {}) {
    const P = {};
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    // Era / Timeframe match [selectedMinYear TO currentYear]
    const minYear = Number(
      inp.selectedMinYear ??
      inp.eraYear ??
      inp.year ??
      (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : 500)
    );
    const maxYear = 2026;

    if (c.universe === 'fictional' || minYear <= 500) {
      P.era = 1.0;
    } else {
      const b = c.birth;
      const d = c.death;
      if (b != null && b >= minYear && b <= maxYear) {
        P.era = 1.0;
      } else if (d != null && d >= minYear && (b == null || b <= maxYear)) {
        P.era = 0.95;
      } else if (this.isFigureInTimeframe(c, minYear, maxYear)) {
        P.era = 0.9;
      } else if (b != null) {
        const dist = b < minYear ? minYear - b : b - maxYear;
        P.era = clamp(1 - dist / 60, 0.05, 1);
      } else {
        P.era = 0.4;
      }
    }

    // Universe multiplier
    const targetUniverse = inp.universe || 'historical';
    const cardUniverse = c.universe || 'historical';
    let universeMultiplier = 1.0;
    if (targetUniverse === 'multiverse') {
      universeMultiplier = 1.0;
    } else if (targetUniverse === cardUniverse) {
      universeMultiplier = 1.0;
    } else {
      universeMultiplier = 0.35;
    }

    // Ethnicity match
    if (inp.ethnicity === 'any' || c.universe === 'fictional') {
      P.ethnicity = 0.85;
    } else if (inp.ethnicity === 'custom' && inp.ethnicityCustom) {
      P.ethnicity = c.text.includes(inp.ethnicityCustom.toLowerCase()) ? 1.0 : 0.2;
    } else {
      const ethItem = ETHNICITIES.find(x => x[0] === inp.ethnicity);
      const isExact = c.ethnicity === inp.ethnicity;
      const isRegex = ethItem && ethItem[3] && new RegExp(ethItem[3], 'i').test(c.text);
      P.ethnicity = isExact ? 1.0 : isRegex ? 0.9 : 0.15;
    }

    // Religion match
    if (inp.religion === 'any' || c.universe === 'fictional') {
      P.religion = 0.85;
    } else {
      const relItem = RELIGIONS.find(x => x[0] === inp.religion);
      const isExact = c.religion === inp.religion;
      const isRegex = relItem && relItem[3] && new RegExp(relItem[3], 'i').test(c.text);
      P.religion = isExact ? 1.0 : isRegex ? 0.9 : 0.15;
    }

    // Country match
    P.country = (inp.country === 'any' || c.universe === 'fictional') ? 0.8 : (c.countryId === inp.country ? 1 : 0.15);

    // Gender match
    P.gender = (inp.tgender === 'male' || inp.tgender === 'female')
      ? (c.gender ? (c.gender === inp.tgender ? 1 : 0.05) : 0.4)
      : 0.7;

    // Trait / Quirk keyword match
    const kw = ((inp.trait || '') + ' ' + (inp.hobbies || ''))
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(w => w.length > 3);

    let hits = 0;
    new Set(kw).forEach(w => {
      if (c.text.includes(w)) hits++;
    });

    P.trait = clamp(0.15 + hits * 0.35, 0, 1);
    P.fame = c.img ? 1 : (c.source === 'offline' ? 0.85 : 0.35);

    // Standardized Weight distribution summing to 100
    const WT = { era: 25, ethnicity: 20, religion: 15, country: 15, gender: 10, trait: 5, fame: 10 };
    let tot = 0;
    for (const k in WT) {
      tot += (P[k] || 0) * WT[k];
    }

    const total = Math.min(100, Math.round(tot * universeMultiplier));
    const tier = total > 85 ? 'rare' : total >= 65 ? 'mid' : 'common';

    return { total, parts: P, tier };
  }

  cleanFullName(card) {
    let name = (card.name || card.title || '').replace(/\s*\(.*\)$/, '').trim();
    const ex = (card.summary || '').replace(/\[[^\]]*\]/g, '');

    const mBorn = ex.match(/(?:born|birth name|né|née|tên khai sinh)\s+([^;,–—()]+)/i);
    if (mBorn && mBorn[1]) {
      const bornName = mBorn[1].trim().replace(/\s+/g, ' ');
      if (bornName.length > 2 && bornName.length < 65 && bornName.toLowerCase() !== name.toLowerCase()) {
        return `${name} (${bornName})`;
      }
    }

    const match = ex.match(/^([A-ZÀ-Ỹ][A-Za-zÀ-ỹ\s.'’\-]+?)\s*(?:\([^)]*\)|,?\s*was|,?\s*is|,?\s*born|,?\s*là)/);
    if (match && match[1]) {
      const cleanCandidate = match[1].trim().replace(/\s+/g, ' ');
      const nameTokens = name.toLowerCase().split(/\s+/);
      const candTokens = cleanCandidate.toLowerCase().split(/\s+/);
      if (cleanCandidate.length >= name.length && cleanCandidate.length < 65 && candTokens.some(t => nameTokens.includes(t))) {
        return cleanCandidate;
      }
    }
    return name;
  }

  formatLifespan(birth, death, lang = 'en', profileModel, eraId, selectedMinYear) {
    if (birth == null) {
      return profileModel ? profileModel.t('unknownC') : (lang === 'vi' ? 'Chưa rõ' : 'Unknown');
    }
    const yearsWord = profileModel ? profileModel.t('yearsOld') : (lang === 'vi' ? 'tuổi' : 'years old');
    const presentWord = profileModel ? profileModel.t('present') : (lang === 'vi' ? 'nay' : 'present');
    const minYear = selectedMinYear ?? (profileModel && typeof profileModel.getBirthYear === 'function' ? profileModel.getBirthYear() : null);
    const eraLabel = minYear && profileModel ? ' · ' + profileModel.getEraLabel(minYear, lang) : (eraId && profileModel ? ' · ' + profileModel.getEraLabel(eraId, lang) : '');

    if (birth < 0) {
      const bStr = Math.abs(birth) + (lang === 'vi' ? ' TCN' : ' BC');
      const dStr = death ? (death < 0 ? Math.abs(death) + (lang === 'vi' ? ' TCN' : ' BC') : String(death)) : presentWord;
      const age = death ? Math.abs(death - birth) : Math.abs(2026 - birth);
      return `${bStr} – ${dStr} (${age} ${yearsWord})${eraLabel}`;
    }

    if (death) {
      const age = Math.max(1, death - birth);
      return `${birth} – ${death} (${age} ${yearsWord})${eraLabel}`;
    }

    const currentYear = 2026;
    const age = Math.max(1, currentYear - birth);
    return `${birth} – ${presentWord} (${age} ${yearsWord})${eraLabel}`;
  }

  formatOrigin(countryId, lang = 'en', profileModel, card) {
    if (countryId && countryId !== 'any') {
      const flag = profileModel ? profileModel.getCountryFlag(countryId) : '🌐';
      const label = profileModel ? profileModel.getCountryLabel(countryId, lang) : countryId;
      return `${flag} ${label}`;
    }

    if (card && (card.desc || card.summary)) {
      const blob = `${card.desc || ''} ${(card.summary || '').slice(0, 300)}`;
      for (const [id, rx] of CRX) {
        if (rx.test(blob)) {
          const flag = profileModel ? profileModel.getCountryFlag(id) : '🌐';
          const label = profileModel ? profileModel.getCountryLabel(id, lang) : id;
          return `${flag} ${label}`;
        }
      }
    }

    return lang === 'vi' ? '🌐 Quốc tế / Chưa rõ' : '🌐 International / Origin unknown';
  }

  formatOriginAndEthnicity(card, lang = 'en', profileModel) {
    const origin = this.formatOrigin(card.countryId, lang, profileModel, card);
    const ethnicity = this.extractEthnicity(card, lang, profileModel);
    if (ethnicity && ethnicity !== 'any' && !origin.includes(ethnicity)) {
      return `${origin} · ${ethnicity}`;
    }
    return origin;
  }

  extractClaimToFame(card, lang = 'en') {
    if (card.ev) {
      return card.ev[lang] || card.ev.vi || card.ev.en || card.desc;
    }
    const sum = (lang === 'vi' && card.summaryVi ? card.summaryVi : (card.summary || ''))
      .replace(/\[\d+\]/g, '')
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = sum.match(/[^.!?]+[.!?]+/g) || [sum];

    const claimKeywords = /\b(best known|known for|famous for|celebrated for|considered the father|considered the mother|considered one of|regarded as|invented|discovered|co-founder of|first person to|first human in|won the|led the|awarded|pioneered|created|composed|directed|authored|champion|lifting the|victory at|nổi tiếng|bước ngoặt|đoạt giải|phát minh|sáng lập|chỉ huy|chiến thắng|đầu tiên|khám phá|tác phẩm|đóng góp|chứng minh)\b/i;

    const matched = sentences.slice(0, 4).find(s => claimKeywords.test(s));
    if (matched) {
      let claim = matched.trim()
        .replace(/^He |^She |^They |^It |^Ông |^Bà |^Họ /i, '')
        .replace(/^is |^was |^are |^were |^là /i, '')
        .replace(/^also |^cũng /i, '');
      claim = claim.charAt(0).toUpperCase() + claim.slice(1);
      if (claim.length > 175) {
        claim = claim.slice(0, 170).replace(/\s+\S*$/, '') + '…';
      }
      return claim;
    }

    if (sentences.length > 1 && sentences[1].trim().length > 15) {
      let claim = sentences[1].trim()
        .replace(/^He |^She |^They |^Ông |^Bà /i, '')
        .replace(/^is |^was |^là /i, '');
      claim = claim.charAt(0).toUpperCase() + claim.slice(1);
      if (claim.length > 175) {
        claim = claim.slice(0, 170).replace(/\s+\S*$/, '') + '…';
      }
      return claim;
    }

    if (card.desc && card.desc.length > 4) {
      return card.desc.charAt(0).toUpperCase() + card.desc.slice(1);
    }

    return lang === 'vi' ? 'Nhân vật lịch sử tiêu biểu được ghi chép trên Wikipedia' : 'Notable historical figure documented on Wikipedia';
  }

  buildDossier(card, lang = 'en', profileModel) {
    const minYear = (profileModel && typeof profileModel.getBirthYear === 'function')
      ? profileModel.getBirthYear()
      : (card?.selectedMinYear ?? (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : 1900));
    const isVi = lang === 'vi';
    const eraFilter = isVi
      ? (minYear <= 500 ? 'Thuộc giai đoạn: Toàn bộ Lịch sử (Cổ đại đến Nay)' : `Thuộc giai đoạn: ${minYear} – Nay`)
      : (minYear <= 500 ? 'Era Filter: All History (Ancient to Present)' : `Era Filter: ${minYear} – Present`);

    const fullName = this.cleanFullName(card);
    const targetRole = card.targetRole || this.extractTargetRole(card, lang);
    const userRole = profileModel ? profileModel.getRoleLabel() : '';
    const lifespan = this.formatLifespan(card.birth, card.death, lang, profileModel, card.era, minYear);
    const originAndEthnicity = this.formatOriginAndEthnicity(card, lang, profileModel);
    const religion = this.extractReligion(card, lang, profileModel);
    const claimToFame = this.extractClaimToFame(card, lang);

    return {
      fullName,
      targetRole,
      userRole,
      lifespan,
      originAndEthnicity,
      religion,
      claimToFame,
      eraFilter,
      selectedMinYear: minYear
    };
  }
}

export default WikipediaModel;
