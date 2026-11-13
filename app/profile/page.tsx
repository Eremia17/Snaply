import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Bell, LockKeyhole, Mail, MapPin, Settings2, ShieldCheck, UserRound } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { updateDisplayName } from "@/app/auth/actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function ProfilePage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const displayName =
    typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "Membre AdEarn";
  const params = await searchParams;

  return <PortalShell active="/profile">
    <section className="welcome-row"><div><div className="eyebrow">VOS INFORMATIONS</div><h1>Votre <em>profil.</em></h1><p>Consultez et mettez à jour votre nom d'affichage.</p></div></section>
    {params.error && <div className="auth-feedback auth-error" role="alert">{params.error === "display-name" ? "Le nom doit contenir entre 2 et 60 caractères." : "La mise à jour du profil a échoué. Réessayez."}</div>}
    {params.message === "updated" && <div className="auth-feedback auth-success" role="status">Votre nom d'affichage a été mis à jour.</div>}
    <div className="profile-layout">
      <section className="panel-card profile-card">
        <div className="profile-cover"><span>✳</span></div>
        <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div className="profile-name"><h2>{displayName}</h2><span className="profile-status">COMPTE CONNECTÉ</span></div>
        <p>Votre profil d'affichage. Les informations sensibles ne sont pas exposées ici.</p>
        <div className="profile-detail"><UserRound size={17}/><span><small>NOM D'AFFICHAGE</small><b>{displayName}</b></span></div>
        <div className="profile-detail"><Mail size={17}/><span><small>ADRESSE E-MAIL</small><b>{user?.email ?? "Non disponible"}</b></span></div>
        <div className="profile-detail"><MapPin size={17}/><span><small>PAYS / RÉGION</small><b>À configurer</b></span></div>
      </section>
      <section className="profile-settings">
        <div className="panel-card">
          <div className="panel-heading"><div><div className="eyebrow">VOTRE IDENTITÉ</div><h2>Modifier le profil</h2></div><Settings2 size={19}/></div>
          <form className="profile-edit-form" action={updateDisplayName}>
            <label htmlFor="displayName">Nom d'affichage</label>
            <input id="displayName" name="displayName" type="text" defaultValue={displayName} minLength={2} maxLength={60} required/>
            <button type="submit" className="auth-submit">Enregistrer les changements <ArrowUpRight size={16}/></button>
          </form>
        </div>
        <div className="panel-card">
          <div className="panel-heading"><div><div className="eyebrow">PRÉFÉRENCES</div><h2>Paramètres</h2></div><Settings2 size={19}/></div>
          <div className="setting-row"><span><Bell size={18}/><b>Notifications</b></span><small>Configuration à venir</small></div>
          <div className="setting-row"><span><LockKeyhole size={18}/><b>Sécurité du compte</b></span><small>Gérée par Supabase Auth</small></div>
          <div className="setting-row"><span><ShieldCheck size={18}/><b>Confidentialité</b></span><small>Politique en préparation</small></div>
        </div>
        <div className="profile-callout"><BadgeCheck size={20}/><div><b>Votre compte est authentifié.</b><p>Les missions, les récompenses et les retraits restent en mode démonstration tant que leurs systèmes de validation ne sont pas prêts.</p><Link href="/help">Consulter les informations <ArrowUpRight size={13}/></Link></div></div>
      </section>
    </div>
  </PortalShell>;
}
