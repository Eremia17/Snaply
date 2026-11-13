import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Bell, CircleHelp, LayoutDashboard, LogOut, Settings, Wallet, UserRound, Zap } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/tasks", label: "Découvrir les missions", icon: Zap },
  { href: "/wallet", label: "Mon portefeuille", icon: Wallet },
  { href: "/profile", label: "Mon profil", icon: UserRound },
];

export default function PortalShell({ children, active }: { children: ReactNode; active: string }) {
  return <div className="portal-root">
    <aside className="portal-sidebar">
      <Link href="/" className="portal-brand"><span><Zap size={18} fill="currentColor"/></span>adearn<span className="portal-dot">.</span></Link>
      <div className="portal-side-label">ESPACE PERSONNEL</div>
      <nav className="portal-nav">{links.map(item => { const Icon=item.icon; return <Link key={item.href} href={item.href} className={active===item.href?"active":""}><Icon size={17}/>{item.label}</Link>; })}</nav>
      <div className="portal-side-bottom"><div className="portal-help"><CircleHelp size={18}/><b>Besoin d'aide ?</b><small>Notre centre d'aide arrive bientôt.</small><Link href="/help">En savoir plus <ArrowUpRight size={13}/></Link></div><Link href="/" className="portal-logout"><LogOut size={16}/> Quitter l'espace</Link></div>
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><div><span className="portal-breadcrumb">ADEARN</span><span className="crumb-slash">/</span><b>{active==="/dashboard"?"TABLEAU DE BORD":active==="/wallet"?"PORTEFEUILLE":active==="/profile"?"PROFIL":"MISSIONS"}</b></div><div className="portal-top-actions"><span className="demo-chip">MODE DÉMO</span><button className="icon-button" aria-label="Notifications"><Bell size={17}/><i/></button><div className="user-avatar">A</div></div></header>
      <main className="portal-content">{children}</main>
      <footer className="portal-footer"><span>© 2026 ADEARN</span><span>Prototype d'interface · Aucun paiement réel</span><Link href="/">Site public ↗</Link></footer>
    </div>
  </div>;
}
