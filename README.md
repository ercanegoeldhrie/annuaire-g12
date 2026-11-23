# 🎤 Annuaire vocal du Groupe 12

Application web (PWA) pour enregistrer les membres du Groupe 12 avec leur photo, leur matricule
et leur téléphone, à la main ou **à la voix**.

## ✨ Fonctionnalités
- Ajout d'un membre : prénom, nom, matricule, téléphone et photo (réduite automatiquement pour économiser la mémoire).
- Refus d'un matricule déjà enregistré.
- Recherche instantanée par nom, prénom, matricule ou téléphone (sans tenir compte des accents ni des majuscules).
- Suppression d'un membre avec confirmation.
- Commandes vocales en français :
  - « **Inscrire un étudiant** » : l'appli demande le prénom, le nom, le matricule puis le téléphone ;
  - « **Qui est** Kamga ? » ou « **Cherche** 22V… » ;
  - « **Combien** de membres ? » ;
  - « **Liste** des membres ».
- Installable sur téléphone et utilisable **hors ligne**.
- Thème clair ou sombre selon le réglage de l'appareil.

Les données restent **dans le navigateur** (localStorage) : elles ne sont ni envoyées sur Internet,
ni partagées entre appareils. Vider les données du site efface l'annuaire.

## 🚀 Lancer l'application
La reconnaissance vocale et le mode hors ligne demandent que la page soit servie par un serveur
(pas en ouvrant `index.html` directement) :

```bash
python -m http.server 8000
```

Puis ouvrir http://localhost:8000 dans **Chrome** ou **Edge** (la reconnaissance vocale n'est pas
disponible dans Firefox). Sur téléphone, il faut une adresse en **HTTPS**, par exemple en publiant le
dossier avec GitHub Pages (Settings → Pages → branche `main`).

## 📁 Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `style.css` | Apparence |
| `script.js` | Logique : formulaire, recherche, voix, sauvegarde |
| `sw.js` | Service worker pour le mode hors ligne |
| `manifest.json`, `icons/` | Installation comme application |
