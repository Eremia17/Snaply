import Link from "next/link";
import {
  ArrowRight, AudioLines, BadgeCheck, BookOpenCheck, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, Compass, FileCheck2, Filter,
  Headphones, LayoutDashboard, ListChecks, LockKeyhole, Menu,
  MessageSquareText, Mic2, Search, ShieldCheck, Sparkles, Wallet,
  Zap, ClipboardCheck, ScanSearch, Languages
} from "lucide-react";

const categories = [
  { icon: AudioLines, name: "Audio & voix", detail: "Écoute, transcription, classement", tone: "violet" },
  { icon: ScanSearch, name: "Vérification", detail: "Contrôle et validation de données", tone: "cyan" },
  { icon: MessageSquareText, name: "Sondages", detail: "Avis et questionnaires", tone: "orange" },
  { icon: BookOpenCheck, name: "Classification", detail: "Trier et annoter des contenus", tone: "green" },
  { icon: Languages, name: "Langues", detail: "Petites contributions linguistiques", tone: "pink" },
  { icon: ClipboardCheck, name: "Micro-tâches", detail: "Actions courtes et précises", tone: "blue" },
];

const workflow = [
  { icon: Compass, number: "01", title: "Choisissez", text: "Parcourez les missions et vérifiez les conditions avant de commencer." },
  { icon: ListChecks, number: "02", title: "Réalisez", text: "Suivez les consignes et envoyez votre travail pour vérification." },
  { icon: Wallet, number: "03", title: "Suivez vos gains", text: "Consultez séparément les récompenses en attente et celles confirmées." },
];

export default function Home() {
  return (
    <main className="market-shell">
      <header className="market-topbar">
        <Link href="/" className="market-brand"><span className="market-brand-mark"><Zap size={19} fill="currentColor" /></span><span>ad<span>earn</span><i>.</i></span></Link>
        <nav className="market-nav" aria-label="Navigation principale">
          <a className="is-current" href="#missions">Missions</a>
          <a href="#categories">Catégories</a>
          <a href="#how-it-works">Comment ça marche</a>
        </nav>
        <div className="market-top-actions">
          <Link href="/login" className="market-login">Connexion</Link>
          <Link href="/register" className="market-signup">Créer un compte <ArrowRight size={15}/></Link>
        </div>
      </header>

      <section className="market-hero">
        <div className="market-hero-copy">
          <div className="market-eyebrow"><span className="market-pulse"/> PLATEFORME DE MICRO-TÂCHES</div>
          <h1>Des petites tâches.<br/><span>Un vrai suivi.</span></h1>
          <p>Découvrez des missions courtes, comprenez les règles avant de commencer et suivez chaque soumission depuis un seul espace.</p>
          <div className="market-hero-actions">
            <Link href="/tasks" className="market-primary">Explorer les missions <ArrowRight size={17}/></Link>
            <Link href="/register" className="market-secondary">Rejoindre AdEarn</Link>
          </div>
          <div className="market-trust-row"><span><ShieldCheck size={15}/> Règles transparentes</span><span><BadgeCheck size={15}/> Partenaires vérifiés</span></div>
        </div>
        <div className="market-preview" aria-label="Aperçu de l'espace de travail AdEarn">
          <div className="preview-window">
            <div className="preview-head"><div className="preview-brand"><span><Zap size={13} fill="currentColor"/></span> AdEarn <small>ESPACE DE TRAVAIL</small></div><div className="preview-avatar">A</div></div>
            <div className="preview-welcome"><div><small>VOTRE ESPACE</small><h2>Bonjour 👋</h2><p>Votre prochaine mission commence ici.</p></div><div className="preview-date">APERÇU</div></div>
            <div className="preview-stats">
              <div className="preview-stat"><span>Solde disponible</span><strong>— <small>MGA</small></strong><em><Wallet size={12}/> À confirmer</em></div>
              <div className="preview-stat"><span>Soumissions</span><strong>—</strong><em><FileCheck2 size={12}/> Suivi personnel</em></div>
            </div>
            <div className="preview-section-head"><b>Explorer les missions</b><span>CATÉGORIES</span></div>
            <div className="preview-task"><div className="preview-task-icon violet"><Headphones size={17}/></div><div><b>Audio & voix</b><small>Transcription · Écoute</small></div><ChevronRight size={16}/></div>
            <div className="preview-task"><div className="preview-task-icon cyan"><ScanSearch size={17}/></div><div><b>Vérification</b><small>Contrôle de données</small></div><ChevronRight size={16}/></div>
            <div className="preview-task"><div className="preview-task-icon orange"><MessageSquareText size={17}/></div><div><b>Sondages</b><small>Questionnaires</small></div><ChevronRight size={16}/></div>
            <div className="preview-bottom"><span><span className="preview-dot"/> CATALOGUE EN PRÉPARATION</span><LockKeyhole size={13}/></div>
          </div>
          <div className="preview-float"><span><ShieldCheck size={17}/></span><div><b>Pas de fausses promesses</b><small>Les récompenses doivent être financées.</small></div></div>
          <div className="preview-orb preview-orb-one"/><div className="preview-orb preview-orb-two"/>
        </div>
      </section>

      <section className="market-strip">
        <div><span className="strip-icon"><CheckCircle2 size={16}/></span><b>Consignes claires</b><small>Vous savez ce qu'on attend.</small></div>
        <div><span className="strip-icon"><Clock3 size={16}/></span><b>Temps estimé</b><small>Pas de mauvaise surprise.</small></div>
        <div><span className="strip-icon"><Wallet size={16}/></span><b>Suivi des gains</b><small>En attente ou confirmés.</small></div>
        <div><span className="strip-icon"><ShieldCheck size={16}/></span><b>Validation contrôlée</b><small>Chaque étape est traçable.</small></div>
      </section>

      <section className="market-categories" id="categories">
        <div className="market-section-heading"><div><div className="market-eyebrow">TROUVEZ VOTRE FORMAT</div><h2>Quel type de mission<br/><span>vous intéresse ?</span></h2></div><Link href="/tasks" className="market-text-link">Voir le catalogue <ArrowRight size={16}/></Link></div>
        <div className="market-category-grid">
          {categories.map((category) => { const Icon = category.icon; return <Link href="/tasks" className="market-category" key={category.name}><span className={`market-category-icon ${category.tone}`}><Icon size={21}/></span><span className="market-category-copy"><b>{category.name}</b><small>{category.detail}</small></span><span className="market-category-arrow"><ArrowRight size={16}/></span></Link>; })}
        </div>
      </section>

      <section className="market-missions" id="missions">
        <div className="market-section-heading"><div><div className="market-eyebrow">LE MARCHÉ DES MISSIONS</div><h2>Des opportunités, <span>pas du hasard.</span></h2></div><div className="market-filter-label"><Filter size={15}/> Catalogue vérifié</div></div>
        <div className="market-empty-state">
          <div className="empty-state-symbol"><LayoutDashboard size={27}/><span><Sparkles size={14}/></span></div>
          <div className="empty-state-copy"><div className="market-eyebrow">OUVERTURE PROGRESSIVE</div><h3>Les premières missions sont en préparation.</h3><p>Nous n'affichons pas de tâches fictives. Une mission apparaîtra ici uniquement lorsque son partenaire, ses critères de validation et son budget de récompense seront confirmés.</p><div className="empty-state-tags"><span><BadgeCheck size={13}/> Partenaire contrôlé</span><span><FileCheck2 size={13}/> Consignes publiées</span><span><Wallet size={13}/> Budget confirmé</span></div></div>
          <Link href="/tasks" className="market-outline">Consulter le catalogue <ArrowRight size={15}/></Link>
        </div>
      </section>

      <section className="market-how" id="how-it-works">
        <div className="market-how-heading"><div className="market-eyebrow">COMMENT ÇA MARCHE</div><h2>Simple à utiliser.<br/><span>Clair à chaque étape.</span></h2><p>AdEarn sépare la réalisation d'une tâche, sa vérification et la confirmation d'une récompense.</p></div>
        <div className="market-steps">{workflow.map((item) => {const Icon = item.icon; return <article className="market-step" key={item.number}><div className="market-step-top"><span>{item.number}</span><Icon size={20}/></div><h3>{item.title}</h3><p>{item.text}</p></article>;})}</div>
      </section>

      <section className="market-bottom-cta"><div className="bottom-cta-icon"><Zap size={21} fill="currentColor"/></div><div><div className="market-eyebrow">BIENVENUE SUR ADEARN</div><h2>Votre espace de missions<br/>vous attend.</h2><p>Créez votre compte pour retrouver vos activités et suivre vos soumissions.</p></div><Link href="/register" className="market-primary">Créer mon compte <ArrowRight size={17}/></Link></section>

      <footer className="market-footer"><Link href="/" className="market-brand"><span className="market-brand-mark"><Zap size={17} fill="currentColor"/></span><span>ad<span>earn</span><i>.</i></span></Link><small>© 2026 ADEARN · UNE PLATEFORME EN CONSTRUCTION</small><div><Link href="/help">Centre d'aide</Link><Link href="/login">Connexion</Link><Link href="/register">Inscription</Link></div></footer>
    </main>
  );
}
