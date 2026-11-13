import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const sql = connectionString ? neon(connectionString) : null;

// Helper to normalize rows returned by Neon SQL template queries
function getRows(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

// Fallback in-memory store for local testing without database connection string
export const fallbackStore = {
  resources: new Map(), // userId -> { user_id, gems: 1600, pity_counter: 0, total_spins: 0, total_exports: 0 }
  cards: new Map(),      // card_id -> card
  discoveredCharacters: new Map() // char_key -> discovered character record
};

let initPromise = null;

export async function ensureTables() {
  if (!sql) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS user_resources (
            user_id VARCHAR(100) PRIMARY KEY,
            user_name VARCHAR(200) DEFAULT '',
            gems INTEGER NOT NULL DEFAULT 1600,
            pity_counter INTEGER NOT NULL DEFAULT 0,
            total_spins INTEGER NOT NULL DEFAULT 0,
            total_exports INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS user_cards (
            card_id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            target_name TEXT,
            target_role TEXT,
            rarity VARCHAR(50),
            era TEXT,
            ethnicity TEXT,
            religion TEXT,
            story_json JSONB,
            img_url TEXT,
            is_exported BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards (user_id);
        `;
        // Add user_name column if it doesn't exist (for migrations).
        try {
          await sql`ALTER TABLE user_resources ADD COLUMN IF NOT EXISTS user_name VARCHAR(200) DEFAULT '';`;
        } catch (e) {}

        // Add img_url column to user_cards if it doesn't exist (for migrations),
        // so cards reloaded from the DB always keep their portrait.
        try {
          await sql`ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS img_url TEXT;`;
        } catch (e) {}

        // Persistent Neon Character Pool — every discovered Wikipedia & Fandom
        // character is upserted here so the Gacha pool continuously grows and
        // serves instant, image-verified candidates across sessions.
        await sql`
          CREATE TABLE IF NOT EXISTS discovered_characters (
            char_key VARCHAR(250) PRIMARY KEY,
            name VARCHAR(250) NOT NULL,
            en_title VARCHAR(250),
            universe VARCHAR(50),
            country VARCHAR(100),
            gender VARCHAR(50),
            ethnicity VARCHAR(100),
            religion VARCHAR(100),
            era_year INT,
            target_role VARCHAR(250),
            bio_vi TEXT,
            bio_en TEXT,
            img_url TEXT,
            source_wiki VARCHAR(120),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_discovered_characters_universe ON discovered_characters (universe);
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_discovered_characters_country ON discovered_characters (country);
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_discovered_characters_gender ON discovered_characters (gender);
        `;
      } catch (err) {
        console.error('[DB] ensureTables error:', err);
      }
    })();
  }
  return initPromise;
}

export async function getUserResources(userId, defaultGems = 1600) {
  if (!userId) return null;
  if (!sql) {
    if (!fallbackStore.resources.has(userId)) {
      fallbackStore.resources.set(userId, {
        user_id: userId,
        user_name: '',
        gems: defaultGems,
        pity_counter: 0,
        total_spins: 0,
        total_exports: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    return fallbackStore.resources.get(userId);
  }

  await ensureTables();

  const result = await sql`
    SELECT user_id, user_name, gems, pity_counter, total_spins, total_exports, created_at, updated_at
    FROM user_resources
    WHERE user_id = ${userId}
    LIMIT 1;
  `;
  const rows = getRows(result);

  if (rows && rows.length > 0) {
    return rows[0];
  }

  // If userId does not exist, initialize with default starting Gems
  const initRes = await sql`
    INSERT INTO user_resources (user_id, user_name, gems, pity_counter, total_spins, total_exports)
    VALUES (${userId}, '', ${defaultGems}, 0, 0, 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING user_id, user_name, gems, pity_counter, total_spins, total_exports, created_at, updated_at;
  `;
  const initRows = getRows(initRes);

  return initRows[0];
}

export async function updateUserResources(userId, { user_name, gems, pity_counter, total_spins, total_exports }) {
  if (!userId) return null;

  if (!sql) {
    const current = await getUserResources(userId);
    if (user_name !== undefined && user_name !== null) current.user_name = String(user_name);
    if (gems !== undefined && gems !== null) current.gems = Number(gems);
    if (pity_counter !== undefined && pity_counter !== null) current.pity_counter = Number(pity_counter);
    if (total_spins !== undefined && total_spins !== null) current.total_spins = Number(total_spins);
    if (total_exports !== undefined && total_exports !== null) current.total_exports = Number(total_exports);
    current.updated_at = new Date().toISOString();
    fallbackStore.resources.set(userId, current);
    return current;
  }

  await ensureTables();

  // Upsert user_resources
  const res = await sql`
    INSERT INTO user_resources (user_id, user_name, gems, pity_counter, total_spins, total_exports, updated_at)
    VALUES (
      ${userId},
      COALESCE(${user_name !== undefined && user_name !== null ? String(user_name) : null}, ''),
      COALESCE(${gems !== undefined && gems !== null ? Number(gems) : null}, 1600),
      COALESCE(${pity_counter !== undefined && pity_counter !== null ? Number(pity_counter) : null}, 0),
      COALESCE(${total_spins !== undefined && total_spins !== null ? Number(total_spins) : null}, 0),
      COALESCE(${total_exports !== undefined && total_exports !== null ? Number(total_exports) : null}, 0),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
      user_name = CASE WHEN ${user_name !== undefined && user_name !== null} THEN ${String(user_name)} ELSE user_resources.user_name END,
      gems = CASE WHEN ${gems !== undefined && gems !== null} THEN ${Number(gems)} ELSE user_resources.gems END,
      pity_counter = CASE WHEN ${pity_counter !== undefined && pity_counter !== null} THEN ${Number(pity_counter)} ELSE user_resources.pity_counter END,
      total_spins = CASE WHEN ${total_spins !== undefined && total_spins !== null} THEN ${Number(total_spins)} ELSE user_resources.total_spins END,
      total_exports = CASE WHEN ${total_exports !== undefined && total_exports !== null} THEN ${Number(total_exports)} ELSE user_resources.total_exports END,
      updated_at = CURRENT_TIMESTAMP
    RETURNING user_id, user_name, gems, pity_counter, total_spins, total_exports, created_at, updated_at;
  `;
  const rows = getRows(res);

  return rows[0];
}

export async function getUserCards(userId) {
  if (!userId) return [];

  if (!sql) {
    const list = [];
    fallbackStore.cards.forEach(c => {
      if (c.user_id === userId) list.push(c);
    });
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  await ensureTables();

  const result = await sql`
    SELECT card_id, user_id, target_name, target_role, rarity, era, ethnicity, religion, story_json, img_url, is_exported, created_at
    FROM user_cards
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `;

  return getRows(result);
}

export async function insertUserCard({
  card_id,
  user_id,
  target_name,
  target_role,
  rarity,
  era,
  ethnicity,
  religion,
  story_json,
  img_url
}) {
  // Generate a valid card_id if not provided or if provided one is not a valid integer-like string
  const providedCardId = card_id;
  const cardId = providedCardId && /^\d+$/.test(String(providedCardId)) ? String(providedCardId) : ('crd_' + (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 8))));

  if (!sql) {
    // Also ensure user_resources exists
    await getUserResources(user_id);
    // Normalize story_json to an object so reads are consistent with the
    // Neon jsonb path (which returns a parsed object).
    let storyObj = story_json;
    if (typeof storyObj === 'string') {
      try { storyObj = storyObj ? JSON.parse(storyObj) : {}; } catch (e) { storyObj = {}; }
    }
    storyObj = storyObj || {};
    const cardRecord = {
      card_id: cardId,
      user_id,
      target_name: target_name || '',
      target_role: target_role || '',
      rarity: rarity || 'common',
      era: era || '',
      ethnicity: ethnicity || '',
      religion: religion || '',
      story_json: storyObj,
      img_url: img_url || '',
      is_exported: false,
      created_at: new Date().toISOString()
    };
    fallbackStore.cards.set(cardId, cardRecord);
    return cardId;
  }

  await ensureTables();
  // ALWAYS ensure the parent user row exists before inserting into user_cards,
  // so user_cards_user_id_fkey can NEVER fail with HTTP 500.
  await sql`
    INSERT INTO user_resources (user_id, user_name, gems)
    VALUES (${user_id}, '', 1600)
    ON CONFLICT (user_id) DO NOTHING;
  `;

  // Ensure img_url column exists (migration-safe)
  try {
    await sql`ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS img_url TEXT;`;
  } catch (e) {
    // ignore if already exists or any other error
  }

  const jsonStr = typeof story_json === 'string' ? story_json : JSON.stringify(story_json || {});

  // If a valid integer card_id was provided, do upsert; otherwise insert new without card_id in conflict
  if (providedCardId && /^\d+$/.test(String(providedCardId))) {
    await sql`
      INSERT INTO user_cards (
        card_id,
        user_id,
        target_name,
        target_role,
        rarity,
        era,
        ethnicity,
        religion,
        story_json,
        img_url,
        is_exported,
        created_at
      ) VALUES (
        ${cardId},
        ${user_id},
        ${target_name || ''},
        ${target_role || ''},
        ${rarity || 'common'},
        ${era || ''},
        ${ethnicity || ''},
        ${religion || ''},
        ${jsonStr}::jsonb,
        ${img_url || null},
        FALSE,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (card_id) DO UPDATE SET
        target_name = EXCLUDED.target_name,
        target_role = EXCLUDED.target_role,
        rarity = EXCLUDED.rarity,
        era = EXCLUDED.era,
        ethnicity = EXCLUDED.ethnicity,
        religion = EXCLUDED.religion,
        story_json = EXCLUDED.story_json,
        img_url = COALESCE(EXCLUDED.img_url, user_cards.img_url);
    `;
  } else {
    // New card: insert without card_id in VALUES, let SERIAL/auto generate, return card_id
    const result = await sql`
      INSERT INTO user_cards (
        user_id,
        target_name,
        target_role,
        rarity,
        era,
        ethnicity,
        religion,
        story_json,
        img_url,
        is_exported,
        created_at
      ) VALUES (
        ${user_id},
        ${target_name || ''},
        ${target_role || ''},
        ${rarity || 'common'},
        ${era || ''},
        ${ethnicity || ''},
        ${religion || ''},
        ${jsonStr}::jsonb,
        ${img_url || null},
        FALSE,
        CURRENT_TIMESTAMP
      )
      RETURNING card_id;
    `;
    const rows = getRows(result);
    if (rows && rows.length > 0 && rows[0].card_id) {
      return String(rows[0].card_id);
    }
  }

  return cardId;
}

// ---------------------------------------------------------------------------
// Persistent Character Pool — discovered_characters
// ---------------------------------------------------------------------------

// Query discovered_characters with active filters. Prioritizes rows that
// already have a portrait (img_url NOT NULL) and shuffles with RANDOM() so
// every spin draws from a fresh, image-verified cast.
export async function queryDiscoveredCharacters({ universe, country, gender, limit = 120 } = {}) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 120));

  if (!sql) {
    let arr = [...fallbackStore.discoveredCharacters.values()];
    if (universe) arr = arr.filter(c => !c.universe || c.universe === universe);
    if (country) arr = arr.filter(c => !c.country || c.country === country);
    if (gender) arr = arr.filter(c => !c.gender || c.gender === gender);
    // Prioritize rows with a portrait, then shuffle.
    arr.sort((a, b) => (b.img_url ? 1 : 0) - (a.img_url ? 1 : 0));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, safeLimit);
  }

  await ensureTables();

  const result = await sql`
    SELECT char_key, name, en_title, universe, country, gender, ethnicity, religion,
           era_year, target_role, bio_vi, bio_en, img_url, source_wiki, updated_at
    FROM discovered_characters
    WHERE (${universe ? sql`universe = ${universe}` : sql`1 = 1`}
      AND ${country ? sql`country = ${country}` : sql`1 = 1`}
      AND ${gender ? sql`gender = ${gender}` : sql`1 = 1`})
    ORDER BY (img_url IS NULL) ASC, RANDOM()
    LIMIT ${safeLimit}
  `;
  return getRows(result);
}

// Sanitize a single discovered-character record into safe DB values.
// undefined -> null, eraYear -> valid integer or null, every string is
// coerced + trimmed + truncated so a malformed or oversized value can NEVER
// cause a Postgres parameter error. Returns null when there is no usable
// char_key, so callers can filter the batch before inserting.
function sanitizeDiscoveredChar(c) {
  if (!c || typeof c !== 'object') return null;

  const charKeyRaw = c.char_key || c.charKey || c.id || c.name || '';
  const char_key = String(charKeyRaw).trim().slice(0, 240);
  if (!char_key) return null;

  const name = String(c.name || c.title || char_key).trim().slice(0, 240);
  const en_title = (c.en_title || c.enTitle)
    ? String(c.en_title || c.enTitle).trim().slice(0, 240)
    : null;
  const universe = String(c.universe || 'historical').trim().slice(0, 45);
  const country = String(c.country || c.countryId || 'any').trim().slice(0, 95);
  const gender = String(c.gender || 'any').trim().slice(0, 45);
  const ethnicity = String(c.ethnicity || 'any').trim().slice(0, 95);
  const religion = String(c.religion || 'any').trim().slice(0, 95);

  // era_year must be a valid integer or null — never a float, NaN, or string.
  const yr = Number(c.era_year ?? c.eraYear ?? c.birth);
  const eraYear = Number.isFinite(yr) ? Math.trunc(yr) : null;

  const target_role = (c.target_role || c.targetRole)
    ? String(c.target_role || c.targetRole).trim().slice(0, 240)
    : null;

  const bio_vi = (c.bio_vi || c.bioVi || c.summaryVi)
    ? String(c.bio_vi || c.bioVi || c.summaryVi)
    : null;
  const bio_en = (c.bio_en || c.bioEn || c.summaryEn)
    ? String(c.bio_en || c.bioEn || c.summaryEn)
    : null;

  const img_url = (c.img_url || c.imgUrl || c.imageUrl || c.img)
    ? String(c.img_url || c.imgUrl || c.imageUrl || c.img)
    : null;

  const source_wiki = (c.source_wiki || c.sourceWiki)
    ? String(c.source_wiki || c.sourceWiki).trim().slice(0, 115)
    : null;

  return {
    char_key,
    name,
    en_title,
    universe,
    country,
    gender,
    ethnicity,
    religion,
    era_year: eraYear,
    target_role,
    bio_vi,
    bio_en,
    img_url,
    source_wiki
  };
}

// Batch upsert (max 60 items) into discovered_characters.
// img_url is never downgraded: COALESCE(EXCLUDED.img_url, existing) keeps the
// first portrait we ever found. country is never downgraded to 'any' either.
// bio_vi / bio_en are never downgraded either: COALESCE(EXCLUDED.bio_vi,
// existing) preserves the first bio we ever stored.
//
// Every item is sanitized up-front and inserted individually inside try/catch
// so ONE malformed record can never abort the whole batch or crash the
// function with a Postgres parameter error. Returns { success, upserted,
// errors } so the caller can verify persistence in the browser console.
export async function upsertDiscoveredCharacters(characters) {
  if (!Array.isArray(characters) || !characters.length) {
    return { success: true, upserted: 0, errors: [] };
  }
  const clean = characters
    .map(sanitizeDiscoveredChar)
    .filter(Boolean)
    .slice(0, 60);
  if (!clean.length) {
    return { success: true, upserted: 0, errors: [] };
  }

  if (!sql) {
    let n = 0;
    for (const c of clean) {
      const key = c.char_key;
      const existing = fallbackStore.discoveredCharacters.get(key);
      const merged = existing
        ? {
            ...existing,
            ...c,
            img_url: c.img_url || existing.img_url,
            country: c.country && c.country !== 'any' ? c.country : (existing.country || 'any'),
            updated_at: new Date().toISOString()
          }
        : { ...c, updated_at: new Date().toISOString() };
      fallbackStore.discoveredCharacters.set(key, merged);
      n++;
    }
    return { success: true, upserted: n, errors: [] };
  }

  await ensureTables();

  let upserted = 0;
  const errors = [];
  for (const c of clean) {
    try {
      await sql`
        INSERT INTO discovered_characters (
          char_key, name, en_title, universe, country, gender, ethnicity, religion,
          era_year, target_role, bio_vi, bio_en, img_url, source_wiki
        ) VALUES (
          ${c.char_key},
          ${c.name},
          ${c.en_title},
          ${c.universe},
          ${c.country},
          ${c.gender},
          ${c.ethnicity},
          ${c.religion},
          ${c.era_year},
          ${c.target_role},
          ${c.bio_vi},
          ${c.bio_en},
          ${c.img_url},
          ${c.source_wiki}
        )
        ON CONFLICT (char_key) DO UPDATE SET
          img_url = COALESCE(EXCLUDED.img_url, discovered_characters.img_url),
          country = COALESCE(NULLIF(EXCLUDED.country, 'any'), discovered_characters.country),
          bio_vi = COALESCE(EXCLUDED.bio_vi, discovered_characters.bio_vi),
          bio_en = COALESCE(EXCLUDED.bio_en, discovered_characters.bio_en),
          updated_at = CURRENT_TIMESTAMP
      `;
      upserted++;
    } catch (err) {
      errors.push(`${c.char_key}: ${err.message || String(err)}`);
    }
  }

  return { success: true, upserted, errors };
}

export async function trackCardExport(cardId, userId = null) {
  if (!cardId) return { success: false, error: 'cardId required' };

  if (!sql) {
    const card = fallbackStore.cards.get(cardId);
    if (card) {
      card.is_exported = true;
      const targetUserId = userId || card.user_id;
      if (targetUserId) {
        const res = await getUserResources(targetUserId);
        res.total_exports = (res.total_exports || 0) + 1;
        return { success: true, card_id: cardId, is_exported: true, total_exports: res.total_exports };
      }
    }
    return { success: true, card_id: cardId, is_exported: true };
  }

  await ensureTables();

  // Mark card as exported
  const cardRes = await sql`
    UPDATE user_cards
    SET is_exported = TRUE
    WHERE card_id = ${cardId}
    RETURNING card_id, user_id, is_exported;
  `;
  const cardRows = getRows(cardRes);

  let effectiveUserId = userId;
  if (!effectiveUserId && cardRows.length > 0) {
    effectiveUserId = cardRows[0].user_id;
  }

  let totalExports = 0;
  if (effectiveUserId) {
    const resUpdate = await sql`
      UPDATE user_resources
      SET total_exports = COALESCE(total_exports, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${effectiveUserId}
      RETURNING total_exports;
    `;
    const updateRows = getRows(resUpdate);
    if (updateRows.length > 0) {
      totalExports = updateRows[0].total_exports;
    }
  }

  return {
    success: true,
    card_id: cardId,
    is_exported: true,
    total_exports: totalExports
  };
}
