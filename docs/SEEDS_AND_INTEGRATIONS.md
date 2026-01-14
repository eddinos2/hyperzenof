## Seeds et Intégrations pour HyperZenOF

Ce document décrit comment utiliser les données de démonstration et configurer les intégrations externes.

---

### 1. Seeds de démonstration

Les seeds permettent de créer rapidement un environnement de test avec des données réalistes.

#### Exécuter les seeds

Si vous avez créé un script SQL de seed dans `supabase/seeds/`, vous pouvez l'exécuter via :

```sh
# Via psql directement
psql YOUR_SUPABASE_DB_URL < supabase/seeds/demo_data.sql

# Ou via Supabase CLI (si configuré)
supabase db reset  # ⚠️ ATTENTION : supprime toutes les données !
```

> **Note** : Les seeds doivent être idempotents (utiliser `ON CONFLICT DO NOTHING` ou vérifier l'existence avant insertion).

---

### 2. Fichiers CSV de référence

Le projet contient des fichiers CSV de démonstration dans `public/` :

- `listing_professeurs_2025_2026.csv` - Exemple de listing de professeurs pour import
- `exemple_facture_prof.csv` - Exemple de facture pour import
- `reference_data_menu.csv` - Données de référence pour les menus

Ces fichiers contiennent des **données anonymisées** pour la démonstration uniquement.

---

### 3. Intégration Resend (Emails)

HyperZenOF utilise Resend pour l'envoi d'emails (notifications, accès, etc.).

#### Configuration

1. Créer un compte sur [Resend](https://resend.com)
2. Récupérer votre clé API
3. Configurer dans `.env` :
   ```sh
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=HYPERZENOF <onboarding@resend.dev>
   ```

#### En production

- Vérifier votre domaine dans Resend
- Utiliser un email vérifié : `HYPERZENOF <noreply@votredomaine.com>`
- Configurer les variables d'environnement dans Supabase (Edge Functions)

---

### 4. Import de données

#### Import de professeurs

Utiliser la fonction Edge `bulk-import-teachers` avec un CSV au format :

```csv
Nouveau prof ?,Prénom,NOM,MAIL,TEL,CAMPUS
Non,Jean,DEMO,jean.demo@example.com,06 12 34 56 78,DOUAI
```

#### Import de factures

Utiliser la fonction Edge `import-invoice` avec un CSV au format attendu.

Voir `public/exemple_facture_prof.csv` pour un exemple de format.

---

### 5. Fonctions Edge disponibles

- `assign-teachers` - Assignation automatique de professeurs
- `bulk-import-teachers` - Import en masse de professeurs depuis CSV
- `create-user` - Création d'utilisateur
- `create-real-users` - Création d'utilisateurs réels
- `delete-invoice` - Suppression de facture
- `delete-users` - Suppression d'utilisateurs
- `generate-temp-passwords` - Génération de mots de passe temporaires
- `import-invoice` - Import de factures depuis CSV
- `reset-user-passwords` - Réinitialisation de mots de passe
- `send-access-emails` - Envoi d'emails d'accès
- `verify-login` - Vérification de connexion

Toutes ces fonctions nécessitent les variables d'environnement configurées dans Supabase.

