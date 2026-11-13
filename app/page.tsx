import Link from "next/link";
import { ArrowRight, ArrowUpRight, AudioLines, BadgeCheck, BookOpenCheck, Clock3, Compass, Headphones, Layers3, ListChecks, MessageSquareText, ScanSearch, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Task = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  reward_amount: number | string;
  currency_code: string;
  estimated_minutes: number | null;
};

const categories = [
  { id: "audio", title: "Audio & voix", detail: "Écoute, transcription, annotation", icon: AudioLines, tone: "blue" },
  { id: "survey", title: "Sondages", detail: "Questionnaires et avis", icon: MessageSquareText, tone: "violet" },
  { id: "microtask", title: "Micro-tâches", detail: "Petites missions structurées", icon: Layers3, tone: "cyan" },
  { id: "video", title: "Vérification", detail: "Contrôle et classification", icon: ScanSearch, tone: "orange" },
];

function rewardLabel(amount: number | string, currency: string) {
  const value = Number(amount);
  try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value); }
  catch { return `${value.toLocaleString("fr-FR")} ${currency}`; }
}

export default async function Home() {
  let tasks: Task[] = [];
  let catalogReady = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("tasks")
        .select("id, slug, title, description, category, reward_amount, currency_code, estimated_minutes")
        .order("published_at", { ascending: false }).limit(3);
      if (!error && data) { tasks = data as Task[]; catalogReady = true; }
    } catch { catalogReady = false; }
  }

  return (
    <main className="ad-home">
      <div className="ad-grid-glow" aria-hidden="true"/>
      <header className="ad-topbar">
        <Link href="/" className="ad-logo"><span className="ad-logo-icon"><Zap size={19} fill="currentColor"/></span><span>adearn<span className="ad-logo-blue">.</span></span></Link>
        <nav className="ad-main-nav"><a href="#missions">Missions</a><a href="#categories">Catégories</a><a href="#how">Fonctionnement</a></nav>
        <div className="ad-top-actions"><Link href="/login" className="ad-login">Connexion</Link><Link href="/register" className="ad-join">Créer un compte <ArrowUpRight size={15}/></Link></div>
      </header>

      <section className="ad-hero">
        <div className="ad-hero-copy">
          <div className="ad-overline"><span className="ad-live-indicator"/> MICRO-TÂCHES · MADAGASCAR & INTERNATIONAL</div>
          <h1>Chaque mission<br/>commence par <span>vous.</span></h1>
          <p>Un espace clair pour découvrir des missions, réaliser des tâches utiles et suivre chaque participation sans zones floues.</p>
          <div className="ad-hero-buttons"><Link href="/tasks" className="ad-button-primary">Explorer les missions <ArrowRight size={17}/></Link><Link href="/register" className="ad-button-quiet">Rejoindre AdEarn</Link></div>
          <div className="ad-hero-assurance"><span><ShieldCheck size={15}/> Missions encadrées</span><span><BadgeCheck size={15}/> Validation traçable</span></div>
        </div>
        <div className="ad-hero-console">
          <div className="ad-console-orbit ad-orbit-a"/><div className="ad-console-orbit ad-orbit-b"/>
          <div className="ad-console-card">
            <div className="ad-console-head"><div className="ad-console-brand"><span><Zap size={12} fill="currentColor"/></span> ADEARN <small>WORKSPACE / 01</small></div><span className="ad-console-avatar">A</span></div>
            <div className="ad-console-welcome"><div><small>VOTRE ESPACE DE TRAVAIL</small><h2>Tout est à sa place.</h2></div><span className="ad-console-status"><i/> EN LIGNE</span></div>
            <div className="ad-console-metrics"><div><small>RÉCOMPENSES CONFIRMÉES</small><strong>— <em>MGA</em></strong><span><Wallet size={12}/> Registre sécurisé</span></div><div><small>PARTICIPATIONS</small><strong>—</strong><span><ListChecks size={12}/> Suivi personnel</span></div></div>
            <div className="ad-console-section"><b>Parcourir les missions</b><Link href="/tasks">Catalogue <ArrowUpRight size={13}/></Link></div>
            {categories.slice(0,3).map((category,index)=>{const Icon=category.icon;return <div className="ad-console-category" key={category.id}><span className={`ad-category-glyph ${category.tone}`}><Icon size={16}/></span><span><b>{category.title}</b><small>{category.detail}</small></span><span className="ad-console-number">0{index+1}</span></div>;})}
            <div className="ad-console-foot"><span><span className="ad-foot-dot"/> DONNÉES RÉELLES UNIQUEMENT</span><ShieldCheck size={13}/></div>
          </div>
          <div className="ad-floating-note"><span><BadgeCheck size={16}/></span><div><b>La transparence d'abord</b><small>Pas de mission fictive. Pas de solde inventé.</small></div></div>
        </div>
      </section>

      <section className="ad-value-strip"><div><span><Compass size={17}/></span><b>Choisissez</b><small>Des missions bien décrites</small></div><div><span><Clock3 size={17}/></span><b>Réalisez</b><small>Des consignes compréhensibles</small></div><div><span><BadgeCheck size={17}/></span><b>Faites vérifier</b><small>Un suivi à chaque étape</small></div><div><span><Wallet size={17}/></span><b>Suivez vos gains</b><small>Confirmés et en attente séparés</small></div></section>

      <section className="ad-section" id="categories">
        <div className="ad-section-heading"><div><div className="ad-overline">UN CATALOGUE ORGANISÉ</div><h2>Choisissez votre<br/><span>terrain de jeu.</span></h2></div><p>Des formats variés, avec des critères de validation annoncés avant chaque participation.</p></div>
        <div className="ad-category-grid">{categories.map(category=>{const Icon=category.icon;return <Link href="/tasks" className="ad-category-card" key={category.id}><div className="ad-category-card-top"><span className={`ad-category-glyph ${category.tone}`}><Icon size={22}/></span><span className="ad-card-arrow"><ArrowUpRight size={17}/></span></div><h3>{category.title}</h3><p>{category.detail}</p><span className="ad-category-bottom">EXPLORER <ArrowRight size={13}/></span></Link>;})}</div>
      </section>

      <section className="ad-section ad-mission-section" id="missions">
        <div className="ad-section-heading"><div><div className="ad-overline">LE FLUX DES MISSIONS</div><h2>À vous de <span>contribuer.</span></h2></div><Link href="/tasks" className="ad-view-all">Ouvrir le catalogue <ArrowUpRight size={16}/></Link></div>
        {tasks.length>0 ? <div className="ad-live-missions">{tasks.map(task=><article className="ad-live-card" key={task.id}><div className="ad-live-card-top"><span className="ad-live-tag"><i/> PUBLIÉE</span><span className="ad-task-type">{task.category}</span></div><h3>{task.title}</h3><p>{task.description}</p><div className="ad-live-card-meta"><span><Clock3 size={14}/>{task.estimated_minutes?task.estimated_minutes+" min":"Durée variable"}</span><strong>{rewardLabel(task.reward_amount,task.currency_code)}</strong></div><Link href={`/tasks/${task.id}`}>Voir la mission <ArrowRight size={14}/></Link></article>)}</div> : <div className="ad-empty-feed"><div className="ad-empty-icon"><Layers3 size={25}/><span><Sparkles size={13}/></span></div><div><div className="ad-overline">{catalogReady?"CATALOGUE OUVERT":"MISES EN PLACE EN COURS"}</div><h3>{catalogReady?"Aucune mission publiée pour le moment.":"Les premières missions se préparent."}</h3><p>Nous n'affichons pas de tâches fictives. Une mission apparaîtra ici lorsque son partenaire, ses critères de validation et son budget de récompense seront confirmés.</p></div><Link href="/tasks" className="ad-outline-button">Voir le catalogue <ArrowRight size={15}/></Link></div>}
      </section>

      <section className="ad-how" id="how"><div className="ad-how-intro"><div className="ad-overline">COMMENT ÇA MARCHE</div><h2>Simple à utiliser.<br/><span>Facile à suivre.</span></h2><p>Une expérience conçue pour que vous sachiez toujours où en est votre participation.</p></div><div className="ad-how-steps"><article><span>01</span><div><Headphones size={19}/></div><h3>Découvrez</h3><p>Choisissez une mission et lisez ses conditions.</p></article><article><span>02</span><div><BookOpenCheck size={19}/></div><h3>Participez</h3><p>Réalisez la tâche et envoyez votre contribution.</p></article><article><span>03</span><div><BadgeCheck size={19}/></div><h3>Suivez</h3><p>Consultez la vérification et les récompenses confirmées.</p></article></div></section>

      <section className="ad-bottom-cta"><div className="ad-cta-mark"><Zap size={20} fill="currentColor"/></div><div><div className="ad-overline">VOTRE ESPACE VOUS ATTEND</div><h2>Prêt à découvrir AdEarn ?</h2><p>Créez votre compte et retrouvez vos missions au même endroit.</p></div><Link href="/register" className="ad-button-primary">Créer mon compte <ArrowRight size={16}/></Link></section>
      <footer className="ad-footer"><Link href="/" className="ad-logo"><span className="ad-logo-icon"><Zap size={17} fill="currentColor"/></span><span>adearn<span className="ad-logo-blue">.</span></span></Link><small>© 2026 ADEARN · PLATEFORME EN CONSTRUCTION</small><div><Link href="/help">Centre d'aide</Link><Link href="/login">Connexion</Link><Link href="/register">Inscription</Link></div></footer>
    </main>
  );
}
