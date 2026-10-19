const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const AL = "https://graphql.anilist.co";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function tmdb(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(TMDB + path);
  url.searchParams.set("api_key", Deno.env.get("TMDB_API_KEY") ?? "");
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

async function anilist(query: string, variables: Record<string, unknown>): Promise<any> {
  const r = await fetch(AL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`AniList ${r.status}`);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message ?? "AniList");
  return j.data;
}

async function genreNames(type: "movie" | "tv"): Promise<Record<number, string>> {
  const d = await tmdb(`/genre/${type}/list`);
  return Object.fromEntries(d.genres.map((g: any) => [g.id, g.name]));
}

function fromTmdb(x: any, kind: string, names: Record<number, string>) {
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
  };
}

const ANI_FIELDS = `id title { romaji english } coverImage { large } startDate { year } genres averageScore description(asHtml: false)`;

const ANI_GENRES_FR: Record<string, string> = {
  Action: 'Action', Adventure: 'Aventure', Comedy: 'Comédie', Drama: 'Drame', Ecchi: 'Ecchi', Fantasy: 'Fantastique',
  Horror: 'Horreur', MahouShoujo: 'Magical girl', Mecha: 'Mecha', Music: 'Musique', Mystery: 'Mystère',
  Psychological: 'Psychologique', Romance: 'Romance', SciFi: 'Science-fiction', SliceOfLife: 'Tranche de vie',
  Sports: 'Sport', Supernatural: 'Surnaturel', Thriller: 'Thriller',
};

function fromAni(m: any) {
  const desc = String(m.description ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    kind: "manga",
    id: String(m.id),
    title: m.title?.english ?? m.title?.romaji ?? "",
    poster: m.coverImage?.large ?? null,
    year: m.startDate?.year ? String(m.startDate.year) : null,
    genres: (m.genres ?? []).slice(0, 4).map((g: string) => ANI_GENRES_FR[g.replaceAll(' ', '')] ?? g),
    rating: m.averageScore ? Math.round(m.averageScore) / 10 : 0,
    synopsis: desc,
  };
}

// Extras des animés japonais : AniList pour les personnages/relations, TMDB en complément si le titre correspond exactement.
async function animeExtras(id: string) {
  const data = await anilist(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english }
        coverImage { large }
        startDate { year }
        genres
        averageScore
        description(asHtml: false)
        trailer { id site }
        characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
          edges { node { name { full } image { large } } }
        }
        relations {
          edges {
            relationType(version: 2)
            node {
              id type
              title { romaji english }
              coverImage { large }
              startDate { year }
              genres
              averageScore
              description(asHtml: false)
            }
          }
        }
      }
    }`,
    { id: Number(id) },
  );
  const m = data.Media;
  if (!m) return { trailer: null, cast: [], providers: [], constellation: { name: "Animés liés", items: [] }, similar: [], reviews: [] };

  let tmdbData: any = null;
  try {
    const titles = [m.title?.english, m.title?.romaji].filter(Boolean).map((v: string) => String(v).trim());
    const searchTitle = titles[0] ?? titles[1];
    if (searchTitle) {
      const search = await tmdb("/search/tv", { query: searchTitle, include_adult: "false" });
      const normalize = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const exact = (search.results ?? []).find((x: any) =>
        [x.name, x.original_name].some((v: unknown) => titles.some((t: string) => normalize(v) === normalize(t)))
      );
      if (exact?.id) {
        tmdbData = await tmdb(`/tv/${exact.id}`, {
          append_to_response: "videos,credits,recommendations,watch/providers,reviews",
          include_video_language: "fr,en,null",
        });
      }
    }
  } catch {
    // AniList reste utilisable si TMDB ne trouve pas de correspondance ou est indisponible.
  }

  const yt: any[] = (tmdbData?.videos?.results ?? []).filter((v: any) => v.site === "YouTube");
  const tmdbTrailer =
    yt.find((v: any) => v.type === "Trailer" && v.iso_639_1 === "fr") ??
    yt.find((v: any) => v.iso_639_1 === "fr") ??
    yt.find((v: any) => v.type === "Trailer") ??
    yt[0];
  const trailer = m.trailer?.site === "youtube" ? m.trailer.id : tmdbTrailer?.key ?? null;

  const characters = (m.characters?.edges ?? []).map((e: any) => ({
    name: e.node?.name?.full ?? "Personnage",
    character: "",
    photo: e.node?.image?.large ?? null,
  }));
  const cast = characters.length ? characters : (tmdbData?.credits?.cast ?? []).slice(0, 12).map((c: any) => ({
    name: c.name,
    character: c.character ?? "",
    photo: c.profile_path ? IMG + c.profile_path : null,
  }));

  const related = (m.relations?.edges ?? [])
    .filter((e: any) => e.node?.type === "ANIME" && String(e.node.id) !== String(id))
    .slice(0, 12)
    .map((e: any) => fromAni(e.node));
  const recommendations = (tmdbData?.recommendations?.results ?? []).slice(0, 12).map((x: any) => ({
    kind: "manga",
    id: String(x.id),
    title: x.name ?? x.original_name ?? "",
    poster: x.poster_path ? IMG + x.poster_path : null,
    year: String(x.first_air_date ?? "").slice(0, 4) || null,
    genres: [],
    rating: Math.round((x.vote_average ?? 0) * 10) / 10,
    synopsis: x.overview ?? "",
  }));
  return {
    trailer,
    cast,
    providers: (tmdbData?.["watch/providers"]?.results?.FR?.flatrate ?? []).map((p: any) => ({
      name: p.provider_name,
      logo: p.logo_path ? IMG + p.logo_path : null,
    })),
    constellation: { name: related.length ? "Animés liés" : "Titres liés", items: related },
    similar: recommendations,
    reviews: (tmdbData?.reviews?.results ?? []).slice(0, 5).map((r: any) => ({
      author: r.author ?? "Anonyme",
      rating: r.author_details?.rating ?? null,
      date: String(r.created_at ?? "").slice(0, 10),
      content: String(r.content ?? "").slice(0, 500),
    })),
  };
}

// Bande-annonce, personnages, disponibilité, critiques et constellation depuis la source adaptée
async function extras(kind: string, id: string) {
  if (kind === "manga") return animeExtras(id);
  const type = kind === "film" ? "movie" : "tv";
  const [d, names] = await Promise.all([
    tmdb(`/${type}/${id}`, { append_to_response: "videos,credits,recommendations,watch/providers,reviews", include_video_language: "fr,en,null" }),
    genreNames(type),
  ]);
  const yt: any[] = (d.videos?.results ?? []).filter((v: any) => v.site === "YouTube");
  // Priorité aux bandes-annonces en français (VF), puis aux versions originales en repli.
  const trailerVideo =
    yt.find((v: any) => v.type === "Trailer" && v.iso_639_1 === "fr") ??
    yt.find((v: any) => v.iso_639_1 === "fr") ??
    yt.find((v: any) => v.type === "Trailer") ??
    yt[0];

  let constellation: { name: string; items: any[] } = { name: "Titres liés", items: [] };
  if (d.belongs_to_collection) {
    const c = await tmdb(`/collection/${d.belongs_to_collection.id}`);
    constellation = {
      name: c.name ?? "Même saga",
      items: (c.parts ?? [])
        .filter((x: any) => String(x.id) !== String(id))
        .slice(0, 12)
        .map((x: any) => fromTmdb(x, kind, names)),
    };
  } else {
    const director = (d.credits?.crew ?? []).find((c: any) => c.job === "Director");
    if (kind === "film" && director) {
      const pc = await tmdb(`/person/${director.id}/movie_credits`);
      const films = (pc.crew ?? [])
        .filter((c: any) => c.job === "Director" && String(c.id) !== String(id))
        .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 12);
      if (films.length) constellation = { name: `Même réalisateur · ${director.name}`, items: films.map((x: any) => fromTmdb(x, kind, names)) };
    }
    if (constellation.items.length === 0) {
      constellation.items = (d.recommendations?.results ?? []).slice(0, 12).map((x: any) => fromTmdb(x, kind, names));
    }
  }

  return {
    trailer: trailerVideo ? trailerVideo.key : null,
    cast: (d.credits?.cast ?? []).slice(0, 12).map((c: any) => ({
      name: c.name,
      character: c.character ?? "",
      photo: c.profile_path ? IMG + c.profile_path : null,
    })),
    providers: (d["watch/providers"]?.results?.FR?.flatrate ?? []).map((p: any) => ({
      name: p.provider_name,
      logo: p.logo_path ? IMG + p.logo_path : null,
    })),
    constellation,
    similar: (d.recommendations?.results ?? []).slice(0, 12).map((x: any) => fromTmdb(x, kind, names)),
    reviews: (d.reviews?.results ?? []).slice(0, 5).map((r: any) => ({
      author: r.author ?? "Anonyme",
      rating: r.author_details?.rating ?? null,
      date: String(r.created_at ?? "").slice(0, 10),
      content: String(r.content ?? "").slice(0, 500),
    })),
  };
}

async function tmdbPair(path: string, params: Record<string, string>, page: number): Promise<any> {
  const [a, b] = await Promise.all([
    tmdb(path, { ...params, page: String(page * 2 - 1) }),
    tmdb(path, { ...params, page: String(page * 2) }),
  ]);
  return { results: [...a.results, ...b.results], total_pages: Math.ceil(a.total_pages / 2) };
}

const MD = "https://api.mangadex.org";
const MD_HEADERS = { "User-Agent": "Eremia/1.0 (app mobile)" };

async function mdGet(path: string): Promise<any> {
  const r = await fetch(`${MD}${path}`, { headers: MD_HEADERS });
  if (!r.ok) throw new Error(`MangaDex ${r.status}`);
  return r.json();
}

// Résout d'abord le titre AniList en véritable identifiant MangaDex, puis charge les chapitres.
async function chapters(mangaId: string, title: string) {
  let resolvedId = mangaId;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(mangaId)) {
    if (!title.trim()) return { items: [] };
    const search = await mdGet(`/manga?title=${encodeURIComponent(title)}&limit=10&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive`);
    const results = search.data ?? [];
    const normalized = title.trim().toLowerCase();
    const exact = results.find((m: any) =>
      Object.values(m.attributes?.title ?? {}).some((v: any) => String(v).trim().toLowerCase() === normalized)
    );
    const match = exact ?? results[0];
    if (!match?.id) return { items: [] };
    resolvedId = match.id;
  }
  const d = await mdGet(
    `/manga/${resolvedId}/feed?translatedLanguage[]=fr&translatedLanguage[]=en&order[chapter]=desc&limit=100&contentRating[]=safe&contentRating[]=suggestive`,
  );
  const seen = new Map<string, any>();
  for (const c of d.data ?? []) {
    const num = String(c.attributes.chapter ?? c.id);
    const lang = c.attributes.translatedLanguage;
    const prev = seen.get(num);
    if (!prev || (lang === "fr" && prev.lang !== "fr")) {
      seen.set(num, { id: c.id, chapter: c.attributes.chapter ?? "—", title: c.attributes.title ?? "", lang });
    }
  }
  return { items: Array.from(seen.values()) };
}

// Adresses des pages d'un chapitre
async function pages(chapterId: string) {
  const s = await mdGet(`/at-home/server/${chapterId}`);
  const useSaver = (s.chapter.dataSaver ?? []).length > 0;
  const files: string[] = useSaver ? s.chapter.dataSaver : s.chapter.data;
  const folder = useSaver ? "data-saver" : "data";
  return { pages: files.map((f: string) => `${s.baseUrl}/${folder}/${s.chapter.hash}/${f}`) };
}

type BrowseFilters = { genre?: string; year?: string; minRating?: number; family?: boolean; short?: boolean; sort?: 'popularity' | 'rating' | 'recent' };

const FILM_GENRES: Record<string, { genre?: number; keyword?: number }> = {
  Romance: { genre: 10749 }, Action: { genre: 28 }, Horreur: { genre: 27 }, Zombie: { keyword: 12377 },
  Comédie: { genre: 35 }, Thriller: { genre: 53 }, 'Science-fiction': { genre: 878 }, Drame: { genre: 18 },
  Aventure: { genre: 12 }, Fantastique: { genre: 14 }, Documentaire: { genre: 99 }, Animation: { genre: 16 },
  Guerre: { genre: 10752 }, Policier: { genre: 80 },
};
const SERIES_GENRES: Record<string, { genre?: number; keyword?: number }> = {
  'Action & Aventure': { genre: 10759 }, Comédie: { genre: 35 }, Drame: { genre: 18 }, Crime: { genre: 80 },
  Mystère: { genre: 9648 }, 'Science-fiction & Fantastique': { genre: 10765 }, Famille: { genre: 10751 },
  'Guerre & Politique': { genre: 10768 }, Western: { genre: 37 }, Documentaire: { genre: 99 }, Téléréalité: { genre: 10764 },
};
const WEST_GENRES: Record<string, { genre?: number; keyword?: number }> = {
  Action: { genre: 10759 }, Comédie: { genre: 35 }, Aventure: { genre: 10759 },
  'Super-héros': { keyword: 9715 }, 'Science-fiction': { genre: 10765 }, Famille: { genre: 10751 },
};
const MANGA_GENRES: Record<string, { genre?: string; tag?: string }> = {
  Shonen: { tag: 'Shounen' }, Shojo: { tag: 'Shoujo' }, Seinen: { tag: 'Seinen' },
  'Isekai / Réincarnation': { tag: 'Isekai' }, Mecha: { genre: 'Mecha' },
  'Tranche de vie': { genre: 'Slice of Life' }, Horreur: { genre: 'Horror' },
  Sport: { genre: 'Sports' }, Fantastique: { genre: 'Fantasy' }, Comédie: { genre: 'Comedy' },
};

async function list(kind: string, page: number, filters: BrowseFilters = {}) {
  if (kind === "manga") {
    const g = MANGA_GENRES[filters.genre ?? ''];
    const d = await anilist(
      `query ($page: Int, $genre: String, $tag: String, $year: Int, $score: Int, $notGenres: [String], $sort: [MediaSort]) { Page(page: $page, perPage: 40) { pageInfo { hasNextPage } media(type: ANIME, countryOfOrigin: "JP", sort: $sort, isAdult: false, genre: $genre, tag: $tag, seasonYear: $year, averageScore_greater: $score, genre_not_in: $notGenres) { ${ANI_FIELDS} } } }`,
      { page, genre: g?.genre, tag: g?.tag, year: filters.year ? Number(filters.year) : undefined, score: filters.minRating ? Math.max(0, Math.round(filters.minRating * 10) - 1) : undefined, notGenres: filters.family ? ['Horror', 'Ecchi', 'Hentai'] : undefined, sort: filters.sort === 'rating' ? ['SCORE_DESC'] : filters.sort === 'recent' ? ['START_DATE_DESC'] : ['POPULARITY_DESC'] },
    );
    return { items: d.Page.media.map(fromAni), hasMore: d.Page.pageInfo.hasNextPage };
  }

  const recentSort = kind === 'film' ? 'primary_release_date.desc' : 'first_air_date.desc';
  const params: Record<string, string> = { include_adult: 'false', sort_by: filters.sort === 'rating' ? 'vote_average.desc' : filters.sort === 'recent' ? recentSort : 'popularity.desc', 'vote_count.gte': filters.sort === 'rating' ? '300' : filters.sort === 'recent' ? '50' : '20' };
  if (filters.minRating) params['vote_average.gte'] = String(filters.minRating);
  if (kind === 'film') {
    const g = FILM_GENRES[filters.genre ?? ''];
    if (filters.sort === 'recent') params['primary_release_date.lte'] = new Date().toISOString().slice(0, 10);
    if (filters.year) params.primary_release_year = filters.year;
    if (filters.short) params['with_runtime.lte'] = '104';
    if (g?.genre) params.with_genres = String(g.genre);
    if (g?.keyword) params.with_keywords = String(g.keyword);
    const excluded = g?.genre !== 16 ? ['16'] : [];
    if (filters.family) excluded.push('27', '53', '80');
    if (excluded.length) params.without_genres = excluded.join(',');
    const d = await tmdbPair('/discover/movie', params, page);
    const [names] = await Promise.all([genreNames('movie')]);
    return { items: d.results.map((x: any) => fromTmdb(x, 'film', names)), hasMore: page < d.total_pages };
  }

  if (filters.year) params.first_air_date_year = filters.year;
  if (filters.sort === 'recent') params.first_air_date_lte = new Date().toISOString().slice(0, 10);
  if (kind === 'serie') {
    const g = SERIES_GENRES[filters.genre ?? ''];
    if (g?.genre) params.with_genres = String(g.genre);
    params.without_genres = filters.family ? '16,10762,80,9648,10764' : '16,10762';
    const d = await tmdbPair('/discover/tv', params, page);
    const names = await genreNames('tv');
    return { items: d.results.filter((x: any) => !x.genre_ids?.includes(16)).map((x: any) => fromTmdb(x, 'serie', names)), hasMore: page < d.total_pages };
  }

  if (kind === 'occidental') {
    const g = WEST_GENRES[filters.genre ?? ''];
    params.with_genres = g?.genre ? `16,${g.genre}` : '16';
    if (g?.keyword) params.with_keywords = String(g.keyword);
    params.with_origin_country = 'US|GB|FR|CA|BE|IE|AU|DE|ES|IT';
    params.without_genres = filters.family ? '10762,80,9648' : '10762';
    const d = await tmdbPair('/discover/tv', params, page);
    const names = await genreNames('tv');
    const items = d.results.filter((x: any) => x.genre_ids?.includes(16) && !(x.origin_country ?? []).includes('JP'));
    return { items: items.map((x: any) => fromTmdb(x, 'occidental', names)), hasMore: page < d.total_pages };
  }
  return { items: [], hasMore: false };
}

const SDB = "https://www.thesportsdb.com/api/v1/json/3";
const LEAGUES = [
  { id: "4334", name: "Ligue 1" },
  { id: "4328", name: "Premier League" },
  { id: "4387", name: "NBA" },
  { id: "4480", name: "Ligue des champions" },
];

async function sportsRequest(path: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(`${SDB}/${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`TheSportsDB HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Derniers résultats et prochains matchs, par championnat.
async function sports() {
  const results = await Promise.all(LEAGUES.map(async (league) => {
    try {
      const [past, next] = await Promise.all([
        sportsRequest(`eventspastleague.php?id=${league.id}`),
        sportsRequest(`eventsnextleague.php?id=${league.id}`),
      ]);
      const items: any[] = [];
      for (const e of (past.events ?? []).slice(0, 4)) {
        if (!e.strHomeTeam || !e.strAwayTeam || !e.dateEvent) continue;
        items.push({
          league: league.name,
          home: e.strHomeTeam,
          away: e.strAwayTeam,
          homeScore: e.intHomeScore == null ? null : Number(e.intHomeScore),
          awayScore: e.intAwayScore == null ? null : Number(e.intAwayScore),
          date: e.dateEvent,
          time: e.strTime ?? "00:00:00",
          status: "Terminé",
        });
      }
      for (const e of (next.events ?? []).slice(0, 5)) {
        if (!e.strHomeTeam || !e.strAwayTeam || !e.dateEvent) continue;
        items.push({
          league: league.name,
          home: e.strHomeTeam,
          away: e.strAwayTeam,
          homeScore: null,
          awayScore: null,
          date: e.dateEvent,
          time: e.strTime ?? "00:00:00",
          status: "À venir",
        });
      }
      return { items, failed: false };
    } catch {
      return { items: [], failed: true };
    }
  }));

  const items = results.flatMap((r) => r.items);
  if (items.length === 0 && results.every((r) => r.failed)) {
    throw new Error("La source sportive est inaccessible. Réessayez plus tard.");
  }
  items.sort((a, b) => {
    const aTime = Date.parse(`${a.date}T${a.time || "00:00:00"}Z`);
    const bTime = Date.parse(`${b.date}T${b.time || "00:00:00"}Z`);
    const aUpcoming = a.status === "À venir";
    const bUpcoming = b.status === "À venir";
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });
  return { items };
}

function normalizeTitle(value: unknown): string {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

// Pour les animés AniList, retrouver une correspondance TMDB exacte par titre.
// Si aucune correspondance fiable n'existe, ne jamais inventer de saisons.
async function resolveSeriesTmdbId(id: string, kind: string, title: string): Promise<string | null> {
  if (kind !== "manga") return /^\d+$/.test(id) ? id : null;
  if (!/^\d+$/.test(id)) return null;
  const data = await anilist(`query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english native } } }`, { id: Number(id) });
  const media = data.Media;
  if (!media) return null;
  const titles = [media.title?.english, media.title?.romaji, media.title?.native, title].filter(Boolean).map(normalizeTitle);
  for (const queryTitle of [media.title?.english, media.title?.romaji, title].filter(Boolean)) {
    const result = await tmdb("/search/tv", { query: String(queryTitle), include_adult: "false" });
    const match = (result.results ?? []).find((x: any) =>
      [x.name, x.original_name].some((candidate: unknown) => titles.includes(normalizeTitle(candidate)))
    );
    if (match?.id) return String(match.id);
  }
  return null;
}

async function seriesSeasons(id: string, kind: string, title: string) {
  const resolvedId = await resolveSeriesTmdbId(id, kind, title);
  if (!resolvedId) return { seasons: [], unavailable: true };
  const data = await tmdb(`/tv/${resolvedId}`);
  const seasons = (data.seasons ?? [])
    .filter((s: any) => Number(s.season_number) > 0 && Number(s.episode_count) > 0)
    .map((s: any) => ({
      number: Number(s.season_number),
      name: String(s.name ?? `Saison ${s.season_number}`),
      episodeCount: Number(s.episode_count),
    }));
  return { seasons, tmdbId: resolvedId, unavailable: false };
}

async function seriesEpisodes(id: string, kind: string, title: string, seasonNumber: number) {
  if (!Number.isInteger(seasonNumber) || seasonNumber < 1) throw new Error("Saison invalide.");
  const resolvedId = await resolveSeriesTmdbId(id, kind, title);
  if (!resolvedId) return { episodes: [], unavailable: true };
  const data = await tmdb(`/tv/${resolvedId}/season/${seasonNumber}`);
  return {
    episodes: (data.episodes ?? []).filter((e: any) => Number(e.episode_number) > 0).map((e: any) => ({
      number: Number(e.episode_number),
      name: String(e.name ?? `Épisode ${e.episode_number}`),
      airDate: e.air_date ? String(e.air_date) : null,
      overview: String(e.overview ?? ""),
    })),
    unavailable: false,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind ?? "film");
    if (body.action === "chapters") return json(await chapters(String(body.id ?? ""), String(body.title ?? "")));
    if (body.action === "pages") return json(await pages(String(body.chapterId ?? "")));
    if (body.action === "sports") return json(await sports());
    if (body.action === "seasons") return json(await seriesSeasons(String(body.id ?? ""), String(body.kind ?? "serie"), String(body.title ?? "")));
    if (body.action === "episodes") return json(await seriesEpisodes(String(body.id ?? ""), String(body.kind ?? "serie"), String(body.title ?? ""), Number(body.season ?? 1)));
    if (body.action === "extras") return json(await extras(kind, String(body.id ?? "")));
    const page = Math.max(1, Number(body.page ?? 1));
    const filters: BrowseFilters = {
      genre: typeof body.genre === 'string' && body.genre ? body.genre : undefined,
      year: typeof body.year === 'string' && body.year ? body.year : undefined,
      minRating: Number(body.minRating) > 0 ? Number(body.minRating) : undefined,
      sort: ['popularity', 'rating', 'recent'].includes(body.sort) ? body.sort : 'popularity',
      family: body.family === true,
      short: body.short === true,
    };
    return json(await list(kind, page, filters));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});