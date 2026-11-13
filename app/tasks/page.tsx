import Link from "next/link";
import { ArrowLeft, ClipboardList, Clock3, ShieldCheck } from "lucide-react";

export default function TasksPage() {
  return (
    <main className="tasks-page">
      <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">A</span><span>Ad<span>Earn</span></span></Link><Link className="button button-quiet" href="/"><ArrowLeft size={16}/> Retour à l'accueil</Link></header>
      <section className="tasks-empty shell">
        <div className="empty-icon"><ClipboardList size={34}/></div>
        <div className="eyebrow">CENTRE DE MISSIONS</div>
        <h1>Le catalogue se prépare.</h1>
        <p className="empty-copy">Aucune mission rémunérée n'est disponible pour le moment. Nous publierons une offre uniquement lorsque son partenaire, ses critères de validation, son financement et sa récompense seront confirmés.</p>
        <div className="empty-checks"><div><ShieldCheck size={18}/><span>Partenaire vérifié</span></div><div><Clock3 size={18}/><span>Conditions et délais affichés</span></div><div><ClipboardList size={18}/><span>Validation documentée</span></div></div>
        <Link className="button button-primary" href="/">Retour au tableau de bord <ArrowLeft size={16}/></Link>
      </section>
      <footer className="site-footer shell"><span>© 2026 AdEarn</span><span>Transparence avant tout.</span></footer>
    </main>
  );
}
