import Link from "next/link";
import { ArrowUpRight, AudioLines, BadgeCheck, Clock3, FileText, Headphones, Lightbulb, Sparkles, Wallet } from "lucide-react";
import PortalShell from "../../components/portal-shell";

const activity = [
  { icon: FileText, title: "Votre espace est prêt", detail: "Votre compte AdEarn est connecté", time: "À L'INSTANT", state: "Information" },
  { icon: BadgeCheck, title: "Vérification du compte", detail: "Votre session est protégée par Supabase Auth", time: "À VENIR", state: "En préparation" },
];

export default function DashboardPage() {
 return <PortalShell active="/dashboard">
  <section className="welcome-row"><div><div className="eyebrow">VOTRE ESPACE ADEARN</div><h1>Bonjour, <em>explorateur.</em> ✳</h1><p>Voici un aperçu de votre activité. Les chiffres affichés sont des exemples de démonstration.</p></div><Link href="/tasks" className="portal-primary">Explorer les missions <ArrowUpRight size={16}/></Link></section>
  <div className="demo-alert"><Sparkles size={17}/><span><b>Vous êtes en mode aperçu.</b> Votre compte est réel. Les missions rémunérées et le portefeuille restent en démonstration.</span></div>
  <section className="stat-grid">
   <article className="stat-card stat-highlight"><div className="stat-head"><span>RÉCOMPENSES DISPONIBLES</span><Wallet size={17}/></div><strong>0,00 <small>$</small></strong><span className="stat-foot">Solde réel : non connecté</span><div className="stat-watermark">✳</div></article>
   <article className="stat-card"><div className="stat-head"><span>MISSIONS TERMINÉES</span><BadgeCheck size={17}/></div><strong>0</strong><span className="stat-foot">Aucune activité enregistrée</span></article>
   <article className="stat-card"><div className="stat-head"><span>EN ATTENTE</span><Clock3 size={17}/></div><strong>0</strong><span className="stat-foot">Aucune validation en cours</span></article>
  </section>
  <div className="dashboard-columns"><section className="panel-card"><div className="panel-heading"><div><div className="eyebrow">À DÉCOUVRIR</div><h2>Vos catégories</h2></div><Link href="/tasks">Tout voir <ArrowUpRight size={14}/></Link></div><div className="mini-category"><span className="mini-emoji lime-emoji">🧠</span><div><b>Sondages & études</b><small>Donnez votre avis et contribuez</small></div><span className="soon-label">BIENTÔT</span></div><div className="mini-category"><span className="mini-emoji peach-emoji">🎧</span><div><b>Audio & voix</b><small>Écoute et classification</small></div><span className="soon-label">BIENTÔT</span></div><div className="mini-category"><span className="mini-emoji blue-emoji">🧩</span><div><b>Micro-missions</b><small>Petites tâches bien définies</small></div><span className="soon-label">BIENTÔT</span></div></section>
   <section className="panel-card activity-panel"><div className="panel-heading"><div><div className="eyebrow">VOTRE PARCOURS</div><h2>Activité récente</h2></div></div>{activity.map((item)=>{const Icon=item.icon;return <div className="activity-item" key={item.title}><span className="activity-icon"><Icon size={17}/></span><div><b>{item.title}</b><small>{item.detail}</small><em>{item.time}</em></div></div>})}<div className="activity-note"><Lightbulb size={15}/> Votre historique apparaîtra ici une fois les fonctionnalités activées.</div></section></div>
  <section className="dashboard-banner"><div><span>✳ LE PRINCIPE ADEARN</span><h2>Des règles claires.<br/>Pas de mauvaises surprises.</h2><p>Chaque mission devra préciser son partenaire, sa récompense, ses critères et ses délais.</p></div><div className="banner-symbol"><AudioLines size={55}/></div></section>
 </PortalShell>;
}
