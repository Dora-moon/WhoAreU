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
    // Parse body safely (Vercel may deliver a JSON string or a parsed object).
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = body ? JSON.parse(body) : {};
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
    }
    body = body || {};

    // Accept all field aliases (camelCase or snake_case) and sanitize values.
    const userId = body.userId || body.user_id || 'guest';
    const userName = String(body.userName || body.user_name || '').slice(0, 95);
    const targetName = String(body.targetName || body.target_name || body.name || 'Unknown').slice(0, 240);
    const targetRole = (body.targetRole || body.target_role)
      ? String(body.targetRole || body.target_role).slice(0, 240)
      : null;
    const rarity = String(body.rarity || 'common').slice(0, 45);
    const era = body.era ? String(body.era).slice(0, 95) : null;
    const ethnicity = body.ethnicity ? String(body.ethnicity).slice(0, 95) : null;
    const religion = body.religion ? String(body.religion).slice(0, 95) : null;
    const img = body.imgUrl || body.img_url || (body.card && body.card.img) || null;

    // Build storyJson and ensure the image URL is embedded so cards reloaded
    // from user_cards always keep their portrait.
    const storyJson = body.storyJson || body.story_json || body.st || {
      card: body.card,
      st: body.st,
      absurd: body.absurd
    };
    if (storyJson && typeof storyJson === 'object' && !Array.isArray(storyJson)) {
      if (img) storyJson.img = img;
    }

    // Ensure valid JSON string cast cleanly to ::jsonb.
    const storyJsonStr = JSON.stringify(storyJson || {});

    const newCardId = await insertUserCard({
      card_id: body.cardId || body.card_id || body.id,
      user_id: userId,
      user_name: userName,
      target_name: targetName,
      target_role: targetRole,
      rarity: rarity,
      era: era,
      ethnicity: ethnicity,
      religion: religion,
      img_url: img,
      story_json: storyJsonStr
    });

    return res.status(200).json({
      success: true,
      cardId: newCardId,
      card_id: newCardId
    });
  } catch (err) {
    console.error('[/api/save-card] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code || null,
      detail: err.detail || null
    });
  }
}