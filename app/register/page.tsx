import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { signUp } from "@/app/auth/actions";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const errors: Record<string, string> = {
  setup: "L'inscription n'est pas encore configurée. L'administrateur doit ajouter les clés Supabase d'AdEarn.",
  invalid: "Vérifiez votre nom, votre adresse e-mail et votre mot de passe (8 caractères minimum).",
  signup: "Impossible de créer ce compte. Vérifiez l'adresse e-mail ou réessayez plus tard.",
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? "Une erreur est survenue." : null;
  const message = params.message === "check-email"
    ? "Compte presque prêt ! Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter."
    : null;

  return (
    <main className="auth-page">
      <div className="auth-visual register-visual">
        <Link href="/" className="portal-brand auth-brand"><span>✳</span>adearn<span className="portal-dot">.</span></Link>
        <div className="auth-visual-copy">
          <div className="eyebrow light">BIENVENUE DANS LA SUITE</div>
          <h1>Tout commence<br/>par une <em>idée.</em></h1>
          <p>Un espace pensé pour participer à des missions utiles, avec des règles compréhensibles.</p>
        </div>
        <div className="auth-visual-bottom">✳ <span>VOTRE TEMPS COMPTE</span></div>
      </div>
      <div className="auth-panel">
        <Link href="/" className="auth-back"><ArrowLeft size={15}/> Retour au site</Link>
        <div className="auth-form-wrap">
          <div className="auth-icon"><UserRound size={21}/></div>
          <div className="eyebrow">REJOINDRE ADEARN</div>
          <h2>Créer un compte</h2>
          <p>Préparez votre espace personnel en quelques étapes.</p>
          {error && <div className="auth-feedback auth-error" role="alert">{error}</div>}
          {message && <div className="auth-feedback auth-success" role="status">{message}</div>}
          <form className="auth-form" action={signUp}>
            <label htmlFor="displayName">Nom d'affichage</label>
            <div className="auth-input"><UserRound size={17}/><input id="displayName" name="displayName" type="text" placeholder="Comment vous appeler ?" autoComplete="name" minLength={2} maxLength={60} required/></div>
            <label htmlFor="email">Adresse e-mail</label>
            <div className="auth-input"><Mail size={17}/><input id="email" name="email" type="email" placeholder="vous@exemple.com" autoComplete="email" required/></div>
            <label htmlFor="password">Mot de passe</label>
            <div className="auth-input"><LockKeyhole size={17}/><input id="password" name="password" type="password" placeholder="8 caractères minimum" autoComplete="new-password" minLength={8} required/></div>
            <button type="submit" className="auth-submit">Créer mon compte <ArrowUpRight size={16}/></button>
          </form>
          <div className="auth-switch">Déjà membre ? <Link href="/login">Se connecter</Link></div>
          <div className="auth-security"><ShieldCheck size={16}/> Votre mot de passe est traité par Supabase Auth et n'est jamais enregistré dans le profil AdEarn.</div>
        </div>
        <div className="auth-footer">© 2026 ADEARN · ESPACE PERSONNEL</div>
      </div>
    </main>
  );
}
