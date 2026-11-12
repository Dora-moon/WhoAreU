import { insertUserCard } from './_db.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId in request body' });
    }

    const cardId = body.cardId || body.card_id || body.id;
    const targetName = body.targetName || body.target_name || (body.card && body.card.name) || '';
    const targetRole = body.targetRole || body.target_role || '';
    const rarity = body.rarity || body.tier || (body.card && body.card.tier) || 'common';
    const era = body.era || (body.card && (body.card.birth != null ? `${body.card.birth} - ${body.card.death || 'present'}` : '')) || '';
    const ethnicity = body.ethnicity || (body.card && body.card.countryId) || '';
    const religion = body.religion || '';
    const storyJson = body.storyJson || body.story_json || body.st || {
      card: body.card,
      st: body.st,
      absurd: body.absurd
    };

    const newCardId = await insertUserCard({
      card_id: cardId,
      user_id: userId,
      target_name: targetName,
      target_role: targetRole,
      rarity: rarity,
      era: era,
      ethnicity: ethnicity,
      religion: religion,
      story_json: storyJson
    });

    return res.status(200).json({
      success: true,
      card_id: newCardId,
      cardId: newCardId
    });
  } catch (err) {
    console.error('[/api/save-card] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
