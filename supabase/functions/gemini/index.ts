const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { image, mime } = await req.json();
    const key = Deno.env.get("GEMINI_API_KEY") ?? "";
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Identifie le film, la série ou l’animé représenté sur cette affiche. Réponds uniquement avec le titre original suivi de l’année entre parenthèses, par exemple : Titre (2020). Si tu ne reconnais pas l’œuvre, réponds : INCONNU." },
              { inline_data: { mime_type: mime ?? "image/jpeg", data: image } },
            ],
          }],
        }),
      },
    );
    const j = await r.json();
    const text: string = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    if (!text || /INCONNU/i.test(text)) return json({ title: null, year: null });
    const m = text.match(/^(.*)\((\d{4})\)\s*$/);
    return json({ title: (m ? m[1] : text).trim(), year: m ? m[2] : null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});