import Link from "next/link";
import {
  ArrowDownRight, ArrowRight, BadgeCheck, Bell, Check, ChevronDown,
  CircleHelp, Clock3, Compass, CreditCard, Flower2, Globe2, Leaf,
  Menu, Play, ShieldCheck, Sparkles, Star, Wallet, Zap
} from "lucide-react";

const steps = [
  { n: "01", icon: Compass, title: "Explorez", text: "Découvrez les missions et leurs conditions avant de vous engager." },
  { n: "02", icon: Check, title: "Participez", text: "Réalisez une mission en suivant les critères indiqués." },
  { n: "03", icon: Wallet, title: "Suivez", text: "Consultez la validation et les récompenses réellement confirmées." },
];

export default function Home() {
  return (
    <main className="premium-page">
      <div className="topline"><span><span className="live-dot"/> LE NOUVEAU VISAGE DES MICRO-MISSIONS</span><span className="topline-right">Conçu pour la transparence <span>✳</span></span></div>
      <header className="nav-wrap">
        <Link className="logo" href="/"><span className="logo-symbol"><Zap size={19} fill="currentColor"/></span>adearn<span className="logo-period">.</span></Link>
        <nav className="main-nav"><a href="#missions">Découvrir</a><a href="#how">Comment ça marche</a><a href="#promise">Notre promesse</a></nav>
        <div className="nav-right"><Link className="nav-login" href="/login">Connexion</Link><span className="language"><Globe2 size={15}/> FR <ChevronDown size={13}/></span><Link className="nav-cta" href="/tasks">Explorer <ArrowUpRightIcon/></Link></div>
      </header>

      <section className="hero-premium">
        <div className="hero-left">
          <div className="hero-kicker"><span className="kicker-line"/> LE TEMPS A DE LA VALEUR</div>
          <h1>Faites de<br/>vos petits<br/><em>moments.</em><br/><span>Quelque chose.</span></h1>
          <p className="hero-description">Des missions claires, des règles visibles et un suivi honnête. AdEarn prépare une nouvelle façon de participer à des tâches en ligne, sans promesses irréalistes.</p>
          <div className="hero-buttons"><Link href="/tasks" className="btn-dark">Voir les missions <ArrowUpRightIcon/></Link><a className="watch-link" href="#how"><span><Play size={13} fill="currentColor"/></span> Découvrir le concept</a></div>
          <div className="hero-proof"><div className="avatar-stack"><i>✦</i><i>◉</i><i>✳</i></div><span>La transparence d'abord.<br/><b>Chaque étape compte.</b></span></div>
        </div>
        <div className="hero-art">
          <div className="art-image"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80" alt="Espace de travail lumineux et moderne"/><div className="image-shade"/></div>
          <div className="art-sticker sticker-top"><span>✳</span><div><b>Une expérience</b><small>pensée pour vous</small></div></div>
          <div className="art-sticker sticker-bottom"><div className="sticker-icon"><Wallet size={18}/></div><div><small>APERÇU DU PORTEFEUILLE</small><b>0,00 $ <span>· DÉMO</span></b><small>Aucun gain réel pour le moment</small></div></div>
          <div className="art-caption">01 / UNE PLATEFORME PLUS HUMAINE</div>
          <div className="art-orbit">✳</div>
        </div>
      </section>

      <div className="ticker"><div>MOINS DE PROMESSES <span>✳</span> PLUS DE CLARTÉ <span>✳</span> VOTRE TEMPS COMPTE <span>✳</span> MOINS DE PROMESSES <span>✳</span> PLUS DE CLARTÉ <span>✳</span> VOTRE TEMPS COMPTE <span>✳</span></div></div>

      <section className="mission-section" id="missions">
        <div className="section-top"><div><div className="eyebrow">01 — LE TERRAIN DE JEU</div><h2>Un monde de petites<br/><em>possibilités.</em></h2></div><div className="section-side"><p>Des formats variés, des consignes compréhensibles et aucune mauvaise surprise cachée dans les petites lignes.</p><Link href="/tasks" className="under-link">Voir le catalogue <ArrowUpRightIcon/></Link></div></div>
        <div className="category-grid">
          <Link href="/tasks" className="category-card category-large"><img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1300&q=80" alt="Équipe qui échange autour d'une table"/><div className="category-overlay"/><div className="category-meta"><span>01 / OPINION</span><span>🧠</span></div><div className="category-content"><small>DONNEZ VOTRE POINT DE VUE</small><h3>Sondages<br/>& études</h3><span className="category-arrow"><ArrowUpRightIcon/></span></div></Link>
          <Link href="/tasks" className="category-card category-orange"><img src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80" alt="Casque audio sur un bureau"/><div className="category-overlay"/><div className="category-meta"><span>02 / ÉCOUTE</span><span>🎧</span></div><div className="category-content"><small>ÉCOUTER ET CONTRIBUER</small><h3>Audio<br/>& voix</h3><span className="category-arrow"><ArrowUpRightIcon/></span></div></Link>
          <Link href="/tasks" className="category-card category-blue"><img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=80" alt="Espace de travail créatif"/><div className="category-overlay"/><div className="category-meta"><span>03 / ACTION</span><span>🧩</span></div><div className="category-content"><small>DES ACTIONS BIEN DÉFINIES</small><h3>Micro-<br/>missions</h3><span className="category-arrow"><ArrowUpRightIcon/></span></div></Link>
        </div>
        <div className="catalog-note"><Sparkles size={16}/> Les catégories sont des aperçus : aucune mission rémunérée n'est encore ouverte.</div>
      </section>

      <section className="manifesto" id="promise">
        <div className="manifesto-inner"><div className="manifesto-stamp">✳<small>THE ADEARN<br/>STANDARD</small></div><div className="eyebrow light">02 — NOTRE ENGAGEMENT</div><h2>La confiance ne<br/>se réclame pas.<br/><em>Elle se construit.</em></h2><div className="manifesto-bottom"><p>Une récompense doit avoir une vraie source de financement, une règle de validation et des conditions de retrait connues. C'est la base. Pas une option.</p><div className="manifesto-seal"><ShieldCheck size={22}/><span>CLARTÉ<br/>AVANT TOUT</span></div></div></div>
        <div className="manifesto-photo"><img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1100&q=80" alt="Bureau calme baigné de lumière"/><div className="photo-tag">BUILT ON TRUST <span>✳</span></div></div>
      </section>

      <section className="how-section" id="how"><div className="eyebrow">03 — EN TROIS TEMPS</div><div className="section-top how-heading"><h2>Simple comme<br/><em>ça devrait l'être.</em></h2><p>Pas de parcours compliqué. Vous gardez le contrôle à chaque étape.</p></div><div className="steps">{steps.map((step) => {const Icon = step.icon; return <article className="step" key={step.n}><div className="step-head"><span>{step.n}</span><Icon size={22}/></div><h3>{step.title}</h3><p>{step.text}</p></article>;})}</div></section>

      <section className="closing-cta"><div className="closing-spark">✳</div><div className="eyebrow">LE PROCHAIN CHAPITRE COMMENCE ICI</div><h2>Prêt à découvrir<br/>AdEarn ?</h2><p>Le catalogue est en préparation. Revenez découvrir les premières missions quand elles seront vérifiées.</p><Link href="/tasks" className="btn-dark">Explorer AdEarn <ArrowUpRightIcon/></Link></section>

      <footer className="footer-premium"><Link className="logo" href="/"><span className="logo-symbol"><Zap size={17} fill="currentColor"/></span>adearn<span className="logo-period">.</span></Link><span>© 2026 ADEARN — EN CONSTRUCTION</span><div><a href="#how">Fonctionnement</a><a href="#promise">Engagement</a><Link href="/login">Connexion</Link><Link href="/register">Créer un compte</Link><a href="mailto:hello@adearn.example">Contact</a></div></footer>
    </main>
  );
}

function ArrowUpRightIcon() { return <ArrowDownRight className="arrow-diagonal" size={17}/>; }
