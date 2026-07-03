export default {
  async fetch(request, env) {
    // CORS headers — necessario perché il Worker viene chiamato dal browser (GitHub Pages)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const { image, mimeType } = await request.json();

      if (!image) {
        return new Response(JSON.stringify({ error: 'Nessuna immagine ricevuta' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType || 'image/jpeg',
                    data: image,
                  },
                },
                {
                  type: 'text',
                  text: `Guarda questa foto di un piatto/pasto.
1) Stima il peso complessivo della porzione visibile, in grammi.
2) Fornisci i valori nutrizionali standard PER 100 GRAMMI di quell'alimento/piatto (non della porzione totale, ma per 100g).

Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, senza backtick markdown, nel seguente formato esatto:
{"name": "nome breve del piatto in italiano", "weight_g": numero_intero, "calories_per_100g": numero_intero, "protein_per_100g": numero, "carbs_per_100g": numero, "fat_per_100g": numero}

Fai una stima realistica. Se non riesci a identificare il cibo con certezza, fai comunque la stima migliore possibile in base a quello che vedi.`,
                },
              ],
            },
          ],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        throw new Error('Anthropic API error: ' + errText);
      }

      const anthropicData = await anthropicRes.json();
      const textBlock = anthropicData.content.find((c) => c.type === 'text');
      let raw = textBlock ? textBlock.text.trim() : '{}';

      // rimuove eventuali backtick markdown residui
      raw = raw.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(raw);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
