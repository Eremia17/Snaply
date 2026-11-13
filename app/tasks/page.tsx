import Link from "next/link";
import { ArrowDownRight, ArrowLeft, BadgeCheck, Clock3, Compass, ShieldCheck } from "lucide-react";
import TaskCatalogue from "@/components/task-catalogue";
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
          <TaskCatalogue tasks={tasks}/>
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
