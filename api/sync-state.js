import { getUserResources, updateUserResources, getUserCards } from './_db.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const userId = req.query.userId || req.query.user_id;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId parameter' });
      }

      // 1. Get or initialize user_resources (defaults to 1600 gems, 0 pity, 0 spins, 0 exports)
      const resources = await getUserResources(userId, 1600);

      // 2. Get user_cards inventory
      const cards = await getUserCards(userId);

      return res.status(200).json({
        success: true,
        userId: resources.user_id,
        gems: resources.gems,
        pity_counter: resources.pity_counter,
        pityCounter: resources.pity_counter,
        total_spins: resources.total_spins,
        totalSpins: resources.total_spins,
        total_exports: resources.total_exports,
        totalExports: resources.total_exports,
        cards: cards,
        inventory: cards
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const userId = body.userId || body.user_id;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId in request body' });
      }

      const gems = body.gems;
      const pity_counter = body.pity_counter !== undefined ? body.pity_counter : body.pityCounter;
      const total_spins = body.total_spins !== undefined ? body.total_spins : body.totalSpins;
      const total_exports = body.total_exports !== undefined ? body.total_exports : body.totalExports;

      const updated = await updateUserResources(userId, {
        gems,
        pity_counter,
        total_spins,
        total_exports
      });

      return res.status(200).json({
        success: true,
        userId: updated.user_id,
        gems: updated.gems,
        pity_counter: updated.pity_counter,
        pityCounter: updated.pity_counter,
        total_spins: updated.total_spins,
        totalSpins: updated.total_spins,
        total_exports: updated.total_exports,
        totalExports: updated.total_exports
      });
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error('[/api/sync-state] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
