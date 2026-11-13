import { redirect } from "next/navigation";
import { Archive, FolderKanban, Pause, ShieldCheck, Sparkles } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { changeAdminTaskStatus, saveAdminTask } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Task = {
  id: string; slug: string; provider_id: string | null; title: string; description: string; category: "survey" | "audio" | "microtask" | "video";
  reward_amount: number | string; currency_code: string; estimated_minutes: number | null;
  instructions: string[] | null; status: "draft" | "published" | "paused" | "archived"; created_at: string;
};
type ProviderOption = { id: string; name: string };
type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

const statusLabels: Record<Task["status"], string> = {
  draft: "Brouillon", published: "Publié", paused: "En pause", archived: "Archivé",
};
const messages: Record<string, string> = {
  invalid: "Vérifie les champs : titre, description, catégorie, récompense et devise.",
  save: "Impossible d'enregistrer. Vérifie que le schéma AdEarn mis à jour est installé.",
  status: "Le changement de statut a échoué. Actualise la page.",
};
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export default async function AdminTasksPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard?error=forbidden");

  const [tasksResult, providersResult] = await Promise.all([supabase.from("tasks")
    .select("id, slug, provider_id, title, description, category, reward_amount, currency_code, estimated_minutes, instructions, status, created_at")
    .order("created_at", { ascending: false }).limit(100), supabase.from("ad_providers").select("id, name").eq("status", "active").eq("incentivized_tasks_allowed", true).order("name")]);
  const { data, error } = tasksResult;
  const tasks = (data ?? []) as Task[];
  const providers = (providersResult.data ?? []) as ProviderOption[];

  return <PortalShell active="/admin/tasks">
    <section className="welcome-row">
      <div><div className="eyebrow">STUDIO ADMINISTRATEUR</div><h1>Gestion des <em>missions.</em></h1><p>Préparez le catalogue, modifiez les brouillons et contrôlez les missions existantes.</p></div>
      <span className="admin-secure-label"><ShieldCheck size={15}/> ACCÈS ADMINISTRATEUR</span>
    </section>
    <div className="admin-task-safety"><ShieldCheck size={17}/><span><b>Publication verrouillée volontairement.</b> Les missions créées restent en brouillon. Aucune mission rémunérée ne sera publiée sans partenaire autorisé, preuve de financement et validation du système de récompenses.</span></div>
    {query.saved === "created" && <div className="auth-feedback auth-success" role="status">Brouillon créé et ajouté au journal d'audit.</div>}
    {query.saved === "updated" && <div className="auth-feedback auth-success" role="status">Brouillon mis à jour.</div>}
    {query.saved === "status" && <div className="auth-feedback auth-success" role="status">Statut de la mission mis à jour et journalisé.</div>}
    {query.error && <div className="auth-feedback auth-error" role="alert">{messages[query.error] ?? "Une erreur est survenue."}</div>}
    {error && <div className="auth-feedback auth-error" role="alert">La liste des missions est indisponible. Vérifie les autorisations de la base AdEarn.</div>}
    <section className="admin-task-studio">
      <article className="panel-card admin-task-form-card">
        <div className="eyebrow">NOUVEAU CONTENU</div><h2 className="admin-panel-title">Créer un brouillon</h2>
        <p className="admin-panel-copy">Prépare une fiche de mission. Elle ne sera pas visible dans le catalogue public.</p>
        <form action={saveAdminTask} className="admin-task-form">
          <label>Titre de la mission<input name="title" minLength={5} maxLength={140} required placeholder="Ex. Questionnaire de satisfaction"/></label>
          <label>Partenaire autorisé<select name="providerId" defaultValue=""><option value="">Sans partenaire lié</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
          <label>Catégorie<select name="category" defaultValue="survey"><option value="survey">Sondage</option><option value="audio">Audio</option><option value="microtask">Micro-tâche</option><option value="video">Vidéo</option></select></label>
          <label>Description<textarea className="task-form-description" name="description" minLength={10} maxLength={6000} required placeholder="Décris précisément l'objectif et le contexte de la mission."/></label>
          <div className="admin-task-form-grid">
            <label>Récompense indicative<input name="rewardAmount" type="number" min="0.01" step="0.01" required placeholder="0.00"/></label>
            <label>Devise (code ISO)<input name="currencyCode" defaultValue="USD" maxLength={3} required/></label>
          </div>
          <label>Durée estimée (minutes)<input name="estimatedMinutes" type="number" min="1" max="1440" placeholder="Facultatif"/></label>
          <label>Instructions (une étape par ligne)<textarea name="instructions" maxLength={6000} placeholder={"Lire les consignes\nEffectuer la tâche\nEnvoyer une preuve"}/></label>
          <button className="auth-submit" type="submit"><Sparkles size={15}/> Enregistrer le brouillon</button>
        </form>
      </article>
      <article className="panel-card admin-task-list-card">
        <div className="admin-section-heading"><div><div className="eyebrow">CATALOGUE INTERNE</div><h2>Missions enregistrées</h2></div><span>{tasks.length} / 100</span></div>
        {!tasks.length ? <div className="admin-task-empty"><FolderKanban size={27}/><br/>Aucune mission enregistrée.<br/>Les nouveaux brouillons apparaîtront ici.</div> : <div className="admin-task-list">
          {tasks.map(task => <article className="admin-task-item" key={task.id}>
            <div className="admin-task-item-top"><span className="submission-state">{statusLabels[task.status]}</span><small>{dateLabel(task.created_at)}</small></div>
            <h3>{task.title}</h3><p>{task.description}</p>
            <div className="admin-task-item-meta"><span>{task.category}</span><span>{Number(task.reward_amount).toFixed(2)} {task.currency_code} · indicatif</span><span>{task.estimated_minutes ? `${task.estimated_minutes} min` : "Durée libre"}</span></div>
            {task.status === "draft" && <details className="admin-task-edit"><summary>Modifier le brouillon</summary>
              <form action={saveAdminTask} className="admin-task-form" style={{ marginTop: 14 }}>
                <input type="hidden" name="taskId" value={task.id}/>
                <label>Titre<input name="title" defaultValue={task.title} minLength={5} maxLength={140} required/></label>
                <label>Partenaire autorisé<select name="providerId" defaultValue={task.provider_id ?? ""}><option value="">Sans partenaire lié</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
                <label>Catégorie<select name="category" defaultValue={task.category}><option value="survey">Sondage</option><option value="audio">Audio</option><option value="microtask">Micro-tâche</option><option value="video">Vidéo</option></select></label>
                <label>Description<textarea className="task-form-description" name="description" defaultValue={task.description} minLength={10} maxLength={6000} required/></label>
                <div className="admin-task-form-grid">
                  <label>Récompense indicative<input name="rewardAmount" type="number" min="0.01" step="0.01" defaultValue={task.reward_amount} required/></label>
                  <label>Devise<input name="currencyCode" defaultValue={task.currency_code} maxLength={3} required/></label>
                </div>
                <label>Durée estimée (minutes)<input name="estimatedMinutes" type="number" min="1" max="1440" defaultValue={task.estimated_minutes ?? ""}/></label>
                <label>Instructions<textarea name="instructions" defaultValue={(task.instructions ?? []).join("\n")}/></label>
                <button className="auth-submit" type="submit">Enregistrer les modifications</button>
              </form>
            </details>}
            {task.status !== "archived" && <div className="admin-task-status-actions">
              {task.status !== "paused" && <form action={changeAdminTaskStatus}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="status" value="paused"/><button type="submit"><Pause size={13}/> Mettre en pause</button></form>}
              <form action={changeAdminTaskStatus}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="status" value="archived"/><button type="submit"><Archive size={13}/> Archiver</button></form>
            </div>}
          </article>)}
        </div>}
      </article>
    </section>
  </PortalShell>;
}
