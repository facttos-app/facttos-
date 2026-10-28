// Fonction Supabase "turn-credentials"
// Donne aux utilisateurs connectés des identifiants TURN temporaires (Cloudflare).
// Secrets à créer dans Supabase : CF_TURN_KEY_ID et CF_TURN_API_TOKEN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // 1) seul un utilisateur connecté peut demander des identifiants
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data, error } = await supa.auth.getUser();
  if (error || !data?.user) return json({ error: "Connexion requise" }, 401);

  // 2) demande à Cloudflare des identifiants valables 8 heures
  const keyId = Deno.env.get("CF_TURN_KEY_ID");
  const token = Deno.env.get("CF_TURN_API_TOKEN");
  if (!keyId || !token) return json({ error: "Configuration manquante" }, 500);

  const r = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 28800 }),
    },
  );
  if (!r.ok) return json({ error: "Cloudflare a refusé la demande" }, 502);
  return json(await r.json());
});
