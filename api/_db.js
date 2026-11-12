import { sql } from '@vercel/postgres';
import crypto from 'crypto';

const hasPostgres = Boolean(
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL
);

// Fallback in-memory store for local testing without database connection string
const fallbackStore = {
  resources: new Map(), // userId -> { user_id, gems: 1600, pity_counter: 0, total_spins: 0, total_exports: 0 }
  cards: new Map()      // card_id -> card
};

let initPromise = null;

export async function ensureTables() {
  if (!hasPostgres) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS user_resources (
            user_id VARCHAR(100) PRIMARY KEY,
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
            is_exported BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards (user_id);
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
  if (!hasPostgres) {
    if (!fallbackStore.resources.has(userId)) {
      fallbackStore.resources.set(userId, {
        user_id: userId,
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

  const { rows } = await sql`
    SELECT user_id, gems, pity_counter, total_spins, total_exports, created_at, updated_at
    FROM user_resources
    WHERE user_id = ${userId}
    LIMIT 1;
  `;

  if (rows && rows.length > 0) {
    return rows[0];
  }

  // If userId does not exist, initialize with default starting Gems
  const initRes = await sql`
    INSERT INTO user_resources (user_id, gems, pity_counter, total_spins, total_exports)
    VALUES (${userId}, ${defaultGems}, 0, 0, 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING user_id, gems, pity_counter, total_spins, total_exports, created_at, updated_at;
  `;

  return initRes.rows[0];
}

export async function updateUserResources(userId, { gems, pity_counter, total_spins, total_exports }) {
  if (!userId) return null;

  if (!hasPostgres) {
    const current = await getUserResources(userId);
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
    INSERT INTO user_resources (user_id, gems, pity_counter, total_spins, total_exports, updated_at)
    VALUES (
      ${userId},
      COALESCE(${gems !== undefined ? Number(gems) : null}, 1600),
      COALESCE(${pity_counter !== undefined ? Number(pity_counter) : null}, 0),
      COALESCE(${total_spins !== undefined ? Number(total_spins) : null}, 0),
      COALESCE(${total_exports !== undefined ? Number(total_exports) : null}, 0),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
      gems = CASE WHEN ${gems !== undefined && gems !== null} THEN ${Number(gems)} ELSE user_resources.gems END,
      pity_counter = CASE WHEN ${pity_counter !== undefined && pity_counter !== null} THEN ${Number(pity_counter)} ELSE user_resources.pity_counter END,
      total_spins = CASE WHEN ${total_spins !== undefined && total_spins !== null} THEN ${Number(total_spins)} ELSE user_resources.total_spins END,
      total_exports = CASE WHEN ${total_exports !== undefined && total_exports !== null} THEN ${Number(total_exports)} ELSE user_resources.total_exports END,
      updated_at = CURRENT_TIMESTAMP
    RETURNING user_id, gems, pity_counter, total_spins, total_exports, created_at, updated_at;
  `;

  return res.rows[0];
}

export async function getUserCards(userId) {
  if (!userId) return [];

  if (!hasPostgres) {
    const list = [];
    fallbackStore.cards.forEach(c => {
      if (c.user_id === userId) list.push(c);
    });
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  await ensureTables();

  const { rows } = await sql`
    SELECT card_id, user_id, target_name, target_role, rarity, era, ethnicity, religion, story_json, is_exported, created_at
    FROM user_cards
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `;

  return rows || [];
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
  story_json
}) {
  const cardId = card_id || ('crd_' + (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2, 8))));

  if (!hasPostgres) {
    // Also ensure user_resources exists
    await getUserResources(user_id);
    const cardRecord = {
      card_id: cardId,
      user_id,
      target_name: target_name || '',
      target_role: target_role || '',
      rarity: rarity || 'common',
      era: era || '',
      ethnicity: ethnicity || '',
      religion: religion || '',
      story_json: story_json || {},
      is_exported: false,
      created_at: new Date().toISOString()
    };
    fallbackStore.cards.set(cardId, cardRecord);
    return cardId;
  }

  await ensureTables();
  // Ensure user exists first
  await getUserResources(user_id);

  const jsonStr = typeof story_json === 'string' ? story_json : JSON.stringify(story_json || {});

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
      story_json = EXCLUDED.story_json;
  `;

  return cardId;
}

export async function trackCardExport(cardId, userId = null) {
  if (!cardId) return { success: false, error: 'cardId required' };

  if (!hasPostgres) {
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

  let effectiveUserId = userId;
  if (!effectiveUserId && cardRes.rows.length > 0) {
    effectiveUserId = cardRes.rows[0].user_id;
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
    if (resUpdate.rows.length > 0) {
      totalExports = resUpdate.rows[0].total_exports;
    }
  }

  return {
    success: true,
    card_id: cardId,
    is_exported: true,
    total_exports: totalExports
  };
}
