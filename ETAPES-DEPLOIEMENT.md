# 🚀 Zitoun POS — Guide de Déploiement Complet

## Ce que vous aurez à la fin

| Service | URL |
|---------|-----|
| Application (serveurs) | `https://zitoun-pos-frontend.onrender.com` |
| Écran cuisine | `https://zitoun-pos-frontend.onrender.com/kitchen` |
| API backend | `https://zitoun-pos-api.onrender.com/api/menu` |
| Base de données | Neon PostgreSQL (gratuit, permanent) |

---

## ═══ ÉTAPE 1 — Neon (base de données) ═══

**→ https://neon.tech** (gratuit, sans expiration)

1. Créer un compte (avec Google ou email)
2. Cliquer **"New Project"**
   - Name : `zitoun-pos`
   - Region : **EU Frankfurt** (le plus proche)
   - Cliquer **"Create Project"**
3. Dans le tableau de bord → **"Connection Details"**
4. Dans le menu déroulant, choisir **"JDBC"**
5. Copier la connection string — ressemble à :
   ```
   jdbc:postgresql://ep-cold-paper-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
6. **Garder cette URL** — elle sera utilisée à l'étape 3

---

## ═══ ÉTAPE 2 — GitHub ═══

**→ https://github.com** (gratuit)

1. Créer un compte GitHub si vous n'en avez pas
2. Cliquer **"New repository"** (bouton vert)
   - Repository name : `zitoun-pos`
   - Visibility : **Public** (obligatoire pour Render gratuit)
   - Cliquer **"Create repository"**

3. Sur votre ordinateur, ouvrir un terminal dans le dossier `zitoun-pos` :

```bash
git init
git add .
git commit -m "🫒 Zitoun POS — initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/zitoun-pos.git
git push -u origin main
```

> Remplacer `VOTRE-USERNAME` par votre nom d'utilisateur GitHub

---

## ═══ ÉTAPE 3 — Render (hébergement) ═══

**→ https://render.com** (gratuit)

1. Créer un compte → se connecter avec **GitHub** (plus simple)
2. Dans le dashboard → cliquer **"New +"** → **"Blueprint"**
3. Cliquer **"Connect a repository"** → sélectionner `zitoun-pos`
4. Render détecte `render.yaml` → affiche 2 services à créer
5. Cliquer **"Apply"** → laisser tourner 5-10 minutes

### Ajouter la base de données Neon

Après le déploiement :
1. Dashboard Render → service **`zitoun-pos-api`**
2. Onglet **"Environment"**
3. Variable `DATABASE_URL` → cliquer l'icône de crayon
4. Coller la JDBC URL copiée depuis Neon
5. Cliquer **"Save Changes"** → le backend redémarre automatiquement

---

## ═══ ÉTAPE 4 — Mettre à jour l'URL du frontend ═══

Après déploiement, l'URL exacte du backend est connue.

Ouvrir le fichier :
```
frontend/src/environments/environment.prod.ts
```

Remplacer par l'URL réelle de votre backend :
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://zitoun-pos-api.onrender.com/api',
  wsUrl:  'https://zitoun-pos-api.onrender.com/ws'
};
```

Puis pousser sur GitHub :
```bash
git add .
git commit -m "fix: update backend URL"
git push
```
→ Render redéploie automatiquement en 3-5 minutes ✅

---

## ═══ ÉTAPE 5 — Vérification ═══

| Test | URL | Résultat attendu |
|------|-----|-----------------|
| API menu | `.../api/menu` | JSON avec 18 articles |
| API tables | `.../api/tables` | JSON avec 10 tables |
| Application | `zitoun-pos-frontend.onrender.com` | Interface complète |
| Cuisine | `.../kitchen` | Écran 3 colonnes |

---

## ═══ Utilisation sur tablette ═══

### Mode portrait (recommandé pour les serveurs)
1. Ouvrir Chrome sur la tablette
2. Aller sur `https://zitoun-pos-frontend.onrender.com`
3. Menu Chrome (⋮) → **"Ajouter à l'écran d'accueil"**
4. L'app s'ouvre en plein écran — barre de navigation en bas
5. La rotation fonctionne automatiquement

### Écran cuisine (mode paysage recommandé)
1. Aller sur `https://zitoun-pos-frontend.onrender.com/kitchen`
2. Appuyer sur **F11** ou activer le plein écran du navigateur
3. Les commandes apparaissent en temps réel

---

## ═══ Mises à jour ═══

Chaque modification de code → `git push` → Render redéploie :
```bash
git add .
git commit -m "description de la modification"
git push
```

---

## ═══ ⚠️ Limites du plan gratuit ═══

| Limitation | Solution |
|-----------|----------|
| Backend s'endort après 15 min | Premier accès = 60 sec de démarrage |
| 750h/mois de runtime | Suffisant pour 1 service actif |
| Base Neon : 0.5 GB | Largement suffisant pour un restaurant |

→ Pour éviter le sleep : Render **Starter** à **$7/mois**

---

## ═══ API complète ═══

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/menu` | Liste du menu |
| POST | `/api/menu` | Ajouter un article |
| PUT | `/api/menu/{id}` | Modifier un article |
| DELETE | `/api/menu/{id}` | Supprimer un article |
| GET | `/api/tables` | État des tables |
| POST | `/api/tables` | Ajouter une table |
| DELETE | `/api/tables/{id}` | Supprimer une table |
| GET | `/api/orders` | Toutes les commandes |
| GET | `/api/orders/active` | Commandes cuisine |
| POST | `/api/orders` | Créer une commande |
| POST | `/api/orders/{id}/send-kitchen` | Envoyer en cuisine |
| PATCH | `/api/orders/{id}/status` | Changer statut |
| GET | `/api/settings` | Paramètres du restaurant |
| PUT | `/api/settings` | Modifier les paramètres |
| GET | `/api/stats/today` | Stats du jour |
| WS | `/ws` (STOMP) | Temps réel cuisine |
