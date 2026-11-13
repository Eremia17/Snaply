import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BarChart3, CircleDollarSign, ClipboardCheck,
  Clock3, ShieldCheck, Sparkles, Wallet, Zap
} from "lucide-react";

const highlights = [
  { icon: ShieldCheck, title: "Des règles transparentes", text: "Chaque mission indique ses conditions, sa validation et sa récompense avant de commencer." },
  { icon: BadgeCheck, title: "Des gains vérifiés", text: "Une récompense n'est créditée qu'après confirmation fiable du partenaire." },
  { icon: Wallet, title: "Un portefeuille lisible", text: "Distinguez clairement les montants en attente, validés et réellement disponibles." },
];

const taskTypes = [
  { icon: ClipboardCheck, category: "Enquêtes", title: "Partager votre avis", detail: "Répondez à des questionnaires proposés par des partenaires.", status: "Partenaires à venir", tone: "blue" },
  { icon: Zap, category: "Missions", title: "Petites missions", detail: "Réalisez des actions simples avec des critères de validation précis.", status: "Bientôt disponible", tone: "violet" },
  { icon: BarChart3, category: "Études", title: "Contribuer à une étude", detail: "Aidez des organisations à mieux comprendre leurs utilisateurs.", status: "Bientôt disponible", tone: "mint" },
];

export default function Home() {
  return (
    <main>
      <div className="announcement"><Sparkles size={14} /> AdEarn est en construction — aucune mission rémunérée n'est encore ouverte</div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="AdEarn accueil"><span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span>Ad<span>Earn</span></span></Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <a href="#fonctionnement">Comment ça marche</a><a href="#missions">Les missions</a><a href="#securite">Sécurité</a>
        </nav>
        <div className="header-actions"><Link className="button button-quiet" href="#fonctionnement">Découvrir</Link><Link className="button button-primary" href="/tasks">Voir les missions <ArrowRight size={16}/></Link></div>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse-dot"/> UNE PLATEFORME QUI JOUE CARTES SUR TABLE</div>
          <h1>Vos missions.<br/><span>Vos règles.</span><br/>Des gains clairs.</h1>
          <p className="hero-text">AdEarn réunit des missions proposées par des partenaires et explique clairement comment chaque récompense est validée. Pas de promesses floues. Pas de solde magique.</p>
          <div className="hero-actions"><Link className="button button-primary button-large" href="/tasks">Explorer les missions <ArrowRight size={18}/></Link><a className="text-link" href="#fonctionnement">Comprendre le fonctionnement</a></div>
          <div className="trust-line"><ShieldCheck size={16}/> Conditions visibles · Validation vérifiable · Historique clair</div>
        </div>
        <div className="preview-wrap">
          <div className="glow glow-one"/><div className="glow glow-two"/>
          <div className="wallet-card">
            <div className="wallet-top"><div><span className="muted-label">APERÇU DU PORTEFEUILLE</span><p className="wallet-title">Mon activité</p></div><span className="demo-pill">DÉMO</span></div>
            <div className="balance-label">Solde disponible</div><div className="balance">$0.00</div>
            <div className="balance-note"><span className="status-dot"/> Aucun gain réel — aperçu de l'interface</div>
            <div className="wallet-divider"/>
            <div className="wallet-stats"><div><span className="stat-icon pending"><Clock3 size={16}/></span><div><strong>$0.00</strong><small>En attente</small></div></div><div><span className="stat-icon verified"><BadgeCheck size={16}/></span><div><strong>$0.00</strong><small>Validé</small></div></div></div>
            <div className="wallet-footer"><span>Historique des transactions</span><ArrowRight size={16}/></div>
          </div>
          <div className="floating-note"><span className="note-icon"><ShieldCheck size={18}/></span><div><strong>Validation vérifiée</strong><small>Pas de crédit automatique fictif</small></div></div>
        </div>
      </section>

      <section className="metrics shell" aria-label="Principes AdEarn">
        <div><strong>100%</strong><span>des règles affichées avant la mission</span></div><div><strong>0</strong><span>frais cachés annoncés</span></div><div><strong>1</strong><span>historique clair pour chaque compte</span></div>
      </section>

      <section className="section shell" id="fonctionnement">
        <div className="section-heading"><div><div className="eyebrow">SIMPLE ET COMPRÉHENSIBLE</div><h2>Comment AdEarn fonctionne</h2></div><p>Une expérience conçue autour de la clarté : vous savez ce que vous faites, comment c'est contrôlé et ce qui peut être payé.</p></div>
        <div className="steps-grid"><article className="step-card"><span className="step-number">01</span><div className="step-icon"><ClipboardCheck size={22}/></div><h3>Choisissez une mission</h3><p>Lisez les critères, la durée estimée et les conditions de récompense avant de participer.</p></article><article className="step-card"><span className="step-number">02</span><div className="step-icon"><BadgeCheck size={22}/></div><h3>Faites-la vérifier</h3><p>Le partenaire confirme la réalisation. Une simple animation ou un clic ne suffit pas à valider un gain.</p></article><article className="step-card"><span className="step-number">03</span><div className="step-icon"><CircleDollarSign size={22}/></div><h3>Consultez votre solde</h3><p>Les récompenses validées et financées apparaissent séparément des montants encore en attente.</p></article></div>
      </section>

      <section className="tasks-section" id="missions"><div className="shell"><div className="section-heading"><div><div className="eyebrow">UN CATALOGUE EN PRÉPARATION</div><h2>Des missions utiles, pas des pièges</h2></div><p>Les catégories ci-dessous illustrent le futur catalogue. Elles ne constituent pas encore des offres rémunérées.</p></div><div className="task-grid">{taskTypes.map((task) => { const Icon = task.icon; return <article className="task-card" key={task.title}><div className={`task-icon ${task.tone}`}><Icon size={22}/></div><span className="task-category">{task.category}</span><h3>{task.title}</h3><p>{task.detail}</p><span className="task-status"><span/> {task.status}</span></article>; })}</div><div className="catalog-link"><Link className="button button-outline" href="/tasks">Voir l'état des missions <ArrowRight size={16}/></Link></div></div></section>

      <section className="section shell security-section" id="securite"><div className="security-panel"><div className="security-icon"><ShieldCheck size={30}/></div><div><div className="eyebrow">LA CONFIANCE SE PROUVE</div><h2>Votre temps mérite des règles honnêtes.</h2><p>AdEarn ne promettra pas de paiement tant que le financement, le partenaire et les modalités de retrait ne seront pas confirmés. Les publicités et missions rémunérées ne seront intégrées qu'avec des partenaires qui autorisent explicitement ce modèle.</p><div className="security-points"><span><BadgeCheck size={16}/> Conditions lisibles</span><span><BadgeCheck size={16}/> Gains vérifiés</span><span><BadgeCheck size={16}/> Retraits documentés</span></div></div></div></section>

      <footer className="site-footer shell"><Link className="brand" href="/"><span className="brand-mark"><Zap size={18} fill="currentColor"/></span><span>Ad<span>Earn</span></span></Link><p>Une plateforme en construction. Aucune offre rémunérée active à ce stade.</p><span>© 2026 AdEarn</span></footer>
    </main>
  );
}
