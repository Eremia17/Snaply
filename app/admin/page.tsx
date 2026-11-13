import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Check, ClipboardCheck, Clock3, ShieldCheck, Users, X } from "lucide-react";
import { reviewTaskAttempt } from "@/app/auth/actions";
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

type Props = {
  searchParams: Promise<{ error?: string; reviewed?: string }>;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const errorMessages: Record<string, string> = {
  invalid: "La demande de modération est invalide.",
  note: "La note de modération dépasse 2 000 caractères.",
  review: "Impossible d'enregistrer cette décision. Vérifiez le schéma SQL et réessayez.",
  "already-reviewed": "Cette participation a déjà été examinée. Actualisez la page.",
};

export default async function AdminPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const query = await searchParams;
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
    : { data: [] as { id: string; display_name: string }[], error: null };
  const names = new Map((profileResult.data ?? []).map(member => [member.id, member.display_name]));
  const hasError = Boolean(attemptsResult.error || membersResult.error || tasksResult.error || profileResult.error);

  return <PortalShell active="/admin">
    <section className="welcome-row"><div><div className="eyebrow">ESPACE DE GESTION PRIVÉ</div><h1>Centre de <em>contrôle.</em></h1><p>Examinez les preuves et consignez chaque décision de modération.</p></div><span className="admin-secure-label"><ShieldCheck size={15}/> ACCÈS ADMINISTRATEUR</span></section>
    <div className="admin-readonly-note"><ShieldCheck size={18}/><span><b>Modération sécurisée — sans paiement automatique.</b> Approuver confirme uniquement la validité de la participation. Aucun crédit n'est ajouté au portefeuille tant qu'un partenaire et un budget de récompenses vérifiés ne sont pas configurés.</span></div>
    {query.reviewed === "approved" && <div className="auth-feedback auth-success" role="status">Participation approuvée. La décision a été enregistrée dans le journal d'audit. Aucun argent n'a été crédité.</div>}
    {query.reviewed === "rejected" && <div className="auth-feedback auth-success" role="status">Participation refusée. La décision a été enregistrée dans le journal d'audit.</div>}
    {query.error && <div className="auth-feedback auth-error" role="alert">{errorMessages[query.error] ?? "Une erreur est survenue."}</div>}
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
          <form action={reviewTaskAttempt} className="admin-decision-form">
            <input type="hidden" name="attemptId" value={attempt.id}/>
            <label htmlFor={`note-${attempt.id}`}>Note interne (facultative)</label>
            <textarea id={`note-${attempt.id}`} name="note" rows={2} maxLength={2000} placeholder="Motif ou commentaire de modération…"/>
            <div className="admin-decision-actions">
              <button type="submit" name="decision" value="approved" className="admin-approve-button"><Check size={15}/> Approuver la participation</button>
              <button type="submit" name="decision" value="rejected" className="admin-reject-button"><X size={15}/> Refuser</button>
            </div>
          </form>
        </article>)}
      </div>}
    </section>
  </PortalShell>;
}
