import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bell, CircleHelp, ClipboardList, LayoutDashboard, LogOut, Wallet, UserRound, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOut } from "@/app/auth/actions";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/tasks", label: "Découvrir les missions", icon: Zap },
  { href: "/submissions", label: "Mes participations", icon: ClipboardList },
  { href: "/wallet", label: "Mon portefeuille", icon: Wallet },
  { href: "/profile", label: "Mon profil", icon: UserRound },
];

export default async function PortalShell({ children, active }: { children: ReactNode; active: string }) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect("/login");

  const email = typeof data.claims.email === "string" ? data.claims.email : "Compte AdEarn";
  const initial = email.charAt(0).toUpperCase();

  return <div className="portal-root">
    <aside className="portal-sidebar">
      <Link href="/" className="portal-brand"><span><Zap size={18} fill="currentColor"/></span>adearn<span className="portal-dot">.</span></Link>
      <div className="portal-side-label">ESPACE PERSONNEL</div>
      <nav className="portal-nav">{links.map(item => { const Icon=item.icon; return <Link key={item.href} href={item.href} className={active===item.href?"active":""}><Icon size={17}/>{item.label}</Link>; })}</nav>
      <div className="portal-side-bottom">
        <div className="portal-help"><CircleHelp size={18}/><b>Besoin d'aide ?</b><small>Notre centre d'aide arrive bientôt.</small><Link href="/help">En savoir plus <ArrowUpRight size={13}/></Link></div>
        <form action={signOut}><button type="submit" className="portal-logout"><LogOut size={16}/> Se déconnecter</button></form>
      </div>
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><div><span className="portal-breadcrumb">ADEARN</span><span className="crumb-slash">/</span><b>{active==="/dashboard"?"TABLEAU DE BORD":active==="/wallet"?"PORTEFEUILLE":active==="/profile"?"PROFIL":active==="/submissions"?"PARTICIPATIONS":"MISSIONS"}</b></div><div className="portal-top-actions"><span className="demo-chip">MISSIONS EN DÉMO</span><span className="portal-user-email">{email}</span><button className="icon-button" aria-label="Notifications"><Bell size={17}/></button><div className="user-avatar" aria-label="Compte connecté">{initial}</div></div></header>
      <main className="portal-content">{children}</main>
      <footer className="portal-footer"><span>© 2026 ADEARN</span><span>Compte sécurisé · Missions et portefeuille en démonstration</span><Link href="/">Site public ↗</Link></footer>
    </div>
  </div>;
}
