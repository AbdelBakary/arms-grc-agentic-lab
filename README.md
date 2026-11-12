# ARMS : Red Team agentique GRC

TP réalisé à partir du [template du professeur](https://github.com/scortalabs/epitalab), commit `1b38bb11393aa6da843e11b583b657b86c27b4b2`.

## Rendu

- **Code des cinq agents** : [`src/agents.ts`](src/agents.ts).
- **[Mini vidéo démo](demo/arms-demo.mp4)** : 1 min 21, muette et annotée, avec une exécution réelle des cinq agents via Ollama.
- **[Trois diapositives en PDF](demo/ARMS-3-diapositives.pdf)** : architecture, scénarios et conclusions.
- [Sujet actualisé](docs/sujet-actualise.txt) et [vérifications effectuées](docs/verification.txt).

Remise : dimanche à **23 h 30, heure de Paris**. Le dépôt est privé : donner au professeur un accès de lecture avant de transmettre le lien.

## Installation et lancement

Prérequis : **Node.js 22+**, **Python 3.11+** et [Ollama](https://ollama.com/).

Dans un premier terminal :

```bash
ollama serve
```

Dans un second terminal, depuis le dépôt cloné :

```bash
bash scripts/setup.sh
npm run agents
.venv/bin/streamlit run dashboard/app.py --server.port 8502
```

Ouvrir **http://localhost:8502**. Le modèle `arms-qwen3` dérive de Qwen3 0.6B et fonctionne localement, sans clé API. Le script installe les dépendances, télécharge le modèle et le configure avec le Modelfile.

Sur le Mac déjà préparé, `Lancer.command` utilise les dépendances du dossier voisin `tp-cyber/`. Pour un nouveau clone, utiliser les commandes ci-dessus.

```bash
npm run typecheck
npm test
npm run lab       # outils seuls, sans modèle IA
npm run agents    # cinq agents, avec appels réels à Ollama
```

## Les cinq agents

| Agent | Rôle et sortie |
|---|---|
| Reconnaissance | Cartographie des composants, flux, fournisseur et points d’entrée |
| Attaquant | Altération de transactions et comparaison avant/après |
| IA Adversaire | Empoisonnement des labels d’apprentissage et mesure sur un jeu de test distinct |
| Compliance Breaker | Lien entre constat, preuve, article, applicabilité et action corrective |
| Impact & Risk Scoring | Exposition financière, score explicite et priorités |

Le SDK Vercel orchestre les étapes. Chaque agent appelle un outil spécialisé, puis produit une synthèse. Les preuves structurées alimentent les étapes suivantes ; les rapports enregistrent modèle, usage de tokens, outils, durées et hash. Les compétences de référence proviennent du template conservé dans le dépôt.

`npm run schedule` lance une exécution immédiate puis une toutes les 1 440 minutes, tant que le processus reste ouvert. L’intervalle se règle avec `RUN_EVERY_MINUTES`. Un verrou empêche les runs simultanés. Aucune tâche système n’est créée. Après un arrêt brutal, vérifier qu’aucun run ne tourne avant de supprimer `reports/.run.lock`.

## Scénarios et résultats

ARMS est un laboratoire fictif : passerelle fournisseur, caractéristiques de transactions, apprentissage, modèle de fraude et audit. Les données sont entièrement synthétiques. Aucun système réel de BNP Paribas n’est évalué.

1. **Attaque cyber** : le fournisseur simulé altère montant et vélocité de 16 événements frauduleux sans recalculer leur signature. Le contrôle corrigé vérifie la signature et place les événements altérés en quarantaine.
2. **Attaque données/IA** : les 40 labels frauduleux du jeu d’apprentissage deviennent légitimes. Le modèle logistique vulnérable est réentraîné sur ces données. Le contrôle corrigé refuse le jeu non approuvé et conserve le modèle propre.

Chaque version utilise 40 transactions de test : 20 frauduleuses et 20 légitimes. Le label vérité terrain n’entre pas dans les caractéristiques de prédiction.

| Scénario | Fraudes manquées avant / après | Faux positifs avant / après | Exposition avant / après |
|---|---:|---:|---:|
| Transactions altérées | 16 / 0 | 0 / 0 | 324 500 € / 0 € |
| Labels empoisonnés | 20 / 0 | 0 / 0 | 392 500 € / 0 € |

Les expositions ne s’additionnent pas, car les scénarios réutilisent le même échantillon. L’interception inclut l’alerte du modèle et la quarantaine.

**Score** : `min(exposition / 400000, 1) × 0,6`, soit 0,487 et 0,589 avant correction. Le coefficient 0,6 est une hypothèse de probabilité. La perte de stress utilise une hypothèse de 25 % : 81 125 € et 98 125 €. Le risque réputationnel reste qualitatif. Aucune amende n’est estimée.

## Conformité et limites

Les constats relient preuves, articles et recommandations : DORA art. 8, 9, 10, 24–25 et 28 ; MiCA sous condition d’activité crypto ; RGPD avant données réelles. L’antifraude seule ne suffit pas à établir le haut risque AI Act. La [revue réglementaire](docs/revue-reglementaire.txt) donne les sources et l’applicabilité.

Les règles sont un catalogue revu, sans veille juridique en temps réel. Les commentaires bruts du petit modèle peuvent contenir des erreurs : ils sont signalés comme non validés. Les résultats, scores et diapositives utilisent exclusivement les mesures des outils. Les tests sur ce petit échantillon ne certifient pas la robustesse ou la conformité de production. La clé HMAC est publique et réservée au test ; le registre de hash approuvés devrait être protégé séparément en production.

## Repères dans le code

| Fichier | Fonction |
|---|---|
| `src/agents.ts` | Rôles, instructions, outils et orchestration |
| `src/lab.ts` | Modèle appris, scénarios et mesures |
| `src/compliance.ts` | Catalogue réglementaire et constats |
| `src/schedule.ts` | Planification locale |
| `dashboard/app.py` | Interface Streamlit et export des preuves |
| `reports/latest.json` | Dernier run réussi et mode d’exécution |
| `reports/2026-11-12T15-15-13-789Z/` | Preuves archivées du run filmé |

Les dossiers de compétences et les fichiers de consignes proviennent du template du professeur. Le dépôt de remise exclut les dépendances installées, poids des modèles, clés privées, caches et fichiers de montage intermédiaires.
