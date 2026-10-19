# Erëmīa / Snaply — installation et configuration

## 1. Préparer le projet

Le dépôt contient déjà le code Expo / React Native / TypeScript. Ne recréez pas un projet Expo par-dessus.

```sh
git clone https://github.com/Eremia17/Snaply.git
cd Snaply
npm install
npx expo install --fix
```

## 2. Configurer Supabase (nécessaire pour les fonctions connectées)

Dans le tableau de bord du projet Supabase, récupérez :
- l'URL du projet ;
- la clé publique/publishable prévue pour une application cliente.

Copiez `.env.example` vers `.env`, puis renseignez :

```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_votre_cle
```

Pour la construction de l'APK par GitHub Actions, ajoutez aussi ces deux valeurs dans les secrets du dépôt GitHub, avec exactement ces noms :
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Ne placez jamais de clé `service_role`, de clé secrète Supabase ou de clé TMDB dans le code de l'application, dans `.env.example`, ni dans un commit public. Ne partagez pas le vrai fichier `.env`.

Sans ces valeurs, l'interface peut s'ouvrir, mais la connexion, le catalogue distant et certaines fonctions communautaires ne seront pas pleinement opérationnels.

## 3. Configurer TMDB côté serveur

Le code des fonctions Supabase `catalog` et `browse` utilise la variable serveur `TMDB_API_KEY`.

1. Créez/récupérez une clé API TMDB dans votre compte TMDB.
2. Dans le tableau de bord Supabase, ouvrez la gestion des secrets des Edge Functions.
3. Ajoutez le secret `TMDB_API_KEY` avec la valeur de votre clé.

Cette clé doit rester côté serveur : ne la mettez pas dans `EXPO_PUBLIC_...`, dans l'application mobile ou dans GitHub comme fichier texte.

## 4. Vérifier le déploiement des fonctions Supabase

Le dépôt contient les fonctions Edge `catalog` et `browse`. Le workflow GitHub `.github/workflows/deploy-supabase-browse.yml` peut les déployer automatiquement lorsqu'un fichier de ces fonctions ou `supabase/config.toml` change.

Pour activer ce déploiement automatique, ouvrez le dépôt GitHub :
`Settings → Secrets and variables → Actions → New repository secret`
et ajoutez ces deux secrets avec les noms exacts :
- `SUPABASE_ACCESS_TOKEN` : votre token d'accès personnel Supabase ;
- `SUPABASE_PROJECT_ID` : la référence du projet Supabase (Project Ref).

Ces secrets restent dans les paramètres privés du dépôt ; ne les ajoutez jamais au code, à un fichier de configuration commité ou à un message de chat. Le workflow vérifie leur présence avant de déployer `catalog` et `browse`. Après le déploiement, vérifiez l'exécution dans l'onglet **Actions** de GitHub.

Si vous ne souhaitez pas utiliser ce workflow, les fonctions peuvent aussi être déployées avec Supabase CLI depuis un environnement compatible, après connexion et liaison au bon projet.

## 5. Autres sources de données

- AniList : utilisé pour certaines informations d'animés ; aucune clé n'est configurée dans le code actuel.
- MangaDex : utilisé pour le catalogue manga et les couvertures ; aucune clé n'est configurée dans le code actuel.
- VidSrc : utilisé comme source du lecteur vidéo ; aucune clé API n'est déclarée dans le code vérifié. La disponibilité du lecteur dépend du service externe et peut changer indépendamment de l'application.

## 6. Vérifier le projet

```sh
npx expo install --check
npm run typecheck
npx expo export --platform android
```

La génération du bundle ne remplace pas les tests fonctionnels sur téléphone. Il faut tester notamment la connexion, le catalogue, les fiches, les bandes-annonces, la lecture vidéo et les fonctions communautaires avec le vrai projet Supabase.

## 7. APK GitHub Actions

Le workflow de construction produit un APK de débogage et le publie comme artefact GitHub Actions si toutes les étapes réussissent. Il ne publie pas automatiquement l'APK sur le Play Store. L'artefact de construction est temporaire (14 jours selon la configuration actuelle).
