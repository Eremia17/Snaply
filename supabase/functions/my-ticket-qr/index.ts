import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createTicketQrToken, safeEqual, sha256Hex } from '../_shared/ticket-qr.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });

  const authorization = request.headers.get('Authorization');
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json(401, { error: 'Connexion nécessaire.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const qrSecret = Deno.env.get('TICKET_QR_HMAC_SECRET');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !qrSecret || qrSecret.length < 32) {
    return json(503, { error: 'Le service sécurisé des billets n’est pas configuré.' });
  }

  let payload: { ticketId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }
  if (typeof payload.ticketId !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.ticketId)) {
    return json(400, { error: 'Billet invalide.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
  if (authError || !authData.user) return json(401, { error: 'Session invalide.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ticket, error: ticketError } = await admin
    .from('tickets')
    .select('id,qr_token_hash,status,orders!inner(buyer_id,status)')
    .eq('id', payload.ticketId)
    .eq('orders.buyer_id', authData.user.id)
    .eq('orders.status', 'paid')
    .maybeSingle();

  if (ticketError) return json(500, { error: 'Impossible de vérifier ce billet.' });
  if (!ticket || ticket.status !== 'valid') return json(404, { error: 'Billet valide introuvable.' });

  const qrToken = await createTicketQrToken(ticket.id, qrSecret);
  const expectedHash = await sha256Hex(qrToken);
  if (!safeEqual(expectedHash, ticket.qr_token_hash)) {
    return json(409, { error: 'Le QR sécurisé de ce billet doit être réémis par le serveur de paiement.' });
  }

  return json(200, { ticketId: ticket.id, qrToken, version: 1 });
});
