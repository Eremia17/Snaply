# Configuration de l'administration Ticket Mada

## 1. Appliquer les migrations

Dans le tableau de bord Supabase du projet Ticket Mada, ouvre **SQL Editor** et exécute les migrations dans l'ordre :

1. `supabase/migrations/202611090001_auth_profiles_and_organizer_applications.sql`
2. `supabase/migrations/202611090002_admin_organizer_review.sql`

Les migrations initiales du schéma Ticket Mada doivent déjà être appliquées. Ne colle pas les fichiers dans un ordre aléatoire.

## 2. Créer le premier administrateur

1. Inscris-toi normalement dans Ticket Mada avec l'adresse e-mail qui doit administrer la plateforme.
2. Confirme l'adresse e-mail si la confirmation est activée.
3. Dans Supabase SQL Editor, exécute cette requête en remplaçant l'adresse par celle du compte que tu contrôles :

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('admin@example.com')
);
```

4. Vérifie que la requête a modifié exactement une ligne.
5. Déconnecte-toi puis reconnecte-toi dans l'application. Le compte administrateur sera dirigé vers l'écran Administration.

Cette première attribution doit être faite par une personne autorisée dans le tableau de bord Supabase. Ne crée jamais de bouton public « devenir admin ».

## 3. Configuration mobile

Dans l'environnement Expo, configure uniquement :

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

La clé publishable est prévue pour le client, avec les politiques RLS activées. **Ne mets jamais la clé `service_role` dans l'application mobile, dans GitHub ou dans une variable `EXPO_PUBLIC_*`.**

## 4. Vérification

- Un nouveau compte reçoit le rôle `customer`.
- Un utilisateur connecté peut envoyer une demande organisateur.
- Un utilisateur ne peut lire que ses propres demandes, sauf un compte admin.
- Seul un compte admin peut appeler `review_organizer_application`.
- L'approbation change le rôle du demandeur en `organizer`.
- Le refus laisse son rôle en `customer`.
- Les changements de rôle directs depuis le client sont bloqués.

L'interface et les migrations doivent encore être testées sur le projet Supabase réel avant d'ouvrir les inscriptions publiques.
