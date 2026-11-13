import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ClipboardCheck, Clock3, ShieldCheck, Users } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type ReviewAttempt = {
  id: string;
  task_id: string;
  user_id: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string;
  submission_data: { response?: string };
  task: { title: string } | null;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard?error=forbidden");

  const [attemptsResult, membersResult, tasksResult] = await Promise.all([
    supabase.from("task_attempts")
      .select("id, task_id, user_id, status, submitted_at, submission_data, task:tasks(title)")
      .in("status", ["submitted", "under_review"])
      .order("submitted_at", { ascending: true })
      .limit(50),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
  ]);

  const attempts = (attemptsResult.data ?? []) as unknown as ReviewAttempt[];
  const memberIds = [...new Set(attempts.map(attempt => attempt.user_id))];
  const profileResult = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string }[] };
  const names = new Map((profileResult.data ?? []).map(member => [member.id, member.display_name]));
  const hasError = Boolean(attemptsResult.error || membersResult.error || tasksResult.error || profileResult.error);

  return <PortalShell active="/admin">
    <section className="welcome-row"><div><div className="eyebrow">ESPACE DE GESTION PRIVÉ</div><h1>Centre de <em>contrôle.</em></h1><p>Vue de supervision en lecture seule des missions et participations.</p></div><span className="admin-secure-label"><ShieldCheck size={15}/> ACCÈS ADMINISTRATEUR</span></section>
    <div className="admin-readonly-note"><ShieldCheck size={18}/><span><b>Mode sécurisé — lecture seule.</b> Cette version permet de contrôler les envois. Les décisions de validation et les crédits seront ajoutés après la mise en place du workflow serveur et des contrôles antifraude.</span></div>
    {hasError && <div className="auth-feedback auth-error" role="alert">Certaines données ne sont pas accessibles. Vérifiez que le schéma AdEarn mis à jour est installé dans le projet dédié.</div>}
    <section className="admin-metric-grid">
      <article className="panel-card admin-metric"><span><ClipboardCheck size={18}/></span><small>À EXAMINER</small><strong>{attemptsResult.error ? "—" : attempts.length}</strong><p>Participations en attente ou en cours</p></article>
      <article className="panel-card admin-metric"><span><Users size={18}/></span><small>COMPTES CRÉÉS</small><strong>{membersResult.error ? "—" : membersResult.count ?? 0}</strong><p>Profils enregistrés sur AdEarn</p></article>
      <article className="panel-card admin-metric"><span><Clock3 size={18}/></span><small>MISSIONS</small><strong>{tasksResult.error ? "—" : tasksResult.count ?? 0}</strong><p>Tous statuts confondus</p></article>
    </section>
    <section className="panel-card admin-review-panel">
      <div className="admin-section-heading"><div><div className="eyebrow">FILE DE MODÉRATION</div><h2>Participations à examiner</h2></div><span>{attempts.length} affichée(s) · max. 50</span></div>
      {attempts.length === 0 ? <div className="admin-empty"><ClipboardCheck size={26}/><b>Aucune participation en attente</b><p>Les nouveaux envois apparaîtront ici après connexion de la base.</p></div> : <div className="admin-review-list">
        {attempts.map(attempt => <article className="admin-review-item" key={attempt.id}>
          <div className="admin-review-top"><span className={`submission-state state-${attempt.status}`}>{attempt.status === "under_review" ? "En vérification" : "Nouvelle participation"}</span><small>{dateLabel(attempt.submitted_at)}</small></div>
          <h3>{attempt.task?.title ?? "Mission sans titre"}</h3>
          <p className="admin-member-name">Participant : {names.get(attempt.user_id) ?? "Compte AdEarn"}</p>
          <div className="admin-submission-text">{attempt.submission_data?.response || "Aucun texte fourni."}</div>
          <div className="admin-review-bottom"><small>Référence {attempt.id.slice(0, 8).toUpperCase()}</small><Link href={`/tasks/${attempt.task_id}`}>Ouvrir la mission <ArrowUpRight size={14}/></Link></div>
        </article>)}
      </div>}
    </section>
  </PortalShell>;
}
