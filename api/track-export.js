import { trackCardExport } from './_db.js';

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
    const cardId = body.cardId || body.card_id;
    const userId = body.userId || body.user_id;

    if (!cardId) {
      return res.status(400).json({ success: false, error: 'Missing cardId in request body' });
    }

    const result = await trackCardExport(cardId, userId);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[/api/track-export] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
