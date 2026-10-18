# Erëmīa / Snaply — installation et premier lancement

## 1. Préparer le projet

Clonez le dépôt puis entrez dans son dossier :

```sh
git clone https://github.com/Eremia17/Snaply.git
cd Snaply
npm install
npx expo install --fix
```

Le dépôt contient déjà les dossiers `app/`, `src/`, ainsi que `app.json` et `tsconfig.json`. Il ne faut pas recréer un projet Expo par-dessus.

## 2. Configurer Supabase

Copiez `.env.example` vers `.env` et renseignez les valeurs de votre projet Supabase :

```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_votre_cle
```

Utilisez uniquement la clé publique prévue pour le client. Ne mettez jamais une clé `service_role`, une clé secrète ou une clé externe dans l'application. Ne partagez pas le fichier `.env` et ne le poussez pas vers GitHub.

Sans configuration Supabase, l'interface de base peut démarrer, mais la connexion, le catalogue distant et les fonctions communautaires ne sont pas opérationnels.

## 3. Vérifier les dépendances

```sh
npx expo install --check
npm run typecheck
```

## 4. Lancer l'application

```sh
npx expo start -c
```

Ouvrez Expo Go sur Android et connectez-vous au compte Expo si l'application le demande. Le téléphone et l'environnement qui exécute Expo doivent pouvoir communiquer sur le réseau.

## 5. Contrôle de bundle

```sh
npx expo export --platform android
```

Cette commande vérifie que Metro peut produire le bundle Android. Elle ne remplace pas les tests sur téléphone ni la validation des API.

## Éléments à ajouter ultérieurement

- Les vraies sources de données du catalogue, de la recherche et des détails.
- Les clés et la configuration Supabase propres au projet.
- Les icônes et images de marque d'origine si elles sont disponibles.
- Les tests fonctionnels dans Expo Go, puis la préparation de l'APK.
