import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, AudioLines, BadgeCheck, Clock3, Headphones, Lightbulb, Sparkles, Wallet } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type BalanceRow = { currency_code: string; balance: number | string };
type AttemptRow = { id: string; status: string; submitted_at: string };

function money(amount: number | string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString("fr-FR")} ${currency}`;
  }
}

function statusLabel(status: string) {
  if (status === "approved") return "Participation approuvée";
  if (status === "rejected") return "Participation refusée";
  if (status === "under_review") return "Vérification en cours";
  return "Participation envoyée";
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const [profileResult, balancesResult, approvedResult, pendingResult, recentResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("wallet_balances").select("currency_code, balance"),
    supabase.from("task_attempts").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("task_attempts").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    supabase.from("task_attempts").select("id, status, submitted_at").order("submitted_at", { ascending: false }).limit(4),
  ]);

  const displayName = profileResult.data?.display_name || "explorateur";
  const balances = (balancesResult.data ?? []) as BalanceRow[];
  const recent = (recentResult.data ?? []) as AttemptRow[];
  const balanceLabel = balances.length === 0
    ? "0"
    : balances.length === 1
      ? money(balances[0].balance, balances[0].currency_code)
      : "Plusieurs devises";

  return <PortalShell active="/dashboard">
    <section className="welcome-row"><div><div className="eyebrow">VOTRE ESPACE ADEARN</div><h1>Bonjour, <em>{displayName}.</em> ✳</h1><p>Voici votre activité réelle : les compteurs ne bougent qu'après enregistrement en base.</p></div><Link href="/tasks" className="portal-primary">Explorer les missions <ArrowUpRight size={16}/></Link></section>
    <div className="demo-alert"><Sparkles size={17}/><span><b>Transparence activée.</b> Les missions rémunérées et les retraits restent désactivés tant que les partenaires et les paiements ne sont pas opérationnels.</span></div>
    <section className="stat-grid">
      <article className="stat-card stat-highlight"><div className="stat-head"><span>RÉCOMPENSES CONFIRMÉES</span><Wallet size={17}/></div><strong>{balanceLabel}</strong><Link href="/wallet" className="stat-foot">Voir le portefeuille ↗</Link><div className="stat-watermark">✳</div></article>
      <article className="stat-card"><div className="stat-head"><span>MISSIONS VALIDÉES</span><BadgeCheck size={17}/></div><strong>{approvedResult.count ?? 0}</strong><span className="stat-foot">Participations approuvées</span></article>
      <article className="stat-card"><div className="stat-head"><span>EN ATTENTE</span><Clock3 size={17}/></div><strong>{pendingResult.count ?? 0}</strong><span className="stat-foot">À vérifier côté AdEarn</span></article>
    </section>
    <div className="dashboard-columns">
      <section className="panel-card"><div className="panel-heading"><div><div className="eyebrow">À DÉCOUVRIR</div><h2>Vos catégories</h2></div><Link href="/tasks">Tout voir <ArrowUpRight size={14}/></Link></div>
        <div className="mini-category"><span className="mini-emoji lime-emoji">🧠</span><div><b>Sondages & études</b><small>Donnez votre avis et contribuez</small></div><span className="soon-label">SELON OFFRES</span></div>
        <div className="mini-category"><span className="mini-emoji peach-emoji">🎧</span><div><b>Audio & voix</b><small>Écoute et classification</small></div><span className="soon-label">SELON OFFRES</span></div>
        <div className="mini-category"><span className="mini-emoji blue-emoji">🧩</span><div><b>Micro-missions</b><small>Petites tâches bien définies</small></div><span className="soon-label">SELON OFFRES</span></div>
      </section>
      <section className="panel-card activity-panel"><div className="panel-heading"><div><div className="eyebrow">VOTRE PARCOURS</div><h2>Activité récente</h2></div></div>
        {recent.length > 0 ? recent.map(item => <div className="activity-item" key={item.id}><span className="activity-icon"><BadgeCheck size={17}/></span><div><b>{statusLabel(item.status)}</b><small>Référence : {item.id.slice(0, 8).toUpperCase()}</small><em>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.submitted_at))}</em></div></div>) : <div className="activity-note"><Lightbulb size={15}/> Vos participations apparaîtront ici après votre première soumission.</div>}
      </section>
    </div>
    <section className="dashboard-banner"><div><span>✳ LE PRINCIPE ADEARN</span><h2>Des règles claires.<br/>Pas de mauvaises surprises.</h2><p>Chaque mission devra préciser son partenaire, sa récompense, ses critères et ses délais.</p></div><div className="banner-symbol"><AudioLines size={55}/></div></section>
  </PortalShell>;
}
