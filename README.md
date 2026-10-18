# Erëmīa / Snaply

Application mobile Expo, React Native et TypeScript.

## État actuel

- Le code source fourni a été importé dans ce dépôt.
- Le manifeste `package.json`, les scripts de lancement, la configuration d'environnement et un contrôle GitHub Actions ont été ajoutés.
- La configuration Expo ne référence plus les images d'assets absentes.
- L'application peut démarrer sans Supabase configuré ; les fonctionnalités nécessitant le backend restent désactivées jusqu'à la configuration.
- Les données réelles, les clés de service et les tests sur téléphone restent à effectuer ensuite.

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
