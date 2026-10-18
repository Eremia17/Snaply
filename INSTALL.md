# Erëmīa : installation et premier lancement

## 1. Créer le projet Expo (une seule fois)

    npx create-expo-app@latest eremia --template blank-typescript
    cd eremia

## 2. Installer les dépendances

    npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-image-picker expo-file-system expo-sharing expo-document-picker @react-native-async-storage/async-storage @supabase/supabase-js react-native-url-polyfill @expo/vector-icons
    npm pkg set main=expo-router/entry

## 3. Copier les fichiers de ce dossier

Dans le projet `eremia`, remplacez ou ajoutez :

- le dossier `app/`
- le dossier `src/`
- le dossier `assets/`
- `app.json`
- `tsconfig.json`

Supprimez `App.tsx` s'il existe (expo-router utilise le dossier `app/`).

## 4. Configurer Supabase

Copiez `.env.example` en `.env` et remplacez les valeurs :

    EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

Ne mettez jamais dans ce fichier une clé secrète ou une clé d'API externe.

## 5. Lancer l'application

    npx expo start -c

Scannez le QR code avec Expo Go sur votre téléphone.

## Ce qui fonctionne tout de suite

- Connexion et inscription (compte Supabase existant)
- Ma liste, favoris et historique (enregistrés sur le téléphone)
- Listes personnelles, avis, commentaires, likes
- Profil, photo, profil public, membres
- Export, import et suppression des données
- Pages d'aide, de confidentialité et conditions

## Ce qui utilise des exemples en attendant les API

- Catalogue, accueil, tendances, recherche, calendrier, classiques, fiches (fichier `src/lib/catalog.ts`)
- Sports en direct (fichier `app/sports.tsx`)

Ces données seront remplacées par TMDB, MangaDex et l'API sportive lors de l'étape des API.