import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Clock3, FileText, ShieldCheck } from "lucide-react";
import { submitTask } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; submitted?: string }>;
};

type TaskDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_amount: number | string;
  currency_code: string;
  estimated_minutes: number | null;
  instructions: unknown;
  starts_at: string | null;
  ends_at: string | null;
};

const categoryLabels: Record<string, string> = {
  survey: "Sondage & étude",
  audio: "Audio & voix",
  microtask: "Micro-mission",
  video: "Vidéo sponsorisée",
};

function money(amount: number | string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString("fr-FR")} ${currency}`;
  }
}

const submissionErrors: Record<string, string> = {
  response: "Ajoutez une réponse ou une preuve (3 à 5 000 caractères).",
  duplicate: "Vous avez déjà envoyé une participation pour cette mission.",
  closed: "Cette mission n'accepte plus de soumission. Actualisez le catalogue.",
};

export default async function TaskDetailPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: taskData } = await supabase
    .from("tasks")
    .select("id, title, description, category, reward_amount, currency_code, estimated_minutes, instructions, starts_at, ends_at")
    .eq("id", id)
    .maybeSingle();

  if (!taskData) notFound();
  const task = taskData as TaskDetail;

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const signedIn = typeof userId === "string";
  let previousAttempt: { id: string; status: string } | null = null;

  if (signedIn) {
    const { data } = await supabase
      .from("task_attempts")
      .select("id, status")
      .eq("task_id", task.id)
      .eq("user_id", userId)
      .maybeSingle();
    previousAttempt = data;
  }

  const instructions = Array.isArray(task.instructions)
    ? task.instructions
        .map((item) => typeof item === "string" ? item : item && typeof item === "object" && "text" in item && typeof item.text === "string" ? item.text : null)
        .filter((item): item is string => Boolean(item))
    : [];
  const isNotStarted = task.starts_at ? new Date(task.starts_at).getTime() > Date.now() : false;

  return <main className="task-detail-page">
    <header className="nav-wrap">
      <Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link>
      <div className="catalog-nav-actions"><Link href="/login" className="nav-login">Connexion</Link><Link href="/tasks" className="back-link"><ArrowLeft size={16}/> Catalogue</Link></div>
    </header>
    <div className="task-detail-wrap">
      <Link href="/tasks" className="task-back"><ArrowLeft size={15}/> Retour aux missions</Link>
      <section className="task-detail-hero">
        <div className="task-detail-tags"><span className="task-category">{categoryLabels[task.category] ?? "Mission"}</span><span className="task-live-dot">OFFRE PUBLIÉE</span></div>
        <h1>{task.title}</h1>
        <p>{task.description}</p>
        <div className="task-detail-reward"><div><small>RÉCOMPENSE ANNONCÉE</small><strong>{money(task.reward_amount, task.currency_code)}</strong></div><span><Clock3 size={15}/>{task.estimated_minutes ? `${task.estimated_minutes} minutes estimées` : "Durée variable"}</span></div>
      </section>
      <div className="task-detail-grid">
        <section className="task-instructions panel-card">
          <div className="eyebrow">AVANT DE COMMENCER</div>
          <h2>Les consignes</h2>
          {instructions.length > 0 ? <ol>{instructions.map((item, index) => <li key={index}>{item}</li>)}</ol> : <p>Les consignes détaillées seront communiquées par le partenaire avant le début de la mission.</p>}
          <div className="task-trust-note"><ShieldCheck size={18}/><span>La récompense est créditée uniquement après vérification de la participation par AdEarn.</span></div>
        </section>
        <section className="task-submit-card panel-card">
          <div className="eyebrow">VOTRE PARTICIPATION</div>
          <h2>Envoyer une réponse</h2>
          {query.submitted === "1" && <div className="auth-feedback auth-success" role="status">Participation envoyée. Elle apparaîtra dans votre espace après enregistrement.</div>}
          {query.error && <div className="auth-feedback auth-error" role="alert">{submissionErrors[query.error] ?? "Impossible d'envoyer la participation."}</div>}
          {previousAttempt ? (
            <div className="attempt-existing"><BadgeCheck size={22}/><b>Participation déjà envoyée</b><p>Statut : {previousAttempt.status === "approved" ? "Approuvée" : previousAttempt.status === "rejected" ? "Refusée" : previousAttempt.status === "under_review" ? "En cours de vérification" : "En attente de vérification"}.</p></div>
          ) : isNotStarted ? (
            <div className="task-date-note">Cette mission n'a pas encore commencé. Le formulaire s'ouvrira à la date prévue.</div>
          ) : signedIn ? (
            <>
              <p>Respectez les consignes et ajoutez votre réponse ou une preuve textuelle. Les envois sont contrôlés avant toute récompense.</p>
              <form action={submitTask} className="task-submit-form">
                <input type="hidden" name="taskId" value={task.id}/>
                <label htmlFor="response">Votre réponse / preuve</label>
                <textarea id="response" name="response" rows={6} minLength={3} maxLength={5000} placeholder="Décrivez votre participation ou ajoutez les informations demandées…" required/>
                <small className="task-proof-limit">Preuve textuelle uniquement dans cette version. Les missions nécessitant un fichier ne doivent pas être publiées avant l’activation du dépôt sécurisé.</small>
                <button type="submit" className="auth-submit">Envoyer ma participation <ArrowUpRight size={16}/></button>
              </form>
            </>
          ) : (
            <div className="task-signin-prompt"><p>Connectez-vous pour participer à cette mission. Vous pourrez suivre le résultat depuis votre espace personnel.</p><Link href="/login" className="auth-submit">Se connecter <ArrowUpRight size={16}/></Link><Link href="/register" className="task-create-account">Créer un compte</Link></div>
          )}
        </section>
      </div>
      <div className="task-detail-foot"><FileText size={15}/> Une participation envoyée n'est pas une récompense validée. La vérification doit être terminée avant tout crédit.</div>
    </div>
  </main>;
}
