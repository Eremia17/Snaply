# Ticket Mada 🇲🇬

Plateforme de découverte et de billetterie événementielle pensée d'abord pour Madagascar.

## Objectif

- Application Android/iOS avec Expo + React Native + TypeScript.
- Interface en français et en malgache.
- Événements, organisateurs, commandes et billets numériques.
- QR code unique par billet ; validation côté serveur avant l'entrée.
- Paiements locaux à intégrer uniquement après vérification contractuelle des prestataires et de leurs API.

## Structure

- `apps/mobile` : application Expo (SDK 57, compatible avec le flux Expo Go prévu pour le développement sur téléphone).
- `apps/web` : espace réservé au futur site public/organisateur.
- `supabase/migrations` : schéma SQL versionné.

## Démarrage Android avec Expo Go

1. Installer Node.js sur un ordinateur ou dans un environnement compatible.
2. À la racine : `npm install`.
3. Lancer : `npm run start`.
4. Scanner le QR affiché avec Expo Go. Le téléphone et l'ordinateur doivent pouvoir communiquer sur le même réseau ; le mode tunnel peut consommer davantage de données.

Pour démarrer directement depuis le dossier mobile : `cd apps/mobile && npx expo start`.

## Configuration Supabase

1. Créer un projet Supabase.
2. Copier `.env.example` vers `apps/mobile/.env` et renseigner l'URL ainsi que la clé publique anon/publishable.
3. Appliquer les migrations SQL de `supabase/migrations` depuis l'éditeur SQL Supabase.
4. Ne jamais placer une clé `service_role`, un secret de paiement ou une clé privée dans l'application mobile ou dans Git.

## État du projet

La première base contient une interface mobile de démonstration et le premier schéma de données. L'authentification, les paiements, l'émission des billets, les QR dynamiques, le scanner et le site web seront construits et testés par étapes. Aucun paiement réel n'est activé à ce stade.
