# Gambia Track — Plateforme de Pilotage Multi-Business E-Commerce & COD 🇸🇳 🇬🇲

Plateforme de gestion opérationnelle et financière centralisée en paiement à la livraison (**Cash on Delivery - COD**), conçue sur-mesure pour **Mouhamed Konteye (Dakar, Sénégal)** et son **associé à Banjul (Gambie)** avec un accès co-administrateur 50/50.

---

## 🚀 Fonctionnalités Clés (100% Mobile-First)

1. **Tableau de Bord du Jour en Temps Réel** :
   - Chiffre d'Affaires encaissé (uniquement les commandes réellement livrées).
   - Dépenses totales (publicité Facebook/TikTok, achats, salaires, logistique).
   - **Bénéfice Net Réel** calculé selon la formule exacte du cahier des charges :
     $$\text{Bénéfice} = \text{CA Encaissé} - \text{Coût Revient Produits} - \text{Frais Livraison} - \text{Dépenses Opérationnelles}$$
   - Taux de livraison et taux de confirmation en direct.
   - Bloc « **Problèmes du jour** » : commandes en retard, livraisons échouées avec motif, alertes de stock bas, écarts de caisse.

2. **Gestion Express des Commandes COD (< 20 secondes)** :
   - Création ultra-rapide optimisée pour smartphone.
   - **Lien direct WhatsApp en 1 clic** avec message pré-rempli pour joindre ou relancer le client instantanément.
   - Bouton d'appel téléphonique direct.
   - Cycle de statut fluide : *Nouvelle ➔ Confirmée ➔ En livraison ➔ Livrée / Échouée / Annulée*.
   - Détection automatique des doublons (même numéro + même produit le même jour).

3. **Saisie Rapide des Dépenses (< 20 secondes)** :
   - Catégories dédiées : Facebook Ads, TikTok Ads, Achat de stock (Alibaba), Douane/Fret, Salaires & frais journaliers, Carburant.
   - Dépenses spécifiques à un business ou partagées à 50/50.
   - Moyens de paiement africains intégrés : Wave, Orange Money, Espèces, Carte Bancaire.

4. **Gestion des Stocks & Alertes Réassort** :
   - Suivi en temps réel du stock physique disponible vs stock réservé (commandes confirmées non livrées).
   - Coût de revient unitaire (Achat + Fret + Douane) et calcul de marge par produit.
   - Alertes visuelles quand le stock passe sous le seuil critique.
   - Module d'arrivage express pour ajouter de nouvelles unités reçues.

5. **Caisse & Clôture Journalière des Livreurs** :
   - Montant attendu des commandes livrées vs montant remis par chaque livreur.
   - Détection immédiate des écarts de caisse pour éviter les fuites de trésorerie.

---

## 🛠️ Stack Technique & Compatibilité Vercel

- **Framework :** Next.js 15 (App Router) + TypeScript
- **Style :** Tailwind CSS v4 avec design responsive 100% Mobile-First
- **Base de Données :** Neon PostgreSQL (compatible serverless avec connection pooling)
- **ORM :** Prisma
- **Authentification :** Auth.js (NextAuth) avec rôles protégés
- **Stockage de Justificatifs :** Vercel Blob
- **Icônes :** Lucide React

---

## 💻 Démarrage Local

```bash
# 1. Cloner ou ouvrir le dossier du projet
cd "Gambia track"

# 2. Lancer le serveur de développement
npm run dev

# 3. Ouvrir dans votre navigateur
# http://localhost:3000
```

---

## ☁️ Déploiement sur Vercel

1. Pousser le projet sur votre compte GitHub.
2. Importer le dépôt sur **[Vercel](https://vercel.com)**.
3. Renseigner les variables d'environnement (voir `.env.example`) :
   - `DATABASE_URL` (votre base de données Neon PostgreSQL)
   - `NEXTAUTH_SECRET`
   - `BLOB_READ_WRITE_TOKEN`
4. Cliquer sur **Deploy** ! L'application est en ligne avec HTTPS automatique et zéro gestion de serveur.
