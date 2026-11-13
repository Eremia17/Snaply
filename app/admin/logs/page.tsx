import { redirect } from "next/navigation";
import { Activity, ClipboardCheck, FolderKanban, ShieldCheck, Wallet } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  task_created_as_draft: "Brouillon de mission créé",
  task_updated: "Mission modifiée",
  task_attempt_approved: "Participation approuvée",
  task_attempt_rejected: "Participation refusée",
  provider_created_pending: "Partenaire ajouté en attente",
  provider_updated: "Dossier partenaire modifié",
};

function describeDetails(details: Record<string, unknown>) {
  const title = typeof details.title === "string" ? details.title : null;
  const decision = typeof details.decision === "string" ? details.decision : null;
  const note = typeof details.note === "string" ? details.note : null;
  if (title) return title;
  if (decision) return `Décision : ${decision}${note ? ` · Note : ${note}` : ""}`;
  const before = details.before && typeof details.before === "object" ? details.before as Record<string, unknown> : null;
  const after = details.after && typeof details.after === "object" ? details.after as Record<string, unknown> : null;
  if (before || after) {
    const oldTitle = typeof before?.title === "string" ? before.title : "Mission";
    const newTitle = typeof after?.title === "string" ? after.title : oldTitle;
    const status = typeof after?.status === "string" ? after.status : null;
    return `${oldTitle === newTitle ? newTitle : `${oldTitle} → ${newTitle}`}${status ? ` · ${status}` : ""}`;
  }
  return "Détails enregistrés dans le journal.";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function iconFor(entity: string) {
  if (entity === "task_attempt") return ClipboardCheck;
  if (entity === "task") return FolderKanban;
  if (entity === "withdrawal") return Wallet;
  return Activity;
}

export default async function AdminAuditPage() {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard?error=forbidden");

  const { data, error } = await supabase.from("admin_logs")
    .select("id, actor_id, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false }).limit(100);
  const logs = (data ?? []) as AuditLog[];

  return <PortalShell active="/admin/logs">
    <section className="welcome-row">
      <div><div className="eyebrow">TRAÇABILITÉ & CONFORMITÉ</div><h1>Journal d’<em>audit.</em></h1><p>Un historique chronologique des actions administratives enregistrées dans AdEarn.</p></div>
      <span className="admin-secure-label"><ShieldCheck size={15}/> ACCÈS ADMINISTRATEUR</span>
    </section>
    <div className="admin-readonly-note"><ShieldCheck size={18}/><span><b>Journal en lecture seule.</b> Les événements sont écrits par les opérations serveur et les déclencheurs PostgreSQL. Cette page ne permet ni de modifier ni de supprimer une trace.</span></div>
    {error ? <div className="auth-feedback auth-error" role="alert">Le journal n’est pas accessible. Vérifie les permissions administrateur de Supabase.</div> : null}
    <section className="panel-card admin-audit-panel">
      <div className="admin-section-heading"><div><div className="eyebrow">DERNIÈRES ACTIVITÉS</div><h2>Historique des opérations</h2></div><span>{logs.length} / 100</span></div>
      {logs.length === 0 ? <div className="admin-audit-empty"><Activity size={28}/><b>Aucune activité enregistrée</b><br/>Les créations et décisions administratives apparaîtront ici.</div> : <div className="admin-audit-list">
        {logs.map(log => {
          const Icon = iconFor(log.entity_type);
          return <article className="admin-audit-row" key={log.id}>
            <span className="admin-audit-icon"><Icon size={17}/></span>
            <div className="admin-audit-copy"><strong>{actionLabels[log.action] ?? log.action.replaceAll("_", " ")}</strong><p>{describeDetails(log.details ?? {})}</p><small>{log.entity_type.replaceAll("_", " ")} · {log.entity_id ? log.entity_id.slice(0, 8).toUpperCase() : "Sans référence"} · {log.actor_id ? `Acteur ${log.actor_id.slice(0, 8).toUpperCase()}` : "Système"}</small></div>
            <time className="admin-audit-date" dateTime={log.created_at}>{dateLabel(log.created_at)}</time>
          </article>;
        })}
      </div>}
    </section>
  </PortalShell>;
}
