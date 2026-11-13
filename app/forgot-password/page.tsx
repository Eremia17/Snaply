import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import { requestPasswordReset } from "@/app/auth/actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

const errors: Record<string, string> = {
  setup: "La connexion à Supabase n'est pas encore configurée.",
  invalid: "Saisissez une adresse e-mail valide.",
  send: "Impossible d'envoyer le lien pour le moment. Réessayez plus tard.",
  session: "Votre session de récupération a expiré. Demandez un nouveau lien.",
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? "Une erreur est survenue." : null;
  const sent = params.message === "sent";

  return <main className="auth-page auth-single">
    <div className="auth-panel">
      <Link href="/login" className="auth-back"><ArrowLeft size={15}/> Retour à la connexion</Link>
      <div className="auth-form-wrap">
        <div className="auth-icon"><Mail size={21}/></div>
        <div className="eyebrow">RÉCUPÉRATION DU COMPTE</div>
        <h2>Mot de passe oublié ?</h2>
        <p>Indiquez l'adresse e-mail de votre compte. Si elle est enregistrée, vous recevrez un lien de réinitialisation.</p>
        {error && <div className="auth-feedback auth-error" role="alert">{error}</div>}
        {sent && <div className="auth-feedback auth-success" role="status">Si un compte correspond à cette adresse, un e-mail de récupération vient d'être envoyé. Vérifiez aussi vos courriers indésirables.</div>}
        <form className="auth-form" action={requestPasswordReset}>
          <label htmlFor="email">Adresse e-mail</label>
          <div className="auth-input"><Mail size={17}/><input id="email" name="email" type="email" placeholder="vous@exemple.com" autoComplete="email" required/></div>
          <button type="submit" className="auth-submit">Envoyer le lien <ArrowUpRight size={16}/></button>
        </form>
        <div className="auth-security"><ShieldCheck size={16}/> Le lien de récupération est temporaire et ne doit être partagé avec personne.</div>
      </div>
      <div className="auth-footer">© 2026 ADEARN · ESPACE PERSONNEL</div>
    </div>
  </main>;
}
