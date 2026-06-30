# La Perla POS — Build de l'app native Android

Ce dossier `android/` permet de générer une vraie application Android
installable (.apk), avec impression Bluetooth **directe et instantanée**
sur la Star TSP100IIBI — sans passer par PassPRNT, sans aller-retour visuel.

## Ce qui a changé

- Le service `printer.service.ts` a une nouvelle méthode `'native'` qui
  utilise le plugin `capacitor-thermal-printer` (SDK officiel Rongta)
  pour parler en Bluetooth Classic SPP directement à l'imprimante.
- Sur le web/PWA, rien ne change : PassPRNT reste utilisé normalement.
- Dans l'app native installée, la méthode `'native'` est sélectionnée
  automatiquement (détection via `Capacitor.isNativePlatform()`).

## Prérequis sur ta machine (pas dans cet environnement)

1. Installer **Android Studio** : https://developer.android.com/studio
2. Au premier lancement, laisser Android Studio installer le SDK Android
   (API 34 ou plus récent recommandé)
3. Avoir Node.js installé (déjà nécessaire pour Angular)

## Étapes de build

```bash
# 1. Cloner le repo et se placer dans angular-app
cd angular-app
npm install

# 2. Builder l'app Angular en production
npm run build
# ou : node_modules/.bin/ng build --configuration=production

# 3. Synchroniser les fichiers web vers le projet Android natif
node_modules/.bin/cap sync android

# 4. Ouvrir le projet dans Android Studio
node_modules/.bin/cap open android
```

Android Studio s'ouvre alors avec le projet `android/`. De là :

- **Pour tester sur la tablette branchée en USB** : activer le mode
  développeur + débogage USB sur la tablette, puis cliquer ▶️ Run dans
  Android Studio. L'app s'installe et se lance directement.

- **Pour générer un APK installable** :
  `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
  L'APK généré se trouve dans
  `android/app/build/outputs/apk/debug/app-debug.apk`
  → transférer ce fichier sur la tablette et l'installer (autoriser les
  sources inconnues si demandé).

- **Pour une version signée prête production** (recommandé à terme) :
  `Build` → `Generate Signed Bundle / APK` et suivre l'assistant pour
  créer un keystore. Conserver ce keystore précieusement : il identifie
  ton app pour toutes les mises à jour futures.

## Première utilisation de l'impression native sur la tablette

1. Ouvrir l'app La Perla POS installée
2. Aller dans **Admin → Imprimante**
3. Cliquer **"Rechercher l'imprimante"**
4. Sélectionner **Star TSP100** dans la liste détectée
5. L'adresse Bluetooth est mémorisée — l'impression suivante est
   instantanée, sans aucune autre app qui s'ouvre.

## Mettre à jour l'app après un nouveau commit

Chaque fois que du code Angular est modifié et pushé sur GitHub :

```bash
git pull
cd angular-app
npm install
npm run build
node_modules/.bin/cap sync android
node_modules/.bin/cap open android
```

Puis Run ou Build APK comme ci-dessus. Pas besoin de refaire les étapes
1-2 d'installation d'Android Studio, seulement ce cycle de sync + build.
