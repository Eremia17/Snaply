import { redirect } from "next/navigation";
import { Building2, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createAdminProvider, updateAdminProvider } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Provider = {
  id: string; name: string; website_url: string | null; verification_url: string | null;
  status: "pending" | "active" | "paused" | "disabled";
  incentivized_tasks_allowed: boolean; created_at: string;
};
type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

const statusLabels: Record<Provider["status"], string> = {
  pending: "À vérifier", active: "Actif", paused: "En pause", disabled: "Désactivé",
};
const messages: Record<string, string> = {
  invalid: "Vérifie le nom, les liens HTTPS et les conditions d'activation.",
  save: "Impossible d'enregistrer ce partenaire. Vérifie les permissions RLS.",
};

export default async function AdminProvidersPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard?error=forbidden");

  const { data, error } = await supabase.from("ad_providers")
    .select("id, name, website_url, verification_url, status, incentivized_tasks_allowed, created_at")
    .order("created_at", { ascending: false }).limit(100);
  const providers = (data ?? []) as Provider[];

  return <PortalShell active="/admin/providers">
    <section className="welcome-row"><div><div className="eyebrow">RÉSEAU & CONFORMITÉ</div><h1>Nos <em>partenaires.</em></h1><p>Enregistrez les fournisseurs et conservez une preuve de vérification avant toute mission rémunérée.</p></div><span className="admin-secure-label"><ShieldCheck size={15}/> ACCÈS ADMINISTRATEUR</span></section>
    <div className="admin-provider-warning"><ShieldCheck size={17}/><span><b>Activation contrôlée.</b> Un partenaire ne peut autoriser des missions rémunérées qu'avec une URL de vérification HTTPS et une autorisation explicite. Toute modification est journalisée. Ce contrôle ne remplace pas la vérification contractuelle humaine.</span></div>
    {query.saved === "created" && <div className="auth-feedback auth-success" role="status">Partenaire ajouté avec le statut « À vérifier ».</div>}
    {query.saved === "updated" && <div className="auth-feedback auth-success" role="status">Paramètres du partenaire enregistrés.</div>}
    {query.error && <div className="auth-feedback auth-error" role="alert">{messages[query.error] ?? "Une erreur est survenue."}</div>}
    {error && <div className="auth-feedback auth-error" role="alert">La liste des partenaires est indisponible.</div>}
    <section className="admin-provider-layout">
      <article className="panel-card" style={{ padding: 24 }}>
        <div className="eyebrow">NOUVEAU FOURNISSEUR</div><h2 className="admin-panel-title">Ajouter un partenaire</h2>
        <p className="admin-panel-copy">L'entrée sera créée en attente. Elle ne donnera accès à aucune mission rémunérée.</p>
        <form action={createAdminProvider} className="admin-provider-form">
          <label>Nom du partenaire<input name="name" minLength={2} maxLength={120} required placeholder="Ex. Fournisseur de sondages"/></label>
          <label>Site officiel (HTTPS)<input name="websiteUrl" type="url" placeholder="https://exemple.com"/></label>
          <button className="auth-submit" type="submit"><Sparkles size={15}/> Ajouter en attente</button>
        </form>
      </article>
      <article className="panel-card" style={{ padding: 24 }}>
        <div className="admin-section-heading"><div><div className="eyebrow">REGISTRE INTERNE</div><h2>Fournisseurs enregistrés</h2></div><span>{providers.length} / 100</span></div>
        {!providers.length ? <div className="admin-task-empty"><Building2 size={27}/><br/>Aucun partenaire enregistré.</div> : <div className="admin-provider-list">
          {providers.map(provider => <article className="admin-provider-item" key={provider.id}>
            <div className="admin-provider-item-top"><span className="submission-state">{statusLabels[provider.status]}</span><small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(provider.created_at))}</small></div>
            <h3>{provider.name}</h3>
            {provider.website_url && <a href={provider.website_url} target="_blank" rel="noreferrer" className="submission-open">Site officiel <ExternalLink size={13}/></a>}
            <form action={updateAdminProvider} className="admin-provider-edit">
              <input type="hidden" name="providerId" value={provider.id}/>
              <div className="admin-provider-edit-grid">
                <label>Statut<select name="status" defaultValue={provider.status}><option value="pending">À vérifier</option><option value="active">Actif</option><option value="paused">En pause</option><option value="disabled">Désactivé</option></select></label>
                <label>URL de vérification HTTPS<input name="verificationUrl" type="url" defaultValue={provider.verification_url ?? ""} placeholder="https://source-de-preuve.example"/></label>
              </div>
              <label className="admin-provider-checkbox"><input type="checkbox" name="authorizeIncentivized" value="yes" defaultChecked={provider.incentivized_tasks_allowed}/> Autoriser les missions avec récompense</label>
              <button className="auth-submit" type="submit">Enregistrer les contrôles</button>
            </form>
          </article>)}
        </div>}
      </article>
    </section>
  </PortalShell>;
}
