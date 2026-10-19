# Architecture média Erëmīa

Cette architecture sépare les métadonnées (TMDB), le lecteur natif et les fichiers hors ligne.

## Métadonnées TMDB et saisons/épisodes

Les appels TMDB restent côté Supabase Edge Functions afin de ne pas exposer `TMDB_API_KEY` dans l'application :
- `src/lib/catalog.ts`: `fetchDetail`, `fetchSeriesMetadata`, `fetchSeriesEpisodes`.
- `supabase/functions/browse/index.ts`: actions `seasons` et `episodes`.
- `src/components/SeasonEpisodePicker.tsx`: sélecteur réutilisable des saisons et épisodes réels renvoyés par les métadonnées.

TMDB ne fournit pas les fichiers vidéo. Un ID TMDB ne doit donc jamais être transformé directement en URL de lecture.

## Lecteur natif

Installer la dépendance Expo correspondant au SDK du projet avec `npx expo install expo-video`.

`src/components/NativeVideoPlayer.tsx` utilise `expo-video`, accepte une liste ordonnée de sources HTTPS directes autorisées et passe à la suivante si la lecture échoue. Les sources doivent pointer vers un fichier média direct ou une playlist supportée par le lecteur, pas vers une page HTML d'intégration.

Exemple :

```tsx
<NativeVideoPlayer
  title={title}
  sources={[
    { id: 'provider-a', label: 'Fournisseur officiel', uri: licensedMp4Url },
    { id: 'provider-b', label: 'Secours officiel', uri: licensedHlsUrl, contentType: 'hls' },
  ]}
/>
```

Les variables `licensedMp4Url` et `licensedHlsUrl` doivent être fournies par un service de streaming autorisé. Ne place pas de clé privée ou de jeton permanent dans l'application mobile.

## Téléchargement hors ligne

- `src/lib/offlineDownloads.ts` télécharge des fichiers directs MP4/M4V/MOV autorisés dans le stockage privé de l'application.
- Le callback fournit les octets écrits, les octets attendus et un pourcentage réel quand le serveur fournit la taille totale.
- `listOfflineVideos()` énumère les vidéos enregistrées.
- `deleteOfflineVideo(id)` supprime le fichier local et son entrée d'index.
- `src/components/OfflineDownloadButton.tsx` affiche l'état, la progression et les erreurs.

Exemple de lecture hors ligne :

```tsx
<NativeVideoPlayer
  title={savedVideo.title}
  sources={[{ id: savedVideo.id, label: 'Fichier hors ligne', uri: savedVideo.uri }]}
/>
```

Les playlists HLS/DASH ne sont pas téléchargées comme un simple fichier MP4. Pour ces formats, il faut utiliser le mécanisme hors ligne officiellement pris en charge par le fournisseur. Les URLs de lecteurs intégrés ne sont pas des fichiers téléchargeables directs.

## État d'intégration

Les composants et fonctions sont ajoutés à la branche de travail. Ils ne remplacent pas automatiquement le lecteur actuellement présent dans `app/titre/[kind]/[id].tsx`. Le raccordement final exige une source vidéo autorisée fournie par un service adapté. Les composants doivent encore être vérifiés par `npx tsc --noEmit` et testés sur appareil.
