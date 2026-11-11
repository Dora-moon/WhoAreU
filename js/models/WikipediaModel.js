/**
 * @file WikipediaModel.js
 * @description Live Wikipedia API queries, priority Vietnamese search with fallback translation,
 * country/gender/era/ethnicity/religion matching, similarity scoring, funny Target Role extraction,
 * structured dossier building, and offline historical archive fallback.
 */

import { COUNTRIES, CRX, ERAS, ETHNICITIES, RELIGIONS, UserProfileModel } from './UserProfileModel.js';

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

export class WikipediaModel {
  async fetchJSON(url, timeoutMs = 9000) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ac.signal });
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

    // Reorder "was an English mathematician" -> "là một nhà toán học... người Anh"
    const natList = 'American|British|English|Scottish|French|German|Austrian|Italian|Spanish|Russian|Soviet|Chinese|Japanese|Korean|Vietnamese|Indian|Greek|Roman|Polish|Swedish|Dutch|Irish|Mexican|Brazilian|Canadian|Australian|Egyptian|Turkish';
    const rxNatLead = new RegExp(`\\b(?:was|is)\\s+an?\\s+(${natList})\\s+([a-z\\s,]+?)(?=\\s+(?:who|that|born|widely|,|\\.))`, 'i');
    s = s.replace(rxNatLead, (m, nat, profs) => {
      return `là một ${profs} [NAT:${nat}]`;
    });

    const phraseMap = [
      [/\bwho was born in (\d{1,4})\b/gi, 'sinh năm $1'],
      [/\bwas born in (\d{1,4})\b/gi, 'sinh năm $1'],
      [/\btheoretical computer science\b/gi, 'khoa học máy tính lý thuyết'],
      [/\bcomputer science\b/gi, 'khoa học máy tính'],
      [/\bartificial intelligence\b/gi, 'trí tuệ nhân tạo'],
      [/\bgeneral relativity\b/gi, 'thuyết tương đối rộng'],
      [/\bspecial relativity\b/gi, 'thuyết tương đối hẹp'],
      [/\btheory of relativity\b/gi, 'thuyết tương đối'],
      [/\bquantum mechanics\b/gi, 'cơ học lượng tử'],
      [/\bclassical mechanics\b/gi, 'cơ học cổ điển'],
      [/\bwas an?\b/gi, 'là một'],
      [/\bis an?\b/gi, 'là một'],
      [/\bwas the\b/gi, 'là'],
      [/\bis the\b/gi, 'là'],
      [/\bwho served as\b/gi, 'từng đảm nhiệm cương vị'],
      [/\bwho became the first person to\b/gi, 'người đã trở thành người đầu tiên'],
      [/\bthe first person to\b/gi, 'người đầu tiên'],
      [/\bthe first human to\b/gi, 'người đầu tiên'],
      [/\bthe first woman to\b/gi, 'người phụ nữ đầu tiên'],
      [/\bwalk on the Moon\b/gi, 'bước chân lên Mặt Trăng'],
      [/\bjourney into outer space\b/gi, 'bay vào không gian vũ trụ'],
      [/\bwidely considered the father of\b/gi, 'được công nhận rộng rãi là cha đẻ của'],
      [/\bconsidered the father of\b/gi, 'được coi là cha đẻ của'],
      [/\bwidely regarded as one of the greatest\b/gi, 'được coi là một trong những nhân vật vĩ đại nhất'],
      [/\bregarded as one of the most\b/gi, 'được coi là một trong những người'],
      [/\bcelebrated internationally as\b/gi, 'được tôn vinh trên toàn thế giới như'],
      [/\bbest known for\b/gi, 'nổi tiếng nhất với'],
      [/\bknown for\b/gi, 'được biết đến với'],
      [/\bfamous for\b/gi, 'nổi danh nhờ'],
      [/\bwon an Academy Award\b/gi, 'đoạt giải Oscar'],
      [/\bwon the Nobel Prize\b/gi, 'đoạt giải Nobel'],
      [/\bwon the Fields Medal\b/gi, 'đoạt Huy chương Fields'],
      [/\bSecond World War\b/gi, 'Chiến tranh Thế giới thứ hai'],
      [/\bFirst World War\b/gi, 'Chiến tranh Thế giới thứ nhất'],
      [/\bWorld War II\b/gi, 'Chiến tranh Thế giới thứ hai'],
      [/\bWorld War I\b/gi, 'Chiến tranh Thế giới thứ nhất'],
      [/\bUnited States\b/gi, 'Hoa Kỳ'],
      [/\bUnited Kingdom\b/gi, 'Vương quốc Anh'],
      [/\bSoviet Union\b/gi, 'Liên Xô'],
      [/\bHe was\b/g, 'Ông là'],
      [/\bShe was\b/g, 'Bà là'],
      [/\bHe is\b/g, 'Ông là'],
      [/\bShe is\b/g, 'Bà là'],
      [/\bHe\b/g, 'Ông'],
      [/\bShe\b/g, 'Bà'],
      [/\bDuring\b/g, 'Trong'],
      [/\bIn (\d{4})\b/g, 'Vào năm $1'],
      [/\band\b/g, 'và'],
      [/\bwho\b/g, 'người']
    ];

    const natMap = [
      [/\[NAT:American\]|\bAmerican\b/g, 'người Mỹ'],
      [/\[NAT:British\]|\bBritish\b/g, 'người Anh'],
      [/\[NAT:English\]|\bEnglish\b/g, 'người Anh'],
      [/\[NAT:Scottish\]|\bScottish\b/g, 'người Scotland'],
      [/\[NAT:French\]|\bFrench\b/g, 'người Pháp'],
      [/\[NAT:German\]|\bGerman\b/g, 'người Đức'],
      [/\[NAT:Austrian\]|\bAustrian\b/g, 'người Áo'],
      [/\[NAT:Italian\]|\bItalian\b/g, 'người Ý'],
      [/\[NAT:Spanish\]|\bSpanish\b/g, 'người Tây Ban Nha'],
      [/\[NAT:Russian\]|\bRussian\b/g, 'người Nga'],
      [/\[NAT:Soviet\]|\bSoviet\b/g, 'Liên Xô'],
      [/\[NAT:Chinese\]|\bChinese\b/g, 'người Trung Quốc'],
      [/\[NAT:Japanese\]|\bJapanese\b/g, 'người Nhật Bản'],
      [/\[NAT:Korean\]|\bKorean\b/g, 'người Hàn Quốc'],
      [/\[NAT:Vietnamese\]|\bVietnamese\b/g, 'người Việt Nam'],
      [/\[NAT:Indian\]|\bIndian\b/g, 'người Ấn Độ'],
      [/\[NAT:Greek\]|\bGreek\b/g, 'người Hy Lạp'],
      [/\[NAT:Roman\]|\bRoman\b/g, 'người La Mã'],
      [/\[NAT:Polish\]|\bPolish\b/g, 'người Ba Lan'],
      [/\[NAT:Swedish\]|\bSwedish\b/g, 'người Thụy Điển'],
      [/\[NAT:Dutch\]|\bDutch\b/g, 'người Hà Lan'],
      [/\[NAT:Irish\]|\bIrish\b/g, 'người Ireland'],
      [/\[NAT:Mexican\]|\bMexican\b/g, 'người Mexico'],
      [/\[NAT:Brazilian\]|\bBrazilian\b/g, 'người Brazil'],
      [/\[NAT:Canadian\]|\bCanadian\b/g, 'người Canada'],
      [/\[NAT:Australian\]|\bAustralian\b/g, 'người Úc'],
      [/\[NAT:Egyptian\]|\bEgyptian\b/g, 'người Ai Cập'],
      [/\[NAT:Turkish\]|\bTurkish\b/g, 'người Thổ Nhĩ Kỳ']
    ];

    const profMap = [
      [/\bmathematician\b/gi, 'nhà toán học'],
      [/\bcomputer scientist\b/gi, 'nhà khoa học máy tính'],
      [/\btheoretical physicist\b/gi, 'nhà vật lý lý thuyết'],
      [/\bphysicist\b/gi, 'nhà vật lý'],
      [/\bchemist\b/gi, 'nhà hóa học'],
      [/\bbiologist\b/gi, 'nhà sinh học'],
      [/\bastronomer\b/gi, 'nhà thiên văn'],
      [/\bcosmologist\b/gi, 'nhà vũ trụ học'],
      [/\blogician\b/gi, 'nhà logic học'],
      [/\bcryptanalyst\b/gi, 'chuyên gia giải mã'],
      [/\bphilosopher\b/gi, 'nhà triết học'],
      [/\bpainter\b/gi, 'họa sĩ'],
      [/\bartist\b/gi, 'nghệ sĩ'],
      [/\barchitect\b/gi, 'kiến trúc sư'],
      [/\bengineer\b/gi, 'kỹ sư'],
      [/\binventor\b/gi, 'nhà phát minh'],
      [/\bwriter\b/gi, 'nhà văn'],
      [/\bpoet\b/gi, 'nhà thơ'],
      [/\bnovelist\b/gi, 'tiểu thuyết gia'],
      [/\bcomposer\b/gi, 'nhà soạn nhạc'],
      [/\bsongwriter\b/gi, 'nhạc sĩ'],
      [/\bmusician\b/gi, 'nhạc công'],
      [/\bsinger\b/gi, 'ca sĩ'],
      [/\bactor\b/gi, 'diễn viên'],
      [/\bactress\b/gi, 'nữ diễn viên'],
      [/\bfilmmaker\b/gi, 'nhà làm phim'],
      [/\bfilm director\b/gi, 'đạo diễn điện ảnh'],
      [/\bdirector\b/gi, 'đạo diễn'],
      [/\bgeneral\b/gi, 'đại tướng'],
      [/\bmilitary commander\b/gi, 'nhà chỉ huy quân sự'],
      [/\bcommander\b/gi, 'chỉ huy'],
      [/\bstatesman\b/gi, 'chính khách'],
      [/\bpolitician\b/gi, 'chính trị gia'],
      [/\bpresident of the United States\b/gi, 'Tổng thống Hoa Kỳ'],
      [/\bpresident\b/gi, 'tổng thống'],
      [/\bprime minister\b/gi, 'thủ tướng'],
      [/\bking\b/gi, 'quốc vương'],
      [/\bqueen\b/gi, 'nữ hoàng'],
      [/\bemperor\b/gi, 'hoàng đế'],
      [/\bastronaut\b/gi, 'phi hành gia'],
      [/\bcosmonaut\b/gi, 'nhà du hành vũ trụ'],
      [/\bexplorer\b/gi, 'nhà thám hiểm'],
      [/\btailor\b/gi, 'thợ may'],
      [/\bactivist\b/gi, 'nhà hoạt động'],
      [/\bhumanitarian\b/gi, 'nhà nhân đạo'],
      [/\bboxer\b/gi, 'võ sĩ quyền anh'],
      [/\bfootballer\b/gi, 'cầu thủ bóng đá'],
      [/\bpolymath\b/gi, 'học giả uyên bác'],
      [/\bneurologist\b/gi, 'bác sĩ thần kinh'],
      [/\bphysician\b/gi, 'bác sĩ']
    ];

    phraseMap.forEach(([rx, rep]) => { s = s.replace(rx, rep); });
    profMap.forEach(([rx, rep]) => { s = s.replace(rx, rep); });
    natMap.forEach(([rx, rep]) => { s = s.replace(rx, rep); });

    s = s.replace(/\s{2,}/g, ' ').replace(/\s+([,.;!?])/g, '$1').trim();
    return s;
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

  parsePage(p, lang = 'en') {
    const ex = (p.extract || '').trim();
    if (!ex || /may refer to/i.test(ex.slice(0, 300)) || /có thể đề cập đến/i.test(ex.slice(0, 300))) return null;
    const life = this.parseLife(ex);
    if (!life) return null;

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

    const img = p.thumbnail && p.thumbnail.source ? p.thumbnail.source : null;
    const ll = p.langlinks && p.langlinks[0] ? p.langlinks[0]['*'] : null;
    const era = this.deriveEra(life.b);

    const summaryVi = lang === 'vi' ? ex : this.translateLeadToVietnamese(ex);

    const card = {
      title: p.title,
      name: p.title.replace(/\s*\(.*\)$/, ''),
      birth: life.b,
      death: life.d,
      countryId: cid,
      era,
      desc: desc || (lang === 'vi' ? 'nhân vật lịch sử' : 'historical figure'),
      summary: lang === 'vi' ? ex : summaryVi,
      summaryEn: ex,
      summaryVi,
      img,
      url: p.fullurl || (`https://${lang === 'vi' ? 'vi' : 'en'}.wikipedia.org/wiki/` + encodeURIComponent(p.title.replace(/ /g, '_'))),
      urlVi: lang === 'vi' ? p.fullurl : (ll ? 'https://vi.wikipedia.org/wiki/' + encodeURIComponent(ll.replace(/ /g, '_')) : null),
      gender: this.guessGender(ex, desc),
      source: 'wiki',
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

  async wikiSearch(query, offset, limit, domain = 'vi.wikipedia.org', minYear = null, maxYear = 2026) {
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
      prop: 'extracts|pageimages|description|info|langlinks',
      exintro: '1',
      explaintext: '1',
      exsentences: '4',
      exlimit: 'max',
      piprop: 'thumbnail',
      pithumbsize: '400',
      pilimit: 'max',
      inprop: 'url',
      lllang: isVi ? 'en' : 'vi',
      lllimit: 'max'
    });

    const j = await this.fetchJSON(`https://${domain}/w/api.php?` + params, 9000);
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    const parsed = pages.map(p => this.parsePage(p, isVi ? 'vi' : 'en')).filter(Boolean);
    if (minYear != null && Number(minYear) > 500) {
      return parsed.filter(card => this.isFigureInTimeframe(card, minYear, maxYear));
    }
    return parsed;
  }

  async fetchPool(inp = {}) {
    const map = new Map();
    const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

    // 1. Extract selectedMinYear & currentYear
    const selectedMinYear = (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : null)
      ?? inp.selectedMinYear
      ?? inp.eraYear
      ?? inp.year
      ?? 1900;
    const currentYear = 2026;
    const timeframe = selectedMinYear <= 500 ? '[500 TO 2026]' : `[${selectedMinYear} TO ${currentYear}]`;

    // Build filter tokens based on Ethnicity, Religion and Country
    const ethItem = ETHNICITIES.find(x => x[0] === inp.ethnicity);
    const relItem = RELIGIONS.find(x => x[0] === inp.religion);
    const cItem = COUNTRIES.find(x => x[0] === inp.country);

    // Vietnamese query tokens
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

    const viCountryQuery = cItem && cItem[0] !== 'any' ? cItem[2] : '';

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

    const enCountryQuery = cItem && cItem[0] !== 'any' ? cItem[3] : '';

    // 2. Priority: Query Vietnamese Wikipedia first with dynamic timeframe
    const viSearchQueries = [
      [viEthQuery, viRelQuery, viCountryQuery, timeframe].filter(Boolean).join(' '),
      [viEthQuery || viRelQuery || viCountryQuery || 'nhân vật lịch sử', timeframe].filter(Boolean).join(' '),
      [viCountryQuery, 'tiểu sử', timeframe].filter(Boolean).join(' ')
    ].filter(Boolean);

    const viJobs = viSearchQueries.map(q =>
      this.wikiSearch(q, rnd(0, 15), 14, 'vi.wikipedia.org', selectedMinYear, currentYear)
    );

    const viResults = await Promise.allSettled(viJobs);
    let viCount = 0;
    viResults.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.forEach(card => {
          if (!map.has(card.title) && this.isFigureInTimeframe(card, selectedMinYear, currentYear)) {
            card.selectedMinYear = selectedMinYear;
            map.set(card.title, card);
            viCount++;
          }
        });
      }
    });

    // 3. Fallback / Supplement: Query English Wikipedia if needed with dynamic timeframe
    if (map.size < 24) {
      const enSearchQueries = [
        [enEthQuery, enRelQuery, enCountryQuery, timeframe].filter(Boolean).join(' '),
        [enEthQuery || enRelQuery || enCountryQuery || 'historical figure', timeframe].filter(Boolean).join(' '),
        [enCountryQuery, timeframe || 'biography'].filter(Boolean).join(' ')
      ].filter(Boolean);

      const enJobs = enSearchQueries.map(q =>
        this.wikiSearch(q, rnd(0, 25), 16, 'en.wikipedia.org', selectedMinYear, currentYear)
      );

      const enResults = await Promise.allSettled(enJobs);
      enResults.forEach(r => {
        if (r.status === 'fulfilled') {
          r.value.forEach(card => {
            if (!map.has(card.title) && this.isFigureInTimeframe(card, selectedMinYear, currentYear)) {
              card.selectedMinYear = selectedMinYear;
              map.set(card.title, card);
            }
          });
        }
      });
    }

    // 4. Fill from offline historical archive if still under threshold, enforcing timeframe
    if (map.size < 24) {
      this.offlinePool(selectedMinYear, currentYear).forEach(card => {
        if (!map.has(card.title) && this.isFigureInTimeframe(card, selectedMinYear, currentYear)) {
          card.selectedMinYear = selectedMinYear;
          map.set(card.title, card);
        }
      });
    }

    if (map.size === 0) throw new Error('network');
    return [...map.values()];
  }

  offlinePool(minYearParam = null, maxYearParam = 2026) {
    const selectedMinYear = minYearParam != null
      ? Number(minYearParam)
      : (typeof UserProfileModel?.getBirthYear === 'function' ? UserProfileModel.getBirthYear() : 500);
    const currentYear = maxYearParam || 2026;

    const all = OFFLINE.map(o => ({
      title: o[0],
      name: o[0],
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
      ev: { en: o[12], vi: o[13] },
      targetRole: o[15] || o[14],
      targetRoleEn: o[14],
      targetRoleVi: o[15],
      text: (o[9] + ' ' + o[10] + ' ' + o[7] + ' ' + o[8]).toLowerCase(),
      selectedMinYear
    }));

    return all.filter(c => this.isFigureInTimeframe(c, selectedMinYear, currentYear));
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

    if (minYear <= 500) {
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

    // Ethnicity match
    if (inp.ethnicity === 'any') {
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
    if (inp.religion === 'any') {
      P.religion = 0.85;
    } else {
      const relItem = RELIGIONS.find(x => x[0] === inp.religion);
      const isExact = c.religion === inp.religion;
      const isRegex = relItem && relItem[3] && new RegExp(relItem[3], 'i').test(c.text);
      P.religion = isExact ? 1.0 : isRegex ? 0.9 : 0.15;
    }

    // Country match
    P.country = inp.country === 'any' ? 0.8 : (c.countryId === inp.country ? 1 : 0.15);

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

    const total = Math.round(tot);
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
