import Link from "next/link";
import { ArrowDownRight, ArrowLeft, BadgeCheck, Clock3, Compass, ShieldCheck, Sparkles } from "lucide-react";

export default function TasksPage() {
  return (
    <main className="catalog-page">
      <header className="nav-wrap"><Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link><div className="catalog-nav-actions"><Link href="/login" className="nav-login">Connexion</Link><Link href="/register" className="nav-cta">Créer un compte</Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Accueil</Link></div></header>
      <section className="catalog-hero"><div className="eyebrow">ADEARN / LE CATALOGUE</div><h1>Les bonnes missions<br/><em>prennent du temps.</em></h1><p>Nous préférons ouvrir avec des offres vérifiées plutôt que remplir cette page de missions fictives.</p><div className="catalog-status"><span className="status-orb"/> CATALOGUE EN PRÉPARATION</div></section>
      <section className="empty-catalog"><div className="empty-art"><div className="empty-orbit orbit-a">✳</div><div className="empty-orbit orbit-b">✦</div><div className="empty-card"><Compass size={35}/><span>YOUR NEXT<br/>OPPORTUNITY</span><b>COMING SOON</b></div></div><div className="empty-copy"><div className="eyebrow">UNE PETITE PAUSE AVANT LE DÉPART</div><h2>On prépare quelque chose de <em>sérieux.</em></h2><p>Aucune mission rémunérée n'est disponible actuellement. Chaque future offre devra afficher son partenaire, ses critères de validation, sa récompense, son délai et ses conditions de retrait.</p><div className="empty-rules"><span><BadgeCheck size={17}/> Partenaire vérifié</span><span><Clock3 size={17}/> Délais affichés</span><span><ShieldCheck size={17}/> Récompenses confirmées</span></div><Link href="/" className="btn-dark">Retourner à l'accueil <ArrowDownRight size={17}/></Link></div></section>
      <footer className="footer-premium"><Link className="logo" href="/"><span className="logo-symbol">✳</span>adearn<span className="logo-period">.</span></Link><span>© 2026 ADEARN — TRANSPARENCE AVANT TOUT</span><Link href="/">Accueil ↗</Link></footer>
    </main>
  );
}
