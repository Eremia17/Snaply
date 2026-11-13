import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, BadgeCheck, Clock3, Compass, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Task = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "survey" | "audio" | "microtask" | "video";
  reward_amount: number | string;
  currency_code: string;
  estimated_minutes: number | null;
  starts_at: string | null;
};

const categoryLabels: Record<Task["category"], string> = {
  survey: "Sondage & étude",
  audio: "Audio & voix",
  microtask: "Micro-mission",
  video: "Vidéo sponsorisée",
};

function rewardLabel(amount: number | string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString("fr-FR")} ${currency}`;
  }
}

export default async function TasksPage() {
  let tasks: Task[] = [];
  const configured = isSupabaseConfigured();
  let catalogError = false;

  if (configured) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, slug, title, description, category, reward_amount, currency_code, estimated_minutes, starts_at")
      .order("published_at", { ascending: false });
    catalogError = Boolean(error);
    if (!error && data) tasks = data as Task[];
  }

  return (
    <main className="catalog-page">
      <header className="nav-wrap">
        <Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link>
        <div className="catalog-nav-actions">
          <Link href="/login" className="nav-login">Connexion</Link>
          <Link href="/register" className="nav-cta">Créer un compte</Link>
          <Link href="/" className="back-link"><ArrowLeft size={16}/> Accueil</Link>
        </div>
      </header>
      <section className="catalog-hero">
        <div className="eyebrow">ADEARN / LE CATALOGUE</div>
        <h1>Les bonnes missions<br/><em>prennent du temps.</em></h1>
        <p>Des missions détaillées, des critères visibles et des récompenses annoncées sans ambiguïté.</p>
        <div className="catalog-status"><span className="status-orb"/>{tasks.length > 0 ? `${tasks.length} MISSION(S) PUBLIÉE(S)` : catalogError ? "CATALOGUE INDISPONIBLE" : "CATALOGUE EN PRÉPARATION"}</div>
      </section>
      {tasks.length > 0 ? (
        <section className="live-task-section">
          <div className="live-task-heading"><div><div className="eyebrow">OFFRES PUBLIÉES</div><h2>À vous de jouer<span>.</span></h2></div><span>{tasks.length} offre{tasks.length > 1 ? "s" : ""}</span></div>
          <div className="live-task-grid">
            {tasks.map(task => (
              <article className="live-task-card" key={task.id}>
                <div className="live-task-card-top"><span className={`task-category category-${task.category}`}>{categoryLabels[task.category]}</span><span className="task-live-dot">{task.starts_at && new Date(task.starts_at).getTime() > Date.now() ? "À VENIR" : "DISPONIBLE"}</span></div>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <div className="live-task-meta"><span><Clock3 size={14}/>{task.estimated_minutes ? `${task.estimated_minutes} min` : "Durée variable"}</span><strong>{rewardLabel(task.reward_amount, task.currency_code)}</strong></div>
                <Link href={`/tasks/${task.id}`} className="live-task-link">Voir les détails <ArrowUpRight size={15}/></Link>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="empty-catalog">
          <div className="empty-art"><div className="empty-orbit orbit-a">✳</div><div className="empty-orbit orbit-b">✦</div><div className="empty-card"><Compass size={35}/><span>YOUR NEXT<br/>OPPORTUNITY</span><b>COMING SOON</b></div></div>
          <div className="empty-copy">
            <div className="eyebrow">{configured ? "UNE PETITE PAUSE AVANT LE DÉPART" : "CONFIGURATION EN COURS"}</div>
            <h2>{configured ? <>On prépare quelque chose de <em>sérieux.</em></> : <>Le catalogue arrive <em>bientôt.</em></>}</h2>
            <p>{catalogError ? "La base du catalogue ne répond pas encore. Vérifiez que le schéma AdEarn a été installé et que la table tasks est exposée à la Data API." : configured ? "Aucune mission rémunérée n'est publiée pour le moment. Chaque offre devra afficher son partenaire, ses critères de validation, sa récompense, son délai et ses conditions." : "Le catalogue sera alimenté après la connexion de la base AdEarn. Aucune mission fictive n'est affichée."}</p>
            <div className="empty-rules"><span><BadgeCheck size={17}/> Partenaire vérifié</span><span><Clock3 size={17}/> Délais affichés</span><span><ShieldCheck size={17}/> Récompenses confirmées</span></div>
            <Link href="/" className="btn-dark">Retourner à l'accueil <ArrowDownRight size={17}/></Link>
          </div>
        </section>
      )}
      <footer className="footer-premium"><Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link><span>© 2026 ADEARN — TRANSPARENCE AVANT TOUT</span><Link href="/">Accueil ↗</Link></footer>
    </main>
  );
}
