export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mediaType = 'image/jpeg' } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: image } },
            { text: `You are reading a Smurfit Kappa paper/board pallet label. Extract ALL visible fields and return ONLY a valid JSON object:
{"customer":"","commission_no":"","pallet_no":"","caliper":"","weight":"","sheets":"","format_size":"","paper_type":"","batch_code":"","production_date":"","shipment_date":""}

Rules:
- commission_no: Com.-Nr. field, keep slash format e.g. "349179/1"
- pallet_no: Pal.-Nr. field, keep slash format e.g. "9014/26"
- batch_code: MaRu field
- paper_type: Sorte/Quality field (full name)
- caliper: Caliper (mm) value only
- weight: Weight (kg) number only
- sheets: Sheet (pcs) number only
- production_date / shipment_date: as printed e.g. "03.07.2024"
- Empty string for missing fields
- Return ONLY the JSON, no markdown, no explanation` }
          ]
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return res.status(500).json({ error: `Gemini error ${resp.status}: ${err?.error?.message || resp.statusText}` });
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const json = JSON.parse(match ? match[0] : text);
    res.json(json);
  } catch {
    res.status(500).json({ error: 'Parse failed', raw: text });
  }
}
