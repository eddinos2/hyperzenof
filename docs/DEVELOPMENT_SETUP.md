## Setup de développement pour HyperZenOF

Ce document décrit comment un développeur peut cloner le projet, connecter **son propre projet Supabase**
et recréer la base de données à l'identique, sans dépendre de l'environnement d'origine.

---

### 1. Pré-requis

- **Node.js** 18+ (recommandé LTS)
- **npm** ou **pnpm**
- **Compte Supabase** (gratuit possible)
- **Supabase CLI** installé (`supabase` dans votre PATH)

---

### 2. Cloner le projet

```sh
git clone https://github.com/eddinos2/hyperzenof.git
cd hyperzenof
npm install
```

---

### 3. Créer votre projet Supabase

1. Aller sur l'interface Supabase et créer un **nouveau projet**.
2. Récupérer :
   - l'URL du projet (`https://YOUR_PROJECT_ID.supabase.co`)
   - la **anon key** (clé publique)
   - la **service role key** (clé privée, à garder côté serveur uniquement)
3. Optionnel : récupérer l'URL de connexion Postgres (`postgres://...@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require`)

---

### 4. Configurer vos variables d'environnement

Créer un fichier `.env` **à la racine** du projet (il est ignoré par Git) :

```sh
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Optionnel : utilisé seulement par des outils ou scripts côté serveur/CLI
SUPABASE_DB_URL=postgres://postgres:password@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require

# Pour l'envoi d'emails (fonctions send-access-emails, etc.)
RESEND_API_KEY=YOUR_RESEND_API_KEY
RESEND_FROM_EMAIL=HYPERZENOF <onboarding@resend.dev>
```

> Ne commitez jamais ce fichier. Chaque développeur doit utiliser ses propres secrets ou un gestionnaire de secrets.
> Vous pouvez copier `.env.example` vers `.env` et remplir les valeurs.

---

### 5. Lier le projet local à votre projet Supabase

Dans le dossier du projet :

```sh
supabase link --project-ref YOUR_PROJECT_ID
```

Cela permet à la CLI d'appliquer les migrations sur **votre** base Supabase.

---

### 6. Rejouer les migrations pour recréer la base

Le schéma complet de la base est décrit dans :

- `supabase/migrations/*.sql` (source de vérité)
- `src/integrations/supabase/types.ts` (types générés côté frontend)

Pour appliquer toutes les migrations sur votre projet :

```sh
supabase db push
```

Le résultat attendu :

- Toutes les tables décrites dans `types.ts` existent dans le schéma `public`.
- Les fonctions SQL sont présentes.
- Les politiques RLS et triggers créés dans les migrations sont appliqués.

---

### 7. Configurer les Edge Functions Supabase

Les fonctions se trouvent dans `supabase/functions/*` (TypeScript pour Deno).

Depuis la racine du projet :

```sh
supabase functions deploy assign-teachers
supabase functions deploy bulk-import-teachers
supabase functions deploy create-user
supabase functions deploy create-real-users
supabase functions deploy delete-invoice
supabase functions deploy delete-users
supabase functions deploy generate-temp-passwords
supabase functions deploy import-invoice
supabase functions deploy reset-user-passwords
supabase functions deploy send-access-emails
supabase functions deploy verify-login
```

> Adaptez la liste ci-dessus selon les fonctions que vous utilisez réellement en environnement de dev.

Ensuite, configurez les **variables d'environnement** des Edge Functions dans l'interface Supabase
(`Project Settings` → `API` / `Functions`), au minimum :

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (pour les fonctions d'envoi d'emails)
- `RESEND_FROM_EMAIL` (optionnel, par défaut: `HYPERZENOF <onboarding@resend.dev>`)

---

### 8. (Optionnel) Injecter des données de démonstration

Voir `docs/SEEDS_AND_INTEGRATIONS.md` pour les scripts de seed SQL permettant de créer des données de test.

---

### 9. Lancer le frontend en local

```sh
npm run dev
```

L'application sera accessible (par défaut) sur `http://localhost:8080`.

---

### 10. Notes sur la génération de types Supabase

Le fichier `src/integrations/supabase/types.ts` est généré à partir du schéma Postgres
via la CLI Supabase. Pour le régénérer après modification du schéma :

```sh
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/integrations/supabase/types.ts
```

Cela permet de garder les types TypeScript synchronisés avec votre schéma.

