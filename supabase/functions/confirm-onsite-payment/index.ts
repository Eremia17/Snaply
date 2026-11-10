import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createTicketQrToken(ticketId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`ticket-mada:v1:${ticketId}`),
  );
  return `tm1_${bytesToHex(new Uint8Array(signature))}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });

  const authorization = request.headers.get('Authorization');
  const bearer = authorization?.match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!bearer) return json(401, { error: 'Connexion nécessaire.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const qrSecret = Deno.env.get('TICKET_QR_HMAC_SECRET');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !qrSecret || qrSecret.length < 32) {
    return json(503, { error: 'Le service sécurisé des billets n’est pas configuré.' });
  }

  let payload: { orderId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }

  if (typeof payload.orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.orderId)) {
    return json(400, { error: 'Réservation invalide.' });
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

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) return json(500, { error: 'Impossible de vérifier le compte.' });
  if (!profile || !['organizer', 'admin'].includes(profile.role)) {
    return json(403, { error: 'Accès réservé aux organisateurs autorisés.' });
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,event_id,status,expires_at,subtotal_mga,payment_provider')
    .eq('id', payload.orderId)
    .maybeSingle();

  if (orderError) return json(500, { error: 'Impossible de charger la réservation.' });
  if (!order) return json(404, { error: 'Réservation introuvable.' });

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('organizer_id,status,starts_at')
    .eq('id', order.event_id)
    .maybeSingle();

  if (eventError) return json(500, { error: 'Impossible de vérifier l’événement.' });
  if (!event) return json(404, { error: 'Événement introuvable.' });
  if (profile.role !== 'admin' && event.organizer_id !== authData.user.id) {
    return json(403, { error: 'Cette réservation ne dépend pas de ton organisation.' });
  }

  if (order.status === 'paid' && order.payment_provider !== 'onsite_cash') {
    return json(409, { error: 'Cette réservation a déjà été réglée par un autre moyen.' });
  }

  if (order.status === 'pending') {
    const deadline = order.expires_at ? new Date(order.expires_at).getTime() : 0;
    if (!deadline || deadline <= Date.now() || new Date(event.starts_at).getTime() <= Date.now()) {
      return json(409, { error: 'La réservation a expiré. Aucun billet ne peut être émis.' });
    }
  } else if (order.status !== 'paid') {
    return json(409, { error: 'Cette réservation ne peut plus être confirmée.' });
  }

  let ticketRows: Array<{ id: string; ticket_type_id: string; holder_name: string | null }>;

  if (order.status === 'paid') {
    const { data, error } = await admin
      .from('tickets')
      .select('id,ticket_type_id,holder_name')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });

    if (error || !data?.length) return json(500, { error: 'Les billets déjà émis sont introuvables.' });
    ticketRows = data;
  } else {
    const { data: items, error: itemsError } = await admin
      .from('order_items')
      .select('ticket_type_id,quantity')
      .eq('order_id', order.id);

    if (itemsError || !items?.length) return json(500, { error: 'Détails de réservation introuvables.' });

    ticketRows = [];
    for (const item of items) {
      for (let index = 0; index < item.quantity; index += 1) {
        ticketRows.push({
          id: crypto.randomUUID(),
          ticket_type_id: item.ticket_type_id,
          holder_name: null,
        });
      }
    }
  }

  const tickets = await Promise.all(ticketRows.map(async ticket => {
    const qrToken = await createTicketQrToken(ticket.id, qrSecret);
    return {
      ticket_id: ticket.id,
      ticket_type_id: ticket.ticket_type_id,
      holder_name: ticket.holder_name,
      qr_token: qrToken,
      qr_token_hash: await sha256Hex(qrToken),
    };
  }));

  const { data: issued, error: issueError } = await admin.rpc('confirm_onsite_order_payment', {
    p_order_id: order.id,
    p_confirmed_by: authData.user.id,
    p_tickets: tickets.map(({ ticket_id, ticket_type_id, holder_name, qr_token }) => ({
      ticket_id,
      ticket_type_id,
      holder_name,
      qr_token,
    })),
  });

  if (issueError || !issued?.length) {
    // A concurrent retry may have completed the same confirmation. Re-read
    // and let the same organizer retry with the already-issued ticket IDs.
    const { data: latestOrder } = await admin
      .from('orders')
      .select('status,payment_provider')
      .eq('id', order.id)
      .maybeSingle();

    if (latestOrder?.status === 'paid' && latestOrder.payment_provider === 'onsite_cash') {
      const { data: existing, error: existingError } = await admin
        .from('tickets')
        .select('id,ticket_type_id,holder_name')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (!existingError && existing?.length) {
        const retryTickets = await Promise.all(existing.map(async ticket => ({
          ticket_id: ticket.id,
          ticket_type_id: ticket.ticket_type_id,
          holder_name: ticket.holder_name,
          qr_token: await createTicketQrToken(ticket.id, qrSecret),
        })));
        const { data: retryIssued, error: retryError } = await admin.rpc('confirm_onsite_order_payment', {
          p_order_id: order.id,
          p_confirmed_by: authData.user.id,
          p_tickets: retryTickets,
        });
        if (!retryError && retryIssued?.length) {
          return json(200, { success: true, ticketCount: retryIssued.length });
        }
      }
    }

    return json(409, { error: issueError?.message || 'La confirmation du paiement a échoué.' });
  }

  return json(200, { success: true, ticketCount: issued.length });
});
