# Erëmīa / Snaply

Application mobile Expo, React Native et TypeScript.

## Fonctionnalités présentes dans le code

- Application native Expo / React Native / TypeScript avec navigation par onglets.
- Univers Films, Animés manga, Animés occidentaux et Séries.
- Recherche distante avec filtres de type, note et année.
- Fiches détaillées, bandes-annonces, casting, recommandations, titres liés et lecture via WebView.
- Favoris, historique local, paramètres et écrans communautaires.
- Fonctions Supabase Edge pour le catalogue, les fiches, les filtres, les chapitres manga et les informations complémentaires.

## Configuration requise

- URL du projet Supabase et clé publique/publishable côté application.
- Secret serveur `TMDB_API_KEY` pour les fonctions Edge `catalog` et `browse`.
- Déploiement des fonctions Edge dans le projet Supabase concerné.
- Configuration des secrets GitHub Actions pour intégrer le backend dans l'APK généré.

Les fonctionnalités connectées et la lecture de sources externes doivent être testées sur appareil avec les services configurés. Le code présent dans GitHub ne prouve pas à lui seul que le backend est déployé ou que toutes les sources externes sont disponibles.

## Installation

```sh
npm install
npx expo install --fix
```

Copiez `.env.example` vers `.env` et remplissez les valeurs de votre projet Supabase avant de tester les fonctionnalités connectées. Ne commitez jamais `.env`.

## Lancement

```sh
npx expo start -c
```

Ouvrez le projet avec Expo Go. Pour les commandes détaillées, consultez [INSTALL.md](./INSTALL.md).

## Vérifications

```sh
npx expo install --check
npm run typecheck
npx expo export --platform android
```

Le fait que le bundle soit généré ne remplace pas les tests fonctionnels sur un appareil Android.
