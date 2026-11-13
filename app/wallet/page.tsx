import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeInfo, CircleDollarSign, Clock3, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import PortalShell from "@/components/portal-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type BalanceRow = {
  currency_code: string;
  balance: number | string;
  lifetime_task_rewards: number | string;
  lifetime_withdrawals: number | string;
};

type LedgerRow = {
  id: string;
  entry_type: string;
  direction: string;
  amount: number | string;
  currency_code: string;
  description: string | null;
  created_at: string;
};

function money(amount: number | string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString("fr-FR")} ${currency}`;
  }
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const typeLabels: Record<string, string> = {
  task_reward: "Récompense de mission",
  withdrawal: "Retrait",
  adjustment: "Ajustement",
  reversal: "Correction",
};

export default async function WalletPage() {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const [balanceResult, ledgerResult] = await Promise.all([
    supabase.from("wallet_balances").select("currency_code, balance, lifetime_task_rewards, lifetime_withdrawals"),
    supabase.from("transactions").select("id, entry_type, direction, amount, currency_code, description, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const balances = (balanceResult.data ?? []) as BalanceRow[];
  const ledger = (ledgerResult.data ?? []) as LedgerRow[];
  const dataError = Boolean(balanceResult.error || ledgerResult.error);

  return <PortalShell active="/wallet">
    <section className="welcome-row"><div><div className="eyebrow">GESTION DE VOS RÉCOMPENSES</div><h1>Votre <em>portefeuille.</em></h1><p>Seules les opérations inscrites dans le registre confirmé sont comptabilisées.</p></div></section>
    {dataError && <div className="auth-feedback auth-error" role="alert">Le registre du portefeuille n’est pas encore accessible. Vérifiez que le schéma AdEarn a été installé et que les vues/tables sont exposées à la Data API.</div>}
    <div className="wallet-hero">
      <div><span>SOLDE DISPONIBLE <span className="wallet-demo">REGISTRE</span></span>
        {dataError ? <strong>Indisponible</strong> : balances.length > 0 ? balances.map(row => <strong key={row.currency_code}>{money(row.balance, row.currency_code)}</strong>) : <strong>0 <small>crédit confirmé</small></strong>}
        <p>Le solde est calculé depuis les écritures financières enregistrées côté serveur.</p>
      </div>
      <div className="wallet-hero-icon"><WalletIcon size={40}/></div>
    </div>
    <div className="demo-alert"><BadgeInfo size={17}/><span><b>Retraits non activés.</b> Aucun moyen de paiement n'est encore connecté. Les seuils, frais et délais seront affichés avant toute activation.</span></div>
    {!dataError && balances.length > 0 && <section className="wallet-balance-grid">
      {balances.map(row => <article className="panel-card wallet-balance-card" key={row.currency_code}>
        <span>{row.currency_code}</span><strong>{money(row.balance, row.currency_code)}</strong>
        <small>Récompenses confirmées : {money(row.lifetime_task_rewards, row.currency_code)}</small>
        <small>Retraits comptabilisés : {money(row.lifetime_withdrawals, row.currency_code)}</small>
      </article>)}
    </section>}
    <section className="panel-card ledger-panel">
      <div className="panel-heading"><div><div className="eyebrow">TRANSPARENCE</div><h2>Historique des mouvements</h2></div><span className="soon-label">{ledger.length} OPÉRATION{ledger.length > 1 ? "S" : ""}</span></div>
      {dataError ? null : ledger.length > 0 ? <div className="ledger-list">{ledger.map(entry => <div className="ledger-row" key={entry.id}>
        <span className={entry.direction === "credit" ? "ledger-mark ledger-credit" : "ledger-mark ledger-debit"}><CircleDollarSign size={18}/></span>
        <div className="ledger-row-copy"><b>{entry.description || typeLabels[entry.entry_type] || "Mouvement"}</b><small>{typeLabels[entry.entry_type] || entry.entry_type} · {dateLabel(entry.created_at)}</small></div>
        <strong className={entry.direction === "credit" ? "ledger-amount-credit" : "ledger-amount-debit"}>{entry.direction === "credit" ? "+" : "−"}{money(entry.amount, entry.currency_code)}</strong>
      </div>)}</div> : <div className="ledger-empty"><span><CircleDollarSign size={28}/></span><b>Aucun mouvement pour le moment</b><p>Les récompenses apparaîtront ici uniquement après vérification et inscription au registre.</p><Link href="/tasks">Découvrir les missions <ArrowUpRight size={14}/></Link></div>}
    </section>
    <div className="wallet-terms"><ShieldCheck size={19}/><p><b>Notre règle :</b> aucune récompense n'est créditée sur la seule base d'un clic ou d'une action dans le navigateur. La validation doit être confirmée côté serveur.</p></div>
  </PortalShell>;
}
