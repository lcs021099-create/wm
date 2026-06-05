import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mediaType = 'image/jpeg' } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        {
          type: 'text',
          text: `Extract all fields from this Smurfit Kappa paper/board label. Return ONLY a valid JSON object, no explanation:
{"customer":"","commission_no":"","pallet_no":"","caliper":"","weight":"","sheets":"","format_size":"","paper_type":"","batch_code":"","production_date":"","shipment_date":"","origin":""}

Rules:
- commission_no: the Com.-Nr. field, keep the slash format e.g. "349179/1"
- pallet_no: the Pal.-Nr. field, keep the slash format e.g. "9014/26"
- batch_code: the MaRu field
- paper_type: the Sorte/Quality field
- production_date and shipment_date: keep as printed e.g. "03.07.2024"
- origin: the "Made in ..." text e.g. "Germany"
- Leave field empty string if not found`
        }
      ]
    }]
  });

  try {
    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    const json = JSON.parse(match ? match[0] : text);
    res.json(json);
  } catch {
    res.status(500).json({ error: 'Parse failed', raw: response.content[0].text });
  }
}
