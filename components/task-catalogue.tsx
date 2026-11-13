"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Search, SlidersHorizontal, X } from "lucide-react";

type Task = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "survey" | "audio" | "microtask" | "video";
  reward_amount: number | string;
  currency_code: string;
  estimated_minutes: number | null;
  starts_at: string | null;
};

const categories = [
  { id: "all", label: "Toutes" },
  { id: "survey", label: "Sondages" },
  { id: "audio", label: "Audio" },
  { id: "microtask", label: "Micro-missions" },
  { id: "video", label: "Vidéos" },
] as const;

const categoryLabels: Record<Task["category"], string> = {
  survey: "Sondage & étude",
  audio: "Audio & voix",
  microtask: "Micro-mission",
  video: "Vidéo sponsorisée",
};

function rewardLabel(amount: number | string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toLocaleString("fr-FR")} ${currency}`;
  }
}

export default function TaskCatalogue({ tasks }: { tasks: Task[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    return tasks.filter(task => {
      const matchesCategory = category === "all" || task.category === category;
      const matchesSearch = !term || `${task.title} ${task.description} ${categoryLabels[task.category]}`.toLocaleLowerCase("fr").includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [tasks, search, category]);

  return <>
    <div className="catalog-tools">
      <label className="catalog-search"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une mission…" aria-label="Rechercher une mission"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche"><X size={15}/></button>}</label>
      <div className="catalog-filter-label"><SlidersHorizontal size={14}/> FILTRER PAR CATÉGORIE</div>
      <div className="catalog-filter-chips">
        {categories.map(item => <button type="button" key={item.id} className={category === item.id ? "selected" : ""} onClick={() => setCategory(item.id)}>{item.label}<span>{item.id === "all" ? tasks.length : tasks.filter(task => task.category === item.id).length}</span></button>)}
      </div>
    </div>
    {filtered.length > 0 ? <div className="live-task-grid">
      {filtered.map(task => <article className="live-task-card" key={task.id}>
        <div className="live-task-card-top"><span className={`task-category category-${task.category}`}>{categoryLabels[task.category]}</span><span className="task-live-dot">{task.starts_at && new Date(task.starts_at).getTime() > Date.now() ? "À VENIR" : "DISPONIBLE"}</span></div>
        <h3>{task.title}</h3>
        <p>{task.description}</p>
        <div className="live-task-meta"><span><Clock3 size={14}/>{task.estimated_minutes ? `${task.estimated_minutes} min` : "Durée variable"}</span><strong>{rewardLabel(task.reward_amount, task.currency_code)}</strong></div>
        <Link href={`/tasks/${task.id}`} className="live-task-link">Voir les détails <ArrowUpRight size={15}/></Link>
      </article>)}
    </div> : <div className="catalog-filter-empty"><Search size={23}/><b>Aucune mission ne correspond.</b><p>Essayez un autre mot ou une autre catégorie.</p><button type="button" onClick={() => { setSearch(""); setCategory("all"); }}>Effacer les filtres</button></div>}
  </>;
}
