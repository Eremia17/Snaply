const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const MD = "https://api.mangadex.org";
const UA = { "User-Agent": "Eremia/1.0 (app mobile)" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "film" | "manga" | "occidental" | "serie";
type Item = {
  kind: Kind; id: string; title: string; poster: string | null; backdrop?: string | null; year: string | null;
  genres: string[]; rating: number; synopsis: string; runtime?: string; upcoming?: string;
};

async function tmdb(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(TMDB + path);
  url.searchParams.set("api_key", Deno.env.get("TMDB_API_KEY") ?? "");
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

async function md(path: string, query = ""): Promise<any> {
  const r = await fetch(`${MD}${path}?${query}`, { headers: UA });
  if (!r.ok) throw new Error(`MangaDex ${r.status}`);
  return r.json();
}

async function genres(type: "movie" | "tv"): Promise<Record<number, string>> {
  const d = await tmdb(`/genre/${type}/list`);
  return Object.fromEntries(d.genres.map((g: any) => [g.id, g.name]));
}

const today = () => new Date().toISOString().slice(0, 10);

function fromTmdb(x: any, kind: Kind, names: Record<number, string>): Item {
  const date: string = x.release_date ?? x.first_air_date ?? "";
  return {
    kind,
    id: String(x.id),
    title: x.title ?? x.name ?? "",
    poster: x.poster_path ? IMG + x.poster_path : null,
    backdrop: x.backdrop_path ? `https://image.tmdb.org/t/p/w1280${x.backdrop_path}` : null,
    year: date ? date.slice(0, 4) : null,
    genres: (x.genre_ids ?? []).map((g: number) => names[g]).filter(Boolean),
    rating: Math.round((x.vote_average ?? 0) * 10) / 10,
    synopsis: x.overview ?? "",
    upcoming: date > today() ? date : undefined,
  };
}

function fromTmdbDetail(x: any, kind: Kind): Item {
  const date: string = x.release_date ?? x.first_air_date ?? "";
  const minutes = kind === "film" ? x.runtime : undefined;
  return {
    kind,
    id: String(x.id),
    title: x.title ?? x.name ?? "",
    poster: x.poster_path ? IMG + x.poster_path : null,
    backdrop: x.backdrop_path ? `https://image.tmdb.org/t/p/w1280${x.backdrop_path}` : null,
    year: date ? date.slice(0, 4) : null,
    genres: (x.genres ?? []).map((g: any) => g.name),
    rating: Math.round((x.vote_average ?? 0) * 10) / 10,
    synopsis: x.overview ?? "",
    runtime: minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : undefined,
  };
}

function mdCover(m: any): string | null {
  const file = m.relationships?.find((r: any) => r.type === "cover_art")?.attributes?.fileName;
  return file ? `https://uploads.mangadex.org/covers/${m.id}/${file}.256.jpg` : null;
}

function fromManga(m: any): Item {
  const a = m.attributes;
  const title = a.title?.fr ?? a.title?.en ?? Object.values(a.title ?? {})[0] ?? "";
  const desc = a.description?.fr ?? a.description?.en ?? "";
  const tags = (a.tags ?? []).map((t: any) => t.attributes?.name?.fr ?? t.attributes?.name?.en).filter(Boolean);
  return {
    kind: "manga",
    id: m.id,
    title: String(title),
    poster: mdCover(m),
    year: a.year ? String(a.year) : null,
    genres: tags.slice(0, 4),
    rating: 0,
    synopsis: desc,
  };
}

async function list(): Promise<Item[]> {
  const [films, series, anime, mangas, gMovie, gTv] = await Promise.all([
    tmdb("/movie/popular"),
    tmdb("/tv/popular"),
    tmdb("/discover/tv", { with_genres: "16", with_original_language: "en", sort_by: "popularity.desc" }),
    md("/manga", "limit=20&order[followedCount]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive"),
    genres("movie"),
    genres("tv"),
  ]);
  return [
    ...films.results.slice(0, 12).map((x: any) => fromTmdb(x, "film", gMovie)),
    ...series.results.slice(0, 12).map((x: any) => fromTmdb(x, "serie", gTv)),
    ...anime.results.slice(0, 12).map((x: any) => fromTmdb(x, "occidental", gTv)),
    ...mangas.data.map(fromManga),
  ];
}

async function search(q: string, kinds: Kind[]): Promise<Item[]> {
  const want = (k: Kind) => kinds.length === 0 || kinds.includes(k);
  const [multi, gMovie, gTv, mangas] = await Promise.all([
    want("film") || want("serie") ? tmdb("/search/multi", { query: q }) : Promise.resolve({ results: [] }),
    genres("movie"),
    genres("tv"),
    want("manga") ? md("/manga", `title=${encodeURIComponent(q)}&limit=10&includes[]=cover_art`) : Promise.resolve({ data: [] }),
  ]);
  const out: Item[] = [];
  for (const x of multi.results) {
    if (x.media_type === "movie" && want("film")) out.push(fromTmdb(x, "film", gMovie));
    if (x.media_type === "tv") {
      // Comme dans le catalogue principal, les séries animées anglophones
      // sont classées dans l'univers « Animé occidental », pas « Séries ».
      const isWesternAnimation = (x.genre_ids ?? []).includes(16) && x.original_language === "en";
      if (isWesternAnimation && want("occidental")) {
        out.push(fromTmdb(x, "occidental", gTv));
      } else if (!isWesternAnimation && want("serie")) {
        out.push(fromTmdb(x, "serie", gTv));
      }
    }
  }
  if (want("manga")) out.push(...mangas.data.map(fromManga));
  return out;
}

async function detail(kind: Kind, id: string): Promise<Item> {
  if (kind === "manga") {
    const d = await md(`/manga/${id}`, "includes[]=cover_art");
    return fromManga(d.data);
  }
  const x = await tmdb(kind === "film" ? `/movie/${id}` : `/tv/${id}`);
  return fromTmdbDetail(x, kind);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    let result: unknown;
    if (body.action === "search") result = { items: await search(String(body.q ?? ""), body.kinds ?? []) };
    else if (body.action === "detail") result = await detail(body.kind, String(body.id));
    else result = { items: await list() };
    return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});