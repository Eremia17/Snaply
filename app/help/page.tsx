import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CircleHelp, Clock3, ShieldCheck, Wallet } from "lucide-react";

const questions = [
  { icon: BadgeCheck, title: "Comment participer ?", text: "Créez un compte, consultez les consignes d'une mission publiée, puis envoyez votre réponse depuis sa fiche. Une participation n'est pas automatiquement acceptée." },
  { icon: Clock3, title: "Combien de temps dure la vérification ?", text: "Le délai dépendra de chaque partenaire et sera affiché sur la fiche de mission avant votre participation. Aucun délai fictif n'est promis." },
  { icon: Wallet, title: "Quand une récompense est-elle créditée ?", text: "L'approbation d'une participation ne déclenche pas de paiement. Le registre financier et les retraits restent désactivés tant qu'un partenaire, un financement et un processus de paiement vérifié ne sont pas opérationnels." },
  { icon: ShieldCheck, title: "Comment AdEarn protège-t-il les comptes ?", text: "La connexion est gérée par Supabase Auth. Les participations et les informations de portefeuille sont isolées par compte avec des règles d'accès en base de données." },
];

export default function HelpPage() {
  return <main className="catalog-page">
    <header className="nav-wrap">
      <Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link>
      <div className="catalog-nav-actions"><Link href="/tasks" className="nav-login">Missions</Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Accueil</Link></div>
    </header>
    <section className="catalog-hero">
      <div className="eyebrow">ADEARN / CENTRE D’ASSISTANCE</div>
      <h1>Des réponses<br/><em>sans détour.</em></h1>
      <p>Les règles essentielles du service, expliquées clairement. Cette documentation évoluera avec les fonctionnalités réellement activées.</p>
    </section>
    <section className="help-public-grid">
      {questions.map((item, index) => { const Icon = item.icon; return <article className="panel-card help-public-card" key={item.title}>
        <div className="help-public-index">0{index + 1} / ADEARN</div><span className="help-public-icon"><Icon size={21}/></span>
        <h2>{item.title}</h2><p>{item.text}</p>
      </article>; })}
    </section>
    <section className="help-public-bottom"><CircleHelp size={25}/><div><b>Vous cherchez une mission ?</b><p>Le catalogue n'affiche que les missions effectivement publiées et autorisées.</p></div><Link href="/tasks" className="btn-dark">Voir le catalogue <ArrowUpRight size={16}/></Link></section>
    <footer className="footer-premium"><Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link><span>© 2026 ADEARN — TRANSPARENCE AVANT TOUT</span><Link href="/">Accueil ↗</Link></footer>
  </main>;
}
