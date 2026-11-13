/**
 * @file character-pool.js
 * @description GET & POST handler for the persistent Neon Character Pool
 * (`discovered_characters`). GET hydrates the Gacha roulette instantly from
 * rows that already carry a verified portrait; POST batch-upserts newly
 * discovered Wikipedia & Fandom characters so the pool continuously grows
 * across sessions. Falls back to `fallbackStore` when `DATABASE_URL` is absent.
 */

import { queryDiscoveredCharacters, upsertDiscoveredCharacters } from './_db.js';

// Filter out titles that are never characters — categories, lists, templates,
// portals, disambiguation stubs, media files, etc. Same spirit as
// WikipediaModel.validateEntity but runs server-side before the upsert.
function isPersonTitle(name) {
  if (!name) return false;
  const title = String(name).trim();
  if (!title) return false;

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
    /^special:/i,
    /^trang hướng dẫn:/i,
    /^thảo luận:/i,
    /^tập tin:/i,
    /^trợ giúp:/i,
    /^mô-đun:/i
  ];
  for (const rx of NON_PERSON_TITLE_PREFIXES) {
    if (rx.test(title)) return false;
  }

  const NON_PERSON_PATTERNS = [
    /olympic/i, /thế vận hội/i, /chiến tranh/i, /\bwar\b/i, /\bwars\b/i,
    /đế quốc/i, /\bempire\b/i, /giải vô địch/i, /championship/i, /tournament/i,
    /\bworld cup\b/i, /sự kiện/i, /\bevent\b/i, /\bevents\b/i, /thế kỷ/i,
    /\bcentury\b/i, /thành phố/i, /\bcity\b/i, /quốc gia/i, /\bcountry\b/i,
    /\bnation\b/i, /tổ chức/i, /organization/i, /organisation/i, /trận\s+/i,
    /\bbattle of\b/i, /danh sách/i, /\blist of\b/i, /hiệp ước/i, /\btreaty\b/i,
    /sân vận động/i, /\bstadium\b/i, /tập đoàn/i, /công ty/i, /đảng phái/i,
    /phong trào/i, /hiệp hội/i, /địa danh/i, /sách\b/i, /album\b/i,
    /bài hát\b/i, /phim\b/i, /trò chơi\b/i
  ];
  for (const pat of NON_PERSON_PATTERNS) {
    if (pat.test(title)) return false;
  }

  return true;
}

// Normalize a discovered-character record into the DB column shape.
function normalizeChar(c) {
  if (!c || typeof c !== 'object') return null;
  const name = c.name || c.title || c.char_key;
  if (!name) return null;
  if (!isPersonTitle(name)) return null;

  const char_key = c.char_key || String(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '').slice(0, 220);
  return {
    char_key,
    name: String(name).trim().slice(0, 250),
    en_title: (c.enTitle || c.en_title || c.wikiTitle || c.title || null),
    universe: (c.universe || 'historical'),
    country: (c.country || c.countryId || 'any'),
    gender: (c.gender || 'any'),
    ethnicity: (c.ethnicity || 'any'),
    religion: (c.religion || 'any'),
    era_year: (c.eraYear != null ? Number(c.eraYear) : (c.birth != null ? Number(c.birth) : null)),
    target_role: (c.targetRole || c.target_role || null),
    bio_vi: (c.bioVi || c.bio_vi || c.summaryVi || c.summary || null),
    bio_en: (c.bioEn || c.bio_en || c.summaryEn || c.summary || null),
    img_url: (c.imgUrl || c.img_url || c.img || c.imageUrl || null),
    source_wiki: (c.source || c.source_wiki || 'wiki')
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const universe = q.universe || undefined;
      const country = q.country || undefined;
      const gender = q.gender || undefined;
      const limit = Number(q.limit) || 120;

      const rows = await queryDiscoveredCharacters({ universe, country, gender, limit });
      return res.status(200).json({
        success: true,
        count: rows.length,
        characters: rows
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const characters = Array.isArray(body.characters) ? body.characters : [];
      const normalized = characters.map(normalizeChar).filter(Boolean);
      const n = await upsertDiscoveredCharacters(normalized);
      return res.status(200).json({
        success: true,
        upserted: n,
        accepted: normalized.length
      });
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error('[/api/character-pool] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}