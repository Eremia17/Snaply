import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, ClipboardList, Clock3, FileCheck2, ShieldCheck } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Attempt = {
  id: string;
  task_id: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  task: { title: string; category: string } | null;
};

const statusCopy: Record<Attempt["status"], { label: string; detail: string }> = {
  submitted: { label: "Envoyée", detail: "Votre participation attend une première vérification." },
  under_review: { label: "En vérification", detail: "L'équipe examine les éléments transmis." },
  approved: { label: "Approuvée", detail: "La participation a été validée. Le crédit dépend de son inscription au registre." },
  rejected: { label: "Non validée", detail: "Consultez le motif éventuel et les consignes de la mission." },
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function SubmissionsPage() {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const { data, error } = await supabase
    .from("task_attempts")
    .select("id, task_id, status, submitted_at, reviewed_at, review_note, task:tasks(title, category)")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  const attempts = (data ?? []) as unknown as Attempt[];

  return <PortalShell active="/submissions">
    <section className="welcome-row"><div><div className="eyebrow">SUIVI DE VOS MISSIONS</div><h1>Mes <em>participations.</em></h1><p>Retrouvez vos envois et leur état de vérification.</p></div><Link href="/tasks" className="portal-primary">Voir les missions <ArrowUpRight size={16}/></Link></section>
    {error ? <div className="auth-feedback auth-error" role="alert">Impossible de charger l'historique pour le moment. Vérifiez que le schéma AdEarn a été installé.</div> : attempts.length === 0 ? (
      <section className="panel-card submissions-empty"><span><ClipboardList size={30}/></span><h2>Aucune participation pour le moment</h2><p>Quand vous enverrez votre première réponse à une mission, son suivi apparaîtra ici.</p><Link href="/tasks" className="portal-primary">Explorer le catalogue <ArrowUpRight size={15}/></Link></section>
    ) : (
      <section className="submissions-list">
        {attempts.map(attempt => {
          const state = statusCopy[attempt.status] ?? statusCopy.submitted;
          return <article className="panel-card submission-card" key={attempt.id}>
            <div className="submission-card-top"><span className={`submission-state state-${attempt.status}`}>{attempt.status === "approved" ? <BadgeCheck size={14}/> : attempt.status === "rejected" ? <FileCheck2 size={14}/> : <Clock3 size={14}/>} {state.label}</span><small>REF. {attempt.id.slice(0, 8).toUpperCase()}</small></div>
            <h2>{attempt.task?.title ?? "Mission AdEarn"}</h2>
            <p>{state.detail}</p>
            <div className="submission-card-meta"><span>Envoyée le {dateLabel(attempt.submitted_at)}</span>{attempt.reviewed_at && <span>Examinée le {dateLabel(attempt.reviewed_at)}</span>}</div>
            {attempt.review_note && <div className="submission-review-note"><ShieldCheck size={15}/><span>{attempt.review_note}</span></div>}
            <Link href={`/tasks/${attempt.task_id}`} className="submission-open">Voir la mission <ArrowUpRight size={14}/></Link>
          </article>;
        })}
      </section>
    )}
  </PortalShell>;
}
