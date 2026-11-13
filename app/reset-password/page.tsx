import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { updatePassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = { searchParams: Promise<{ error?: string }> };

const errors: Record<string, string> = {
  setup: "La connexion à Supabase n'est pas encore configurée.",
  invalid: "Les deux mots de passe doivent correspondre et contenir au moins 8 caractères.",
  update: "Le mot de passe n'a pas pu être modifié. Demandez un nouveau lien de récupération.",
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims?.sub) redirect("/forgot-password?error=session");

  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? "Une erreur est survenue." : null;

  return <main className="auth-page auth-single">
    <div className="auth-panel">
      <Link href="/login" className="auth-back"><ArrowLeft size={15}/> Retour à la connexion</Link>
      <div className="auth-form-wrap">
        <div className="auth-icon"><LockKeyhole size={21}/></div>
        <div className="eyebrow">SÉCURITÉ DU COMPTE</div>
        <h2>Nouveau mot de passe</h2>
        <p>Choisissez un nouveau mot de passe d'au moins 8 caractères.</p>
        {error && <div className="auth-feedback auth-error" role="alert">{error}</div>}
        <form className="auth-form" action={updatePassword}>
          <label htmlFor="password">Nouveau mot de passe</label>
          <div className="auth-input"><LockKeyhole size={17}/><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required/></div>
          <label htmlFor="confirmation">Confirmer le mot de passe</label>
          <div className="auth-input"><LockKeyhole size={17}/><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required/></div>
          <button type="submit" className="auth-submit">Mettre à jour <ArrowUpRight size={16}/></button>
        </form>
        <div className="auth-security"><ShieldCheck size={16}/> Votre nouveau mot de passe est enregistré uniquement par Supabase Auth.</div>
      </div>
      <div className="auth-footer">© 2026 ADEARN · ESPACE PERSONNEL</div>
    </div>
  </main>;
}
