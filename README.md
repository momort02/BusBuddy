# BusBuddy — bêta 0.1

PWA mobile-first en français : comptes, groupes, invitations, trajets récurrents et réponses Oui / Non / Je ne sais pas synchronisées avec Firestore.

## Important : état de cette bêta

Cette archive contient une première base fonctionnelle de l'application et les règles Firestore. Elle n'est **pas encore prête à être publiée** : il faut créer/configurer le projet Firebase, ajouter `firebase-config.js`, déployer les règles, créer les icônes et tester les règles avec deux vrais comptes.

Les notifications push distantes ne sont pas encore raccordées à FCM. Le bouton demande actuellement l'autorisation du navigateur. Le service worker sait afficher un événement Web Push standard, mais il manque le raccordement FCM et le serveur d'envoi sécurisé. Ne pas considérer les rappels programmés comme actifs à ce stade.

## 1. Configuration Firebase gratuite

1. Crée un projet sur https://console.firebase.google.com/
2. Active Authentication > Sign-in method > Email/Password.
3. Crée une base Firestore en mode production.
4. Dans Project settings > Your apps, crée une application Web et copie sa configuration.
5. Copie `src/firebase-config.example.js` vers `src/firebase-config.js`, puis renseigne les valeurs.
6. Dans Firestore > Rules, publie le contenu de `firestore.rules`.

`firebase-config.js` contient la configuration publique du client, pas de clé privée. Ne publie jamais une clé de compte de service.

## 2. Icônes

Crée `icons/icon-192.png` et `icons/icon-512.png` (PNG carrés). Ils sont référencés par le manifeste et les notifications.

## 3. Hébergement HTTPS gratuit

La PWA et les service workers exigent HTTPS (sauf localhost). Tu peux utiliser GitHub Pages :
- Place le contenu du dossier à la racine d'un dépôt.
- Active Settings > Pages > Deploy from a branch.
- Si le site est publié dans un sous-chemin `/<repo>/`, adapte `start_url`, `scope`, les chemins absolus `/styles.css`, `/src/app.js`, `/sw.js` et les icônes, ou utilise un domaine personnalisé à la racine.

Pour un premier test simple, un hébergement statique HTTPS à la racine est préférable.

## 4. Lancer en local

Avec Node.js installé :
```bash
npx serve .
```
Ouvre l'adresse locale fournie. Pour tester sur téléphone, utilise un hébergement HTTPS.

## 5. Modèle de données

- `users/{uid}` : profil.
- `groups/{groupId}` : groupe et membres.\n- `invites/{code}` : résolution du code d'invitation vers le groupe.
- `trips/{tripId}` : trajet, jours actifs et heures.
- `responses/{tripId_uid_YYYY-MM-DD}` : réponse quotidienne.

## 6. Limites connues de la bêta 0.1

- Les réponses et groupes sont synchronisés en direct.
- L'affichage des membres utilise temporairement un identifiant abrégé ; une prochaine version ajoutera les profils publics et pseudonymes.
- Les trajets sont créés et stockés, mais l'interface actuelle affiche tous les trajets du groupe sans encore filtrer selon les jours actifs.
- Les horaires et fuseaux sont enregistrés, mais le moteur de rappels planifiés reste à développer.
- Les invitations par code sont une première version ; avant une diffusion plus large, il faudra ajouter une expiration, une limite d'usage et une fonction serveur pour éviter les abus.
- Les règles Firestore fournies sont une base de départ à tester avec Firebase Emulator avant une utilisation réelle.
- Le bouton de notification ne déclenche pas encore de push à distance.

## 7. Tests bêta conseillés

1. Créer deux comptes sur deux téléphones/navigateurs.
2. Créer un groupe sur le premier compte.
3. Copier le code et rejoindre avec le second compte.
4. Créer un trajet.
5. Vérifier que les deux comptes voient le trajet.
6. Envoyer une réponse depuis chaque compte et vérifier la synchronisation.
7. Tester les droits d'accès avec un troisième compte qui n'appartient pas au groupe.

## 8. Sécurité et coûts

Firebase Spark possède des quotas gratuits qui peuvent évoluer. Active les alertes de budget dans Google Cloud si disponibles, mais ne considère pas une alerte comme un plafond de dépense. Ne passe pas à Blaze sans accord explicite. Aucun secret serveur ne doit être placé dans le code client.
