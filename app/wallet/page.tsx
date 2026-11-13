import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, BadgeInfo, CircleDollarSign, Clock3, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import PortalShell from "../../components/portal-shell";

export default function WalletPage(){return <PortalShell active="/wallet">
 <section className="welcome-row"><div><div className="eyebrow">GESTION DE VOS RÉCOMPENSES</div><h1>Votre <em>portefeuille.</em></h1><p>Suivez les récompenses confirmées et les mouvements de votre compte.</p></div></section>
 <div className="wallet-hero"><div><span>SOLDE DISPONIBLE <span className="wallet-demo">DÉMO</span></span><strong>0,00 <small>$</small></strong><p>Aucun argent réel n'est détenu par AdEarn dans cette version.</p></div><div className="wallet-hero-icon"><WalletIcon size={40}/></div></div>
 <div className="demo-alert"><BadgeInfo size={17}/><span><b>Retraits désactivés.</b> Les moyens de paiement, les frais éventuels, les seuils et les délais seront publiés avant toute activation.</span></div>
 <section className="panel-card ledger-panel"><div className="panel-heading"><div><div className="eyebrow">TRANSPARENCE</div><h2>Historique des mouvements</h2></div><span className="soon-label">0 OPÉRATION</span></div><div className="ledger-empty"><span><CircleDollarSign size={28}/></span><b>Aucun mouvement pour le moment</b><p>Les crédits et retraits apparaîtront ici avec leur date, leur statut et leur référence.</p><Link href="/tasks">Découvrir les missions <ArrowUpRight size={14}/></Link></div></section>
 <div className="wallet-terms"><ShieldCheck size={19}/><p><b>Notre règle :</b> aucune récompense ne sera créditée sur la seule base d'un clic ou d'une action dans le navigateur. La validation devra être confirmée côté serveur.</p></div>
 </PortalShell>}
