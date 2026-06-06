export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  try {
    return await ocrHandler(req, res);
  } catch (e) {
    console.error('OCR handler crash:', e);
    return res.status(500).json({ error: 'OCR crash: ' + (e?.message || String(e)) });
  }
}

async function ocrHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mediaType = 'image/jpeg', model } = req.body || {};
  if (!image) return res.status(400).json({ error: 'No image' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const useModel = model || 'gemini-flash-latest';
  const body = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: mediaType, data: image } },
        { text: `You are reading a Smurfit Kappa paper/board pallet label. Extract ALL visible fields.

Rules:
- commission_no: Com.-Nr. field, keep slash format e.g. "349179/1"
- pallet_no: Pal.-Nr. field, keep slash format e.g. "9014/26"
- batch_code: MaRu field
- paper_type: Sorte/Quality field (full name)
- caliper: Caliper (mm) value only
- weight: Weight (kg) number only
- sheets: Sheet (pcs) number only
- production_date / shipment_date: as printed e.g. "03.07.2024"
- Empty string for missing fields` }
      ]
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          customer: { type: 'string' },
          commission_no: { type: 'string' },
          pallet_no: { type: 'string' },
          caliper: { type: 'string' },
          weight: { type: 'string' },
          sheets: { type: 'string' },
          format_size: { type: 'string' },
          paper_type: { type: 'string' },
          batch_code: { type: 'string' },
          production_date: { type: 'string' },
          shipment_date: { type: 'string' },
        },
      },
    },
  });

  // 自動重試瞬時 503/429（高負載）
  let resp;
  for (let attempt = 0; attempt < 3; attempt++) {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );
    if (resp.ok) break;
    if (resp.status !== 503 && resp.status !== 429) break;
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return res.status(500).json({ error: `Gemini error ${resp.status}: ${err?.error?.message || resp.statusText}` });
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (!text) return res.status(500).json({ error: 'Empty: ' + JSON.stringify(data).slice(0, 300) });

  try {
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const json = JSON.parse(match ? match[0] : cleaned);
    res.json(json);
  } catch {
    res.status(500).json({ error: 'Parse failed: ' + text.slice(0, 300) });
  }
}
