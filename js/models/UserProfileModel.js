/**
 * @file UserProfileModel.js
 * @description Handles User Profile, Age, Role, Hobbies, Target Console Parameters,
 * LocalStorage persistence, i18n dictionaries, and locks state.
 */

/**
 * ~195 UN-recognized countries grouped into 6 regions + 'any'.
 * Each entry: [value, labelEn, labelVi, queryEn, queryVi, flag]
 * queryEn/queryVi are used for Wikipedia search queries.
 */
export const WORLD_COUNTRIES = [
  // Default
  ['any', 'Any Country', 'Mọi quốc gia', 'any', 'mọi', '🌍'],
  // Asia
  ['AF', 'Afghanistan', 'Afghanistan', 'Afghan', 'Afghanistan|Afghan', '🇦🇫'],
  ['AM', 'Armenia', 'Armenia', 'Armenian', 'Armenia|Armenian', '🇦🇲'],
  ['AZ', 'Azerbaijan', 'Azerbaijan', 'Azerbaijani', 'Azerbaijan|Azerbaijani', '🇦🇿'],
  ['BH', 'Bahrain', 'Bahrain', 'Bahraini', 'Bahrain|Bahraini', '🇧🇭'],
  ['BD', 'Bangladesh', 'Bangladesh', 'Bangladeshi', 'Bangladesh|Bangladeshi', '🇧🇩'],
  ['BT', 'Bhutan', 'Bhutan', 'Bhutanese', 'Bhutan|Bhutanese', '🇧🇹'],
  ['BN', 'Brunei', 'Brunei', 'Bruneian', 'Brunei|Bruneian', '🇧🇳'],
  ['KH', 'Cambodia', 'Campuchia', 'Cambodian', 'Cambodia|Khmer|Campuchia', '🇰🇭'],
  ['CN', 'China', 'Trung Quốc', 'Chinese', 'Chinese|China|Trung Quốc', '🇨🇳'],
  ['CY', 'Cyprus', 'Síp', 'Cypriot', 'Cyprus|Cypriot|Síp', '🇨🇾'],
  ['GE', 'Georgia', 'Georgia', 'Georgian', 'Georgia|Georgian|Gruzia', '🇬🇪'],
  ['IN', 'India', 'Ấn Độ', 'Indian', 'Indian|India|Ấn Độ', '🇮🇳'],
  ['ID', 'Indonesia', 'Indonesia', 'Indonesian', 'Indonesia|Indonesian', '🇮🇩'],
  ['IR', 'Iran', 'Iran', 'Iranian', 'Iran|Iranian|Persian', '🇮🇷'],
  ['IQ', 'Iraq', 'Iraq', 'Iraqi', 'Iraq|Iraqi', '🇮🇶'],
  ['IL', 'Israel', 'Israel', 'Israeli', 'Israel|Israeli', '🇮🇱'],
  ['JP', 'Japan', 'Nhật Bản', 'Japanese', 'Japanese|Japan|Nhật Bản', '🇯🇵'],
  ['JO', 'Jordan', 'Jordan', 'Jordanian', 'Jordan|Jordanian', '🇯🇴'],
  ['KZ', 'Kazakhstan', 'Kazakhstan', 'Kazakh', 'Kazakhstan|Kazakh', '🇰🇿'],
  ['KW', 'Kuwait', 'Kuwait', 'Kuwaiti', 'Kuwait|Kuwaiti', '🇰🇼'],
  ['KG', 'Kyrgyzstan', 'Kyrgyzstan', 'Kyrgyz', 'Kyrgyzstan|Kyrgyz', '🇰🇬'],
  ['LA', 'Laos', 'Lào', 'Lao', 'Laos|Lao|Lào', '🇱🇦'],
  ['LB', 'Lebanon', 'Liban', 'Lebanese', 'Lebanon|Lebanese|Liban', '🇱🇧'],
  ['MY', 'Malaysia', 'Malaysia', 'Malaysian', 'Malaysia|Malaysian', '🇲🇾'],
  ['MV', 'Maldives', 'Maldives', 'Maldivian', 'Maldives|Maldivian', '🇲🇻'],
  ['MN', 'Mongolia', 'Mông Cổ', 'Mongolian', 'Mongolia|Mongolian|Mông Cổ', '🇲🇳'],
  ['MM', 'Myanmar', 'Myanmar', 'Burmese', 'Myanmar|Burmese|Burma', '🇲🇲'],
  ['NP', 'Nepal', 'Nepal', 'Nepalese', 'Nepal|Nepalese', '🇳🇵'],
  ['KP', 'North Korea', 'Triều Tiên', 'North Korean', 'North Korea|North Korean|DPRK|Triều Tiên', '🇰🇵'],
  ['OM', 'Oman', 'Oman', 'Omani', 'Oman|Omani', '🇴🇲'],
  ['PK', 'Pakistan', 'Pakistan', 'Pakistani', 'Pakistan|Pakistani', '🇵🇰'],
  ['PS', 'Palestine', 'Palestine', 'Palestinian', 'Palestine|Palestinian', '🇵🇸'],
  ['PH', 'Philippines', 'Philippines', 'Filipino', 'Filipino|Philippines|Philippine', '🇵🇭'],
  ['QA', 'Qatar', 'Qatar', 'Qatari', 'Qatar|Qatari', '🇶🇦'],
  ['SA', 'Saudi Arabia', 'Ả Rập Xê Út', 'Saudi Arabian', 'Saudi Arabia|Saudi|Saudi Arabian|Ả Rập Xê Út', '🇸🇦'],
  ['SG', 'Singapore', 'Singapore', 'Singaporean', 'Singapore|Singaporean', '🇸🇬'],
  ['KR', 'South Korea', 'Hàn Quốc', 'South Korean', 'South Korean|Korean|Hàn Quốc', '🇰🇷'],
  ['LK', 'Sri Lanka', 'Sri Lanka', 'Sri Lankan', 'Sri Lanka|Sri Lankan', '🇱🇰'],
  ['SY', 'Syria', 'Syria', 'Syrian', 'Syria|Syrian', '🇸🇾'],
  ['TW', 'Taiwan', 'Đài Loan', 'Taiwanese', 'Taiwan|Taiwanese|Đài Loan', '🇹🇼'],
  ['TJ', 'Tajikistan', 'Tajikistan', 'Tajik', 'Tajikistan|Tajik', '🇹🇯'],
  ['TH', 'Thailand', 'Thái Lan', 'Thai', 'Thai|Thailand|Thái Lan', '🇹🇭'],
  ['TL', 'Timor-Leste', 'Timor-Leste', 'Timorese', 'Timor-Leste|East Timor|Timor Leste', '🇹🇱'],
  ['TR', 'Turkey', 'Thổ Nhĩ Kỳ', 'Turkish', 'Turkish|Turkey|Thổ Nhĩ Kỳ|Türkiye', '🇹🇷'],
  ['TM', 'Turkmenistan', 'Turkmenistan', 'Turkmen', 'Turkmenistan|Turkmen', '🇹🇲'],
  ['AE', 'United Arab Emirates', 'Các Tiểu Vương Quốc Ả Rập Thống Nhất', 'Emirati', 'United Arab Emirates|UAE|Emirati|Tiểu Vương Quốc', '🇦🇪'],
  ['UZ', 'Uzbekistan', 'Uzbekistan', 'Uzbek', 'Uzbekistan|Uzbek', '🇺🇿'],
  ['VN', 'Vietnam', 'Việt Nam', 'Vietnamese', 'Vietnamese|Vietnam|Việt Nam', '🇻🇳'],
  ['YE', 'Yemen', 'Yemen', 'Yemeni', 'Yemen|Yemeni', '🇾🇪'],
  // Europe
  ['AL', 'Albania', 'Albania', 'Albanian', 'Albania|Albanian', '🇦🇱'],
  ['AD', 'Andorra', 'Andorra', 'Andorran', 'Andorra|Andorran', '🇦🇩'],
  ['AT', 'Austria', 'Áo', 'Austrian', 'Austrian|Austria|Áo', '🇦🇹'],
  ['BY', 'Belarus', 'Belarus', 'Belarusian', 'Belarus|Belarusian|Belorussia', '🇧🇾'],
  ['BE', 'Belgium', 'Bỉ', 'Belgian', 'Belgian|Belgium|Bỉ', '🇧🇪'],
  ['BA', 'Bosnia and Herzegovina', 'Bosnia và Herzegovina', 'Bosnian', 'Bosnia|Bosnian|Bosnia and Herzegovina', '🇧🇦'],
  ['BG', 'Bulgaria', 'Bulgaria', 'Bulgarian', 'Bulgaria|Bulgarian', '🇧🇬'],
  ['HR', 'Croatia', 'Croatia', 'Croatian', 'Croatia|Croatian|Hrvatska', '🇭🇷'],
  ['CZ', 'Czech Republic', 'Séc', 'Czech', 'Czech|Czech Republic|Czechia|Séc', '🇨🇿'],
  ['DK', 'Denmark', 'Đan Mạch', 'Danish', 'Danish|Denmark|Đan Mạch', '🇩🇰'],
  ['EE', 'Estonia', 'Estonia', 'Estonian', 'Estonia|Estonian', '🇪🇪'],
  ['FI', 'Finland', 'Phần Lan', 'Finnish', 'Finnish|Finland|Suomi|Phần Lan', '🇫🇮'],
  ['FR', 'France', 'Pháp', 'French', 'French|France|Pháp', '🇫🇷'],
  ['DE', 'Germany', 'Đức', 'German', 'German|Germany|Deutschland|Đức', '🇩🇪'],
  ['GR', 'Greece', 'Hy Lạp', 'Greek', 'Greek|Greece|Hellas|Hy Lạp', '🇬🇷'],
  ['HU', 'Hungary', 'Hungary', 'Hungarian', 'Hungarian|Hungary|Magyarország', '🇭🇺'],
  ['IS', 'Iceland', 'Iceland', 'Icelandic', 'Iceland|Icelandic|Ísland', '🇮🇸'],
  ['IE', 'Ireland', 'Ireland', 'Irish', 'Irish|Ireland|Éire', '🇮🇪'],
  ['IT', 'Italy', 'Ý', 'Italian', 'Italian|Italy|Ý', '🇮🇹'],
  ['XK', 'Kosovo', 'Kosovo', 'Kosovar', 'Kosovo|Kosovar', '🇽🇰'],
  ['LV', 'Latvia', 'Latvia', 'Latvian', 'Latvia|Latvian|Latvija', '🇱🇻'],
  ['LI', 'Liechtenstein', 'Liechtenstein', 'Liechtensteiner', 'Liechtenstein|Liechtensteiner', '🇱🇮'],
  ['LT', 'Lithuania', 'Lithuania', 'Lithuanian', 'Lithuania|Lithuanian|Lietuva', '🇱🇹'],
  ['LU', 'Luxembourg', 'Luxembourg', 'Luxembourger', 'Luxembourg|Luxembourger', '🇱🇺'],
  ['MT', 'Malta', 'Malta', 'Maltese', 'Malta|Maltese', '🇲🇹'],
  ['MD', 'Moldova', 'Moldova', 'Moldovan', 'Moldova|Moldovan', '🇲🇩'],
  ['MC', 'Monaco', 'Monaco', 'Monégasque', 'Monaco|Monégasque', '🇲🇨'],
  ['ME', 'Montenegro', 'Montenegro', 'Montenegrin', 'Montenegro|Montenegrin|Crna Gora', '🇲🇪'],
  ['NL', 'Netherlands', 'Hà Lan', 'Dutch', 'Dutch|Netherlands|Holland|Hà Lan', '🇳🇱'],
  ['MK', 'North Macedonia', 'Bắc Macedonia', 'Macedonian', 'North Macedonia|Macedonian|Bắc Macedonia', '🇲🇰'],
  ['NO', 'Norway', 'Na Uy', 'Norwegian', 'Norwegian|Norway|Norge|Na Uy', '🇳🇴'],
  ['PL', 'Poland', 'Ba Lan', 'Polish', 'Polish|Poland|Ba Lan|Polska', '🇵🇱'],
  ['PT', 'Portugal', 'Bồ Đào Nha', 'Portuguese', 'Portuguese|Portugal|Bồ Đào Nha', '🇵🇹'],
  ['RO', 'Romania', 'Romania', 'Romanian', 'Romanian|Romania|România', '🇷🇴'],
  ['RU', 'Russia', 'Nga', 'Russian', 'Russian|Russia|Soviet|Nga|Rossiya', '🇷🇺'],
  ['SM', 'San Marino', 'San Marino', 'Sammarinese', 'San Marino|Sammarinese', '🇸🇲'],
  ['RS', 'Serbia', 'Serbia', 'Serbian', 'Serbian|Serbia|Srbija', '🇷🇸'],
  ['SK', 'Slovakia', 'Slovakia', 'Slovak', 'Slovak|Slovakia|Slovensko', '🇸🇰'],
  ['SI', 'Slovenia', 'Slovenia', 'Slovenian', 'Slovenian|Slovenia|Slovenija', '🇸🇮'],
  ['ES', 'Spain', 'Tây Ban Nha', 'Spanish', 'Spanish|Spain|Tây Ban Nha|España', '🇪🇸'],
  ['SE', 'Sweden', 'Thụy Điển', 'Swedish', 'Swedish|Sweden|Sverige|Thụy Điển', '🇸🇪'],
  ['CH', 'Switzerland', 'Thụy Sĩ', 'Swiss', 'Swiss|Switzerland|Thụy Sĩ|Swiss Confederation', '🇨🇭'],
  ['UA', 'Ukraine', 'Ukraine', 'Ukrainian', 'Ukrainian|Ukraine|Ukrayina', '🇺🇦'],
  ['GB', 'United Kingdom', 'Vương quốc Anh', 'British', 'British|United Kingdom|UK|England|Scotland|Wales|Vương quốc Anh', '🇬🇧'],
  ['VA', 'Vatican City', 'Vatican', 'Vatican', 'Vatican|Vatican City|Holy See', '🇻🇦'],
  // Americas
  ['AG', 'Antigua and Barbuda', 'Antigua và Barbuda', 'Antiguan', 'Antigua|Barbuda|Antiguan', '🇦🇬'],
  ['AR', 'Argentina', 'Argentina', 'Argentine', 'Argentine|Argentina|Argentinian', '🇦🇷'],
  ['BS', 'Bahamas', 'Bahamas', 'Bahamian', 'Bahamas|Bahamian', '🇧🇸'],
  ['BB', 'Barbados', 'Barbados', 'Barbadian', 'Barbados|Barbadian', '🇧🇧'],
  ['BZ', 'Belize', 'Belize', 'Belizean', 'Belize|Belizean', '🇧🇿'],
  ['BO', 'Bolivia', 'Bolivia', 'Bolivian', 'Bolivian|Bolivia', '🇧🇴'],
  ['BR', 'Brazil', 'Brazil', 'Brazilian', 'Brazilian|Brazil|Brasil', '🇧🇷'],
  ['CA', 'Canada', 'Canada', 'Canadian', 'Canadian|Canada', '🇨🇦'],
  ['CL', 'Chile', 'Chile', 'Chilean', 'Chilean|Chile', '🇨🇱'],
  ['CO', 'Colombia', 'Colombia', 'Colombian', 'Colombian|Colombia', '🇨🇴'],
  ['CR', 'Costa Rica', 'Costa Rica', 'Costa Rican', 'Costa Rica|Costa Rican', '🇨🇷'],
  ['CU', 'Cuba', 'Cuba', 'Cuban', 'Cuban|Cuba', '🇨🇺'],
  ['DM', 'Dominica', 'Dominica', 'Dominican', 'Dominica|Dominican', '🇩🇲'],
  ['DO', 'Dominican Republic', 'Cộng hòa Dominican', 'Dominican', 'Dominican Republic|Dominican|Dominicana', '🇩🇴'],
  ['EC', 'Ecuador', 'Ecuador', 'Ecuadorian', 'Ecuadorian|Ecuador', '🇪🇨'],
  ['SV', 'El Salvador', 'El Salvador', 'Salvadoran', 'El Salvador|Salvadoran|Salvador', '🇸🇻'],
  ['GD', 'Grenada', 'Grenada', 'Grenadian', 'Grenada|Grenadian', '🇬🇩'],
  ['GT', 'Guatemala', 'Guatemala', 'Guatemalan', 'Guatemalan|Guatemala', '🇬🇹'],
  ['GY', 'Guyana', 'Guyana', 'Guyanese', 'Guyana|Guyanese', '🇬🇾'],
  ['HT', 'Haiti', 'Haiti', 'Haitian', 'Haiti|Haitian', '🇭🇹'],
  ['HN', 'Honduras', 'Honduras', 'Honduran', 'Honduran|Honduras', '🇭🇳'],
  ['JM', 'Jamaica', 'Jamaica', 'Jamaican', 'Jamaican|Jamaica', '🇯🇲'],
  ['MX', 'Mexico', 'Mexico', 'Mexican', 'Mexican|Mexico|México', '🇲🇽'],
  ['NI', 'Nicaragua', 'Nicaragua', 'Nicaraguan', 'Nicaragua|Nicaraguan', '🇳🇮'],
  ['PA', 'Panama', 'Panama', 'Panamanian', 'Panama|Panamanian', '🇵🇦'],
  ['PY', 'Paraguay', 'Paraguay', 'Paraguayan', 'Paraguayan|Paraguay', '🇵🇾'],
  ['PE', 'Peru', 'Peru', 'Peruvian', 'Peruvian|Peru|Perú', '🇵🇪'],
  ['KN', 'Saint Kitts and Nevis', 'Saint Kitts và Nevis', 'Kittitian', 'Saint Kitts|Nevis|Kittitian', '🇰🇳'],
  ['LC', 'Saint Lucia', 'Saint Lucia', 'Saint Lucian', 'Saint Lucia|Saint Lucian', '🇱🇨'],
  ['VC', 'Saint Vincent and the Grenadines', 'Saint Vincent và Grenadines', 'Vincentian', 'Saint Vincent|Vincentian|Grenadines', '🇻🇨'],
  ['SR', 'Suriname', 'Suriname', 'Surinamese', 'Suriname|Surinamese', '🇸🇷'],
  ['TT', 'Trinidad and Tobago', 'Trinidad và Tobago', 'Trinidadian', 'Trinidad|Tobago|Trinidadian', '🇹🇹'],
  ['US', 'United States', 'Hoa Kỳ', 'American', 'American|United States|USA|US|Hoa Kỳ', '🇺🇸'],
  ['UY', 'Uruguay', 'Uruguay', 'Uruguayan', 'Uruguayan|Uruguay', '🇺🇾'],
  ['VE', 'Venezuela', 'Venezuela', 'Venezuelan', 'Venezuelan|Venezuela', '🇻🇪'],
  // Africa
  ['DZ', 'Algeria', 'Algeria', 'Algerian', 'Algerian|Algeria', '🇩🇿'],
  ['AO', 'Angola', 'Angola', 'Angolan', 'Angolan|Angola', '🇦🇴'],
  ['BJ', 'Benin', 'Benin', 'Beninese', 'Benin|Beninese', '🇧🇯'],
  ['BW', 'Botswana', 'Botswana', 'Botswanan', 'Botswana|Botswanan', '🇧🇼'],
  ['BF', 'Burkina Faso', 'Burkina Faso', 'Burkinabé', 'Burkina Faso|Burkinabé', '🇧🇫'],
  ['BI', 'Burundi', 'Burundi', 'Burundian', 'Burundi|Burundian', '🇧🇮'],
  ['CV', 'Cabo Verde', 'Cape Verde', 'Cabo Verdean', 'Cabo Verde|Cape Verde|Cabo Verdean', '🇨🇻'],
  ['CM', 'Cameroon', 'Cameroon', 'Cameroonian', 'Cameroon|Cameroonian', '🇨🇲'],
  ['CF', 'Central African Republic', 'Cộng hòa Trung Phi', 'Central African', 'Central African Republic|Central African|CAR', '🇨🇫'],
  ['TD', 'Chad', 'Chad', 'Chadian', 'Chadian|Chad', '🇹🇩'],
  ['KM', 'Comoros', 'Comoros', 'Comoran', 'Comoros|Comoran', '🇰🇲'],
  ['CG', 'Congo', 'Congo', 'Congolese', 'Congo|Congolese|Republic of the Congo', '🇨🇬'],
  ['CD', 'Democratic Republic of the Congo', 'Cộng hòa Dân chủ Congo', 'Congolese', 'Democratic Republic of the Congo|DRC|Congo Kinshasa', '🇨🇩'],
  ['DJ', 'Djibouti', 'Djibouti', 'Djiboutian', 'Djibouti|Djiboutian', '🇩🇯'],
  ['EG', 'Egypt', 'Ai Cập', 'Egyptian', 'Egyptian|Egypt|Ai Cập', '🇪🇬'],
  ['GQ', 'Equatorial Guinea', 'Guinea Xích Đạo', 'Equatorial Guinean', 'Equatorial Guinea|Equatorial Guinean', '🇬🇶'],
  ['ER', 'Eritrea', 'Eritrea', 'Eritrean', 'Eritrea|Eritrean', '🇪🇷'],
  ['SZ', 'Eswatini', 'Eswatini', 'Swazi', 'Eswatini|Swaziland|Swazi', '🇸🇿'],
  ['ET', 'Ethiopia', 'Ethiopia', 'Ethiopian', 'Ethiopian|Ethiopia|Abyssinia', '🇪🇹'],
  ['GA', 'Gabon', 'Gabon', 'Gabonese', 'Gabon|Gabonese', '🇬🇦'],
  ['GM', 'Gambia', 'Gambia', 'Gambian', 'Gambia|Gambian', '🇬🇲'],
  ['GH', 'Ghana', 'Ghana', 'Ghanaian', 'Ghanaian|Ghana', '🇬🇭'],
  ['GN', 'Guinea', 'Guinea', 'Guinean', 'Guinea|Guinean', '🇬🇳'],
  ['GW', 'Guinea-Bissau', 'Guinea-Bissau', 'Bissau-Guinean', 'Guinea-Bissau|Bissau|Guinea Bissau', '🇬🇼'],
  ['CI', 'Ivory Coast', 'Bờ Biển Ngà', 'Ivorian', 'Ivory Coast|Côte d\'Ivoire|Ivorian|Bờ Biển Ngà', '🇨🇮'],
  ['KE', 'Kenya', 'Kenya', 'Kenyan', 'Kenyan|Kenya', '🇰🇪'],
  ['LS', 'Lesotho', 'Lesotho', 'Basotho', 'Lesotho|Basotho', '🇱🇸'],
  ['LR', 'Liberia', 'Liberia', 'Liberian', 'Liberia|Liberian', '🇱🇷'],
  ['LY', 'Libya', 'Libya', 'Libyan', 'Libyan|Libya', '🇱🇾'],
  ['MG', 'Madagascar', 'Madagascar', 'Malagasy', 'Madagascar|Malagasy', '🇲🇬'],
  ['MW', 'Malawi', 'Malawi', 'Malawian', 'Malawi|Malawian', '🇲🇼'],
  ['ML', 'Mali', 'Mali', 'Malian', 'Malian|Mali', '🇲🇱'],
  ['MR', 'Mauritania', 'Mauritania', 'Mauritanian', 'Mauritania|Mauritanian', '🇲🇷'],
  ['MU', 'Mauritius', 'Mauritius', 'Mauritian', 'Mauritius|Mauritian', '🇲🇺'],
  ['MA', 'Morocco', 'Maroc', 'Moroccan', 'Moroccan|Morocco|Maroc|Maghreb', '🇲🇦'],
  ['MZ', 'Mozambique', 'Mozambique', 'Mozambican', 'Mozambican|Mozambique', '🇲🇿'],
  ['NA', 'Namibia', 'Namibia', 'Namibian', 'Namibian|Namibia', '🇳🇦'],
  ['NE', 'Niger', 'Niger', 'Nigerien', 'Niger|Nigerien', '🇳🇪'],
  ['NG', 'Nigeria', 'Nigeria', 'Nigerian', 'Nigerian|Nigeria', '🇳🇬'],
  ['RW', 'Rwanda', 'Rwanda', 'Rwandan', 'Rwandan|Rwanda', '🇷🇼'],
  ['ST', 'Sao Tome and Principe', 'Sao Tome và Principe', 'Sao Tomean', 'Sao Tome|Principe|Sao Tomean', '🇸🇹'],
  ['SN', 'Senegal', 'Senegal', 'Senegalese', 'Senegalese|Senegal', '🇸🇳'],
  ['SC', 'Seychelles', 'Seychelles', 'Seychellois', 'Seychelles|Seychellois', '🇸🇨'],
  ['SL', 'Sierra Leone', 'Sierra Leone', 'Sierra Leonean', 'Sierra Leone|Sierra Leonean', '🇸🇱'],
  ['SO', 'Somalia', 'Somalia', 'Somali', 'Somali|Somalia', '🇸🇴'],
  ['ZA', 'South Africa', 'Nam Phi', 'South African', 'South African|South Africa|Nam Phi', '🇿🇦'],
  ['SS', 'South Sudan', 'Nam Sudan', 'South Sudanese', 'South Sudan|South Sudanese', '🇸🇸'],
  ['SD', 'Sudan', 'Sudan', 'Sudanese', 'Sudanese|Sudan', '🇸🇩'],
  ['TZ', 'Tanzania', 'Tanzania', 'Tanzanian', 'Tanzanian|Tanzania', '🇹🇿'],
  ['TG', 'Togo', 'Togo', 'Togolese', 'Togolese|Togo', '🇹🇬'],
  ['TN', 'Tunisia', 'Tunisia', 'Tunisian', 'Tunisian|Tunisia', '🇹🇳'],
  ['UG', 'Uganda', 'Uganda', 'Ugandan', 'Ugandan|Uganda', '🇺🇬'],
  ['ZM', 'Zambia', 'Zambia', 'Zambian', 'Zambian|Zambia', '🇿🇲'],
  ['ZW', 'Zimbabwe', 'Zimbabwe', 'Zimbabwean', 'Zimbabwean|Zimbabwe', '🇿🇼'],
  // Oceania
  ['AU', 'Australia', 'Úc', 'Australian', 'Australian|Australia|Úc', '🇦🇺'],
  ['FJ', 'Fiji', 'Fiji', 'Fijian', 'Fijian|Fiji', '🇫🇯'],
  ['KI', 'Kiribati', 'Kiribati', 'I-Kiribati', 'Kiribati|I-Kiribati', '🇰🇮'],
  ['MH', 'Marshall Islands', 'Quần đảo Marshall', 'Marshallese', 'Marshall Islands|Marshallese', '🇲🇭'],
  ['FM', 'Micronesia', 'Micronesia', 'Micronesian', 'Micronesia|Micronesian|FSM', '🇫🇲'],
  ['NR', 'Nauru', 'Nauru', 'Nauruan', 'Nauru|Nauruan', '🇳🇷'],
  ['NZ', 'New Zealand', 'New Zealand', 'New Zealander', 'New Zealand|New Zealander|Aotearoa', '🇳🇿'],
  ['PW', 'Palau', 'Palau', 'Palauan', 'Palau|Palauan', '🇵🇼'],
  ['PG', 'Papua New Guinea', 'Papua New Guinea', 'Papua New Guinean', 'Papua New Guinea|Papua New Guinean|PNG', '🇵🇬'],
  ['WS', 'Samoa', 'Samoa', 'Samoan', 'Samoan|Samoa', '🇼🇸'],
  ['SB', 'Solomon Islands', 'Quần đảo Solomon', 'Solomon Islander', 'Solomon Islands|Solomon Islander', '🇸🇧'],
  ['TO', 'Tonga', 'Tonga', 'Tongan', 'Tongan|Tonga', '🇹🇴'],
  ['TV', 'Tuvalu', 'Tuvalu', 'Tuvaluan', 'Tuvalu|Tuvaluan', '🇹🇻'],
  ['VU', 'Vanuatu', 'Vanuatu', 'Ni-Vanuatu', 'Vanuatu|Ni-Vanuatu', '🇻🇺']
];

export const COUNTRIES = WORLD_COUNTRIES;

export const CRX = COUNTRIES.filter(c => c[4]).map(c => [c[0], new RegExp('\\b(' + c[4] + ')\\b', 'i')]);

/**
 * HOBBY_SEMANTIC_MAP — expands player hobbies & traits (VI & EN) into a set of
 * semantic keywords used by the Weighted Similarity Engine (Stage 2).
 * Each hobby/trait maps to a list of lowercase keyword tokens. The scorer counts
 * keyword hits in the candidate's bio/role text to compute m ∈ [0, 1].
 */
export const HOBBY_SEMANTIC_MAP = {
  // --- VI hobbies/traits ---
  'code game': ['programmer', 'computer', 'software', 'engineer', 'inventor', 'game', 'technology', 'kỹ sư', 'nhà phát minh', 'coder', 'điện toán', 'máy tính', 'phần mềm'],
  'lập trình': ['programmer', 'computer', 'software', 'engineer', 'inventor', 'game', 'technology', 'kỹ sư', 'nhà phát minh', 'coder', 'điện toán', 'máy tính'],
  'code': ['programmer', 'computer', 'software', 'engineer', 'inventor', 'technology', 'coder', 'điện toán', 'máy tính', 'phần mềm'],
  'âm nhạc': ['musician', 'composer', 'singer', 'nhạc sĩ', 'ca sĩ', 'music', 'nhạc', 'ca sĩ', 'nhạc sĩ'],
  'nhạc': ['musician', 'composer', 'singer', 'nhạc sĩ', 'ca sĩ', 'music', 'nhạc'],
  'khoa học': ['scientist', 'physicist', 'chemist', 'mathematician', 'nhà khoa học', 'vật lý', 'hóa học', 'toán học'],
  'võ thuật': ['martial artist', 'warrior', 'general', 'soldier', 'tướng', 'võ sư', 'fighter', 'combat', 'kẻ chiến đấu'],
  'đánh nhau': ['martial artist', 'warrior', 'general', 'soldier', 'tướng', 'võ sư', 'fighter', 'combat', 'kẻ chiến đấu'],
  'vẽ': ['painter', 'artist', 'họa sĩ', 'art', 'họa', 'chiến tranh', 'painting'],
  'họa sĩ': ['painter', 'artist', 'họa sĩ', 'art'],
  'thiên văn': ['astronomer', 'astronomy', 'thiên văn', 'ngôi sao', 'vũ trụ', 'cosmos'],
  'văn học': ['writer', 'novel', 'poet', 'nhà văn', 'nhà thơ', 'literature', 'văn học'],
  'thể thao': ['athlete', 'footballer', 'boxer', 'runner', 'thể thao', 'cầu thủ', 'võ sĩ', 'sport'],
  'du lịch': ['explorer', 'traveler', 'thám hiểm', 'du khách', 'voyage', 'exploration'],
  // --- EN hobbies/traits ---
  'programming': ['programmer', 'computer', 'software', 'engineer', 'inventor', 'technology', 'coder', 'software engineer'],
  'coding': ['programmer', 'computer', 'software', 'engineer', 'inventor', 'technology', 'coder'],
  'technology': ['programmer', 'computer', 'software', 'engineer', 'inventor', 'technology', 'tech'],
  'music': ['musician', 'composer', 'singer', 'music', 'song', 'album'],
  'singing': ['singer', 'musician', 'vocal', 'ca sĩ'],
  'science': ['scientist', 'physicist', 'chemist', 'mathematician', 'nhà khoa học', 'research'],
  'physics': ['physicist', 'scientist', 'vật lý', 'quantum', 'relativity'],
  'martial arts': ['martial artist', 'warrior', 'fighter', 'combat', 'kung fu', 'võ thuật'],
  'fighting': ['martial artist', 'warrior', 'fighter', 'combat', 'soldier'],
  'painting': ['painter', 'artist', 'họa sĩ', 'art', 'canvas', 'painting'],
  'astronomy': ['astronomer', 'astronomy', 'thiên văn', 'star', 'cosmos', 'space'],
  'writing': ['writer', 'novel', 'author', 'nhà văn', 'book', 'literature'],
  'sports': ['athlete', 'footballer', 'boxer', 'runner', 'thể thao', 'sport', 'game'],
  'travel': ['explorer', 'traveler', 'thám hiểm', 'voyage', 'journey'],
  'collect': ['collector', 'sưu tầm', 'collecting', 'hoarder'],
  'chess': ['chess', 'cờ', 'strategist', 'tactician', 'board game'],
  'gardening': ['gardener', 'tree', 'plant', 'cây', 'thảo mộc', 'nature'],
  'cooking': ['cook', 'chef', 'bếp', 'nấu ăn', 'food', 'culinary'],
  'photography': ['photographer', 'camera', 'photo', 'ảnh', 'ảnh ảnh'],
  'dance': ['dancer', 'dance', 'múa', 'dancing', 'ballet'],
  'acting': ['actor', 'actress', 'diễn viên', 'acting', 'theater', 'cinema'],
  'filmmaking': ['director', 'film', 'phim', 'cinema', 'đạo diễn'],
  'reading': ['reader', 'book', 'sách', 'reading', 'literature'],
  'gaming': ['gamer', 'game', 'video game', 'trò chơi', 'player'],
};

// Map from a raw hobby string to canonical map keys (fuzzy VI/EN matching).
export const HOBBY_MAP_ALIASES = {
  'code game': ['code game', 'lập trình', 'code', 'programming', 'coding', 'technology'],
  'âm nhạc': ['âm nhạc', 'nhạc', 'music', 'singing'],
  'khoa học': ['khoa học', 'science', 'physics'],
  'võ thuật': ['võ thuật', 'martial arts', 'fighting'],
  'đánh nhau': ['đánh nhau', 'martial arts', 'fighting'],
  'vẽ': ['vẽ', 'họa sĩ', 'painting', 'art'],
  'thiên văn': ['thiên văn', 'astronomy', 'space'],
  'văn học': ['văn học', 'writing', 'literature'],
  'thể thao': ['thể thao', 'sports', 'football'],
  'du lịch': ['du lịch', 'travel', 'exploration'],
  'programming': ['programming', 'coding', 'code game', 'technology'],
  'coding': ['coding', 'programming', 'code game'],
  'technology': ['technology', 'code game', 'programming'],
  'music': ['music', 'âm nhạc', 'nhạc'],
  'singing': ['singing', 'âm nhạc', 'music'],
  'science': ['science', 'khoa học', 'physics'],
  'physics': ['physics', 'science', 'khoa học'],
  'martial arts': ['martial arts', 'võ thuật', 'đánh nhau'],
  'fighting': ['fighting', 'martial arts', 'võ thuật'],
  'painting': ['painting', 'vẽ', 'họa sĩ', 'art'],
  'astronomy': ['astronomy', 'thiên văn', 'space'],
  'writing': ['writing', 'văn học', 'literature'],
  'sports': ['sports', 'thể thao', 'football'],
  'travel': ['travel', 'du lịch', 'exploration'],
  'collect': ['collect', 'sưu tầm', 'collecting'],
  'chess': ['chess', 'cờ', 'strategist'],
  'gardening': ['gardening', 'cây', 'nature'],
  'cooking': ['cooking', 'nấu ăn', 'food', 'chef'],
  'photography': ['photography', 'ảnh', 'camera'],
  'dance': ['dance', 'múa', 'dancing'],
  'acting': ['acting', 'diễn viên', 'actor'],
  'filmmaking': ['filmmaking', 'đạo diễn', 'film'],
  'reading': ['reading', 'sách', 'book'],
  'gaming': ['gaming', 'game', 'video game'],
};

export function hobbyKeywordsFor(inputHobby, trait) {
  const raw = String((inputHobby || '') + ' ' + (trait || '')).trim().toLowerCase();
  if (!raw) return [];
  const keys = new Set();
  // Direct key match.
  if (HOBBY_SEMANTIC_MAP[raw]) keys.add(raw);
  // Alias expansion.
  for (const [alias, expansions] of Object.entries(HOBBY_MAP_ALIASES)) {
    if (raw === alias || raw.includes(alias) || alias.includes(raw)) {
      expansions.forEach(k => keys.add(k));
    }
  }
  // Substring match against known keys.
  for (const key of Object.keys(HOBBY_SEMANTIC_MAP)) {
    if (raw.includes(key) || key.includes(raw)) keys.add(key);
  }
  // Also add raw word tokens as direct keyword matches.
  const tokens = raw.split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2);
  tokens.forEach(t => keys.add(t));
  // Collect all keywords.
  const kw = new Set();
  keys.forEach(k => {
    const list = HOBBY_SEMANTIC_MAP[k];
    if (Array.isArray(list)) list.forEach(x => kw.add(x));
    else kw.add(k);
  });
  tokens.forEach(t => kw.add(t));
  return [...kw];
}

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

export const UNIVERSES = [
  ['historical', 'Historical Figures (Real History)', 'Lịch sử Thực tế (Nhân vật Lịch sử)'],
  ['fictional', 'Fictional Worlds (Game, Anime, Movies)', 'Thế giới Giả tưởng (Game, Phim, Anime/Hoạt hình)'],
  ['multiverse', 'Multiverse (All Universes)', 'Đa vũ trụ Hỗn hợp (Toàn bộ Vũ trụ)']
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
    gemTip: 'Diamonds & Gems — Used for Timeline Spins (Click for +1600 Daily Bonus)',
    exportedBadge: '📤 Shared / Exported',
    notEnoughGems: '💎 Not enough Gems! (Need {cost} Gems). Click 💎 to claim +1600 bonus!',
    bonusClaimed: '✨ +1600 Gems Daily Bonus claimed! Ready to spin!',
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
    universeL: 'Universe Scope',
    univ_historical: 'Historical Figures (Real History)',
    univ_fictional: 'Fictional Worlds (Game, Anime, Movies)',
    univ_multiverse: 'Multiverse (All Universes)',
    adminPoolH: '🛠️ Character Pool & Entity Inspector',
    adminPoolTip: 'Open the Admin Pool Inspector (Dev Only)',
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
    storyToneL: 'Story Tone / Thể loại cốt truyện',
    storyTonePh: 'Pick the narrative style',
    tone_comedy: '😂 Comedy & Absurd',
    tone_epic: '⚔️ Epic & Heroic',
    tone_tragic: '😢 Tragic & Melancholic',
    tone_mystery: '🔍 Mystery & Thriller',
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
    gemTip: 'Kim Cương & Gem — Dùng để quay dòng thời gian (Bấm để nhận +1600 Gem thưởng)',
    exportedBadge: '📤 Đã xuất chia sẻ',
    notEnoughGems: '💎 Không đủ Gem! (Cần {cost} Gem). Bấm vào biểu tượng 💎 để nhận +1600 Gem miễn phí!',
    bonusClaimed: '✨ Đã nhận +1600 Gem thưởng hàng ngày! Tha hồ quay thẻ!',
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
    universeL: 'Phạm vi Vũ trụ',
    univ_historical: 'Lịch sử Thực tế (Nhân vật Lịch sử)',
    univ_fictional: 'Thế giới Giả tưởng (Game, Phim, Anime/Hoạt hình)',
    univ_multiverse: 'Đa vũ trụ Hỗn hợp (Toàn bộ Vũ trụ)',
    adminPoolH: '🛠️ Kiểm tra Danh sách Nhân vật & Thực thể',
    adminPoolTip: 'Mở trình kiểm tra Danh sách Nhân vật (Chỉ dành cho Dev)',
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
    storyToneL: 'Thể loại cốt chuyện',
    storyTonePh: 'Chọn phong cách kể chuyện',
    tone_comedy: '😂 Hài hước / Bựa',
    tone_epic: '⚔️ Hào hùng / Sử thi',
    tone_tragic: '😢 Bi tráng / Cảm động',
    tone_mystery: '🔍 Bí ẩn / Kinh dị',
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
    ch4: 'Chương 4 — Cược cuối cùng',
    butterfly: '🦋 Hiệu ứng cánh bướm — chọn lời khuyên tệ hại bạn thì thầm trước cao trào',
    itemGot: '🏺 Nhận được Vật Bị Nguyền',
    saved: 'Đã thêm vào Bảo tàng Vật thể Kỳ quặc.',
    gemReward: 'Phần thưởng đá quý',
    bridge: 'Giữa chừng',
    bridgePerfect: 'Hoàn hảo! Thách thức được giải quyết một cách kín đáo. Vũ trụ run lên.',
    bridgeSuccess: 'Thành công! Chướng ngại vật đã qua. Lịch sử hít một hơi và tiếp tục.',
    bridgeFail: 'Thử thách thất bại. Nhưng thất bại chỉ là một đường đi — chuyện tìm lối khác.',
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

  // Story tone state — unlocked by the trigger profile below.
  static STORY_TONE_TRIGGER = {
    name: 'datmtp12345',
    age: '20',
    role: 'dev',
    hobby: 'code game'
  };

  constructor() {
    UserProfileModel.instance = this;
    this.storageKey = 'wg_form';
    this.userIdKey = 'wg_uid';
    this.gemsKey = 'wg_gems';
    this.spinsKey = 'wg_spins';
    this.exportsKey = 'wg_exports';
    this.langKey = 'wg_lang';
    this.themeKey = 'wg_theme';
    this.toneKey = 'wg_tone';
    this.storyTone = this._load(this.toneKey, 'comedy');
    this.userId = null;
    this._syncTimer = null;
    this._gemListeners = [];
    this.gachaModel = null;
    this.inventoryModel = null;

    this.gems = this._load(this.gemsKey, 1600);
    this.totalSpins = this._load(this.spinsKey, 0);
    this.totalExports = this._load(this.exportsKey, 0);

    const navLang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
    this.lang = this._load(this.langKey, navLang.toLowerCase().startsWith('vi') ? 'vi' : 'en');
    this.theme = this._load(this.themeKey, 'dark');

    this.locks = {
      universe: false,
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
      universe: 'historical',
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

    // Secret Admin Mode state — unlocked by the trigger profile below.
    this.isAdmin = false;

    this.load();
  }

  // Trigger profile (case-insensitive, trimmed) that unlocks DEV ADMIN MODE.
  static ADMIN_TRIGGER = {
    name: 'datmtp12345',
    age: '20',
    role: 'dev',
    hobby: 'code game'
  };

  checkAdminTrigger() {
    const f = this.fields;
    const norm = s => String(s || '').trim().toLowerCase();

    // Effective role: if the user picked the "custom" ("✍️ Tự nhập…")
    // option in the Role dropdown, the trigger role is taken from the
    // custom-role text input (uRoleCustom). Otherwise use the select value.
    const rawRole = norm(f.uRole);
    const customRole = norm(f.uRoleCustom);
    const effectiveRole =
      (rawRole === 'custom' || rawRole === 'tự nhập...' || rawRole === 'nhập vai trò riêng')
        ? customRole
        : rawRole;

    const matched =
      norm(f.uName) === UserProfileModel.ADMIN_TRIGGER.name &&
      String(f.uAge).trim() === UserProfileModel.ADMIN_TRIGGER.age &&
      effectiveRole === UserProfileModel.ADMIN_TRIGGER.role &&
      norm(f.uHobby) === UserProfileModel.ADMIN_TRIGGER.hobby;
    if (matched && !this.isAdmin) {
      this.isAdmin = true;
      if (typeof window !== 'undefined') {
        window.__WHOAREU_ADMIN_MODE__ = true;
        window.dispatchEvent(new CustomEvent('whoareu:admin-unlocked'));
      }
    } else if (!matched) {
      this.isAdmin = false;
    }
    return this.isAdmin;
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

  getUserId() {
    if (this.userId) return this.userId;
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.userIdKey);
        if (saved && typeof saved === 'string' && saved.trim()) {
          this.userId = saved.trim();
          return this.userId;
        }
      }
    } catch (e) {}

    let newId = '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      newId = 'usr_' + crypto.randomUUID();
    } else {
      newId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
    this.userId = newId;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.userIdKey, newId);
      }
    } catch (e) {}
    return this.userId;
  }

  setUserId(id) {
    if (id && typeof id === 'string' && id.trim()) {
      this.userId = id.trim();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.userIdKey, this.userId);
        }
      } catch (e) {}
    }
    return this.userId;
  }

  save() {
    this._save(this.storageKey, this.fields);
  }

  getGems() {
    return Number(this.gems) || 0;
  }

  setGems(val) {
    this.gems = Math.max(0, Number(val) || 0);
    this._save(this.gemsKey, this.gems);
    this._notifyGemsChange();
    this.scheduleSyncState();
    return this.gems;
  }

  deductGems(amount) {
    const cost = Number(amount) || 0;
    if (this.gems < cost) return false;
    this.gems -= cost;
    this._save(this.gemsKey, this.gems);
    this._notifyGemsChange();
    this.scheduleSyncState();
    return true;
  }

  addGems(amount) {
    const bonus = Number(amount) || 0;
    this.gems += bonus;
    this._save(this.gemsKey, this.gems);
    this._notifyGemsChange();
    this.scheduleSyncState();
    return this.gems;
  }

  onGemsChange(fn) {
    if (typeof fn === 'function') {
      this._gemListeners.push(fn);
    }
  }

  _notifyGemsChange() {
    this._gemListeners.forEach(fn => {
      try { fn(this.gems); } catch (e) {}
    });
  }

  getTotalSpins() {
    return Number(this.totalSpins) || 0;
  }

  incrementTotalSpins(n = 1) {
    this.totalSpins = (Number(this.totalSpins) || 0) + Number(n);
    this._save(this.spinsKey, this.totalSpins);
    this.scheduleSyncState();
    return this.totalSpins;
  }

  getTotalExports() {
    return Number(this.totalExports) || 0;
  }

  incrementTotalExports(n = 1) {
    this.totalExports = (Number(this.totalExports) || 0) + Number(n);
    this._save(this.exportsKey, this.totalExports);
    this.scheduleSyncState();
    return this.totalExports;
  }

  scheduleSyncState(delayMs = 400) {
    if (typeof fetch === 'undefined') return;
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this.syncStateToRemote().catch(() => {});
    }, delayMs);
  }

  async syncStateToRemote() {
    if (typeof fetch === 'undefined') return null;
    const userId = this.getUserId();
    if (!userId) return null;
    try {
      let pityVal = 0;
      if (this.gachaModel && typeof this.gachaModel.getPity === 'function') {
        pityVal = this.gachaModel.getPity();
      } else {
        const savedPity = this._load('wg_pity', 0);
        pityVal = Number(savedPity) || 0;
      }

      const resp = await fetch('/api/sync-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          user_name: this.fields.uName || '',
          gems: this.gems,
          pity_counter: pityVal,
          pityCounter: pityVal,
          total_spins: this.totalSpins,
          totalSpins: this.totalSpins,
          total_exports: this.totalExports,
          totalExports: this.totalExports
        })
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      // Seamless fallback to localStorage
      return null;
    }
  }

  async syncFromRemote(inventoryModel = null, gachaModel = null) {
    if (typeof fetch === 'undefined') return false;
    const userId = this.getUserId();
    if (!userId) return false;
    try {
      const resp = await fetch(`/api/sync-state?userId=${encodeURIComponent(userId)}`);
      if (!resp.ok) return false;
      const data = await resp.json();
      if (data && data.success) {
        let changed = false;

        // 1. Hydrate Gems
        if (data.gems !== undefined && data.gems !== null) {
          const remoteGems = Number(data.gems);
          if (remoteGems !== this.gems) {
            this.gems = remoteGems;
            this._save(this.gemsKey, this.gems);
            this._notifyGemsChange();
            changed = true;
          }
        }

        // 2. Hydrate Total Spins & Exports
        if (data.total_spins !== undefined && data.total_spins !== null) {
          this.totalSpins = Number(data.total_spins);
          this._save(this.spinsKey, this.totalSpins);
        }
        if (data.total_exports !== undefined && data.total_exports !== null) {
          this.totalExports = Number(data.total_exports);
          this._save(this.exportsKey, this.totalExports);
        }

        // 3. Hydrate Pity Counter
        const targetGacha = gachaModel || this.gachaModel;
        if (targetGacha && (data.pity_counter !== undefined || data.pityCounter !== undefined)) {
          const remotePity = Number(data.pity_counter !== undefined ? data.pity_counter : data.pityCounter) || 0;
          if (typeof targetGacha.setPity === 'function') {
            targetGacha.setPity(remotePity);
          } else {
            targetGacha.pity = remotePity;
            if (typeof targetGacha._savePity === 'function') targetGacha._savePity();
          }
        }

        // 4. Hydrate Inventory
        const targetInv = inventoryModel || this.inventoryModel;
        if (targetInv && Array.isArray(data.cards)) {
          const invChanged = targetInv.syncFromRemoteCards(data.cards);
          if (invChanged) changed = true;
        }

        return changed;
      }
    } catch (err) {
      // Seamless fallback to localStorage
    }
    return false;
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
      // Check if the admin trigger profile is now matched.
      if (['uName', 'uAge', 'uRole', 'uHobby', 'uRoleCustom'].includes(key)) {
        this.checkAdminTrigger();
      }
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
      universe: f.universe || 'historical',
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
      case 'universe': {
        const pool = ['historical', 'fictional', 'multiverse'];
        this.fields.universe = pool[Math.floor(Math.random() * pool.length)];
        break;
      }
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
    ['universe', 'skin', 'tgender', 'era', 'ethnicity', 'religion', 'country', 'trait', 'absurd'].forEach(k => {
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

  setStoryTone(tone) {
    const allowed = ['comedy', 'epic', 'tragic', 'mystery'];
    this.storyTone = allowed.includes(tone) ? tone : 'comedy';
    this._save(this.toneKey, this.storyTone);
    return this.storyTone;
  }

  getStoryTone() {
    return this.storyTone;
  }

  getToneLabel(tone = this.storyTone, lang = this.lang) {
    const labels = {
      comedy: { en: 'Hài hước / Bựa', vi: 'Hài hước / Bựa' },
      epic: { en: 'Hào hùng / Sử thi', vi: 'Hào hùng / Sử thi' },
      tragic: { en: 'Bi tráng / Cảm động', vi: 'Bi tráng / Cảm động' },
      mystery: { en: 'Bí ẩn / Kinh dị', vi: 'Bí ẩn / Kinh dị' }
    };
    return (labels[tone] && labels[tone][lang]) || tone;
  }
}

export default UserProfileModel;
