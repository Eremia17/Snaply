import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const errors: Record<string, string> = {
  setup: "La connexion n'est pas encore configurée. L'administrateur doit ajouter les clés Supabase d'AdEarn.",
  invalid: "Vérifiez votre adresse e-mail et votre mot de passe.",
  credentials: "Adresse e-mail ou mot de passe incorrect.",
  confirmation: "Le lien de confirmation est invalide ou a expiré. Demandez un nouvel e-mail.",
  auth: "Connectez-vous pour continuer.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? "Une erreur est survenue." : null;
  const message = params.message === "signed-out" ? "Vous êtes bien déconnecté." : null;

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <Link href="/" className="portal-brand auth-brand"><span>✳</span>adearn<span className="portal-dot">.</span></Link>
        <div className="auth-visual-copy">
          <div className="eyebrow light">LE TEMPS A DE LA VALEUR</div>
          <h1>Content de<br/>vous <em>revoir.</em></h1>
          <p>Retrouvez votre espace, vos missions et votre suivi en toute clarté.</p>
        </div>
        <div className="auth-visual-bottom">✳ <span>LA TRANSPARENCE AVANT TOUT</span></div>
      </div>
      <div className="auth-panel">
        <Link href="/" className="auth-back"><ArrowLeft size={15}/> Retour au site</Link>
        <div className="auth-form-wrap">
          <div className="auth-icon"><LockKeyhole size={21}/></div>
          <div className="eyebrow">VOTRE ESPACE PERSONNEL</div>
          <h2>Connexion</h2>
          <p>Heureux de vous retrouver. Connectez-vous à votre compte AdEarn.</p>
          {error && <div className="auth-feedback auth-error" role="alert">{error}</div>}
          {message && <div className="auth-feedback auth-success" role="status">{message}</div>}
          <form className="auth-form" action={signIn}>
            <label htmlFor="email">Adresse e-mail</label>
            <div className="auth-input"><Mail size={17}/><input id="email" name="email" type="email" placeholder="vous@exemple.com" autoComplete="email" required/></div>
            <label htmlFor="password">Mot de passe</label>
            <div className="auth-input"><LockKeyhole size={17}/><input id="password" name="password" type="password" placeholder="Votre mot de passe" autoComplete="current-password" required/></div>
            <Link href="/forgot-password" className="auth-forgot">Mot de passe oublié ?</Link>
            <button type="submit" className="auth-submit">Se connecter <ArrowUpRight size={16}/></button>
          </form>
          <div className="auth-switch">Vous n'avez pas encore de compte ? <Link href="/register">Créer un compte</Link></div>
          <div className="auth-security"><ShieldCheck size={16}/> Connexion sécurisée par Supabase. Ne partagez jamais votre mot de passe.</div>
        </div>
        <div className="auth-footer">© 2026 ADEARN · ESPACE PERSONNEL</div>
      </div>
    </main>
  );
}
