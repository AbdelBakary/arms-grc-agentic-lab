# ARMS : Red Team agentique GRC

Atelier de conformité et finance agentique : cinq agents spécialisés, deux attaques reproductibles, comparaison avant/après et analyse des écarts réglementaires.

**Périmètre fictif.** ARMS est ici un petit système de détection de fraude construit pour le TP. Aucun système, contrôle ou jeu de données réel de BNP Paribas n’est évalué. Les identifiants, transactions et fournisseurs sont synthétiques.

## Rendu vérifié et démonstration

- [Mini vidéo de démonstration](demo/arms-demo.mp4) : **1 min 21**, muette et annotée en français. Elle montre un run Ollama réel, sans accélération, puis résultats, architecture, preuves et GRC.
- [Support PDF, 3 diapositives](demo/ARMS-3-diapositives.pdf).
- [Projet vidéo reproductible](demo/projet-demo.zip) : captures sources, montage horodaté et script Python.
- [Relecture du sujet actualisé](docs/relecture-tp.txt) et [consigne mise à jour](docs/sujet-actualise.txt).

Le sujet actualisé ajoute explicitement le lien GitHub avec agents fonctionnels et une mini vidéo, à remettre au plus tard dimanche à 23 h 30, heure de Paris. La relecture du 12 novembre confirme la couverture des cinq rôles, des deux scénarios et des trois diapositives. Le run filmé est `2026-11-12T15-15-13-789Z` et son rapport est archivé dans `reports/`.

Le dépôt est privé : **donner au professeur un accès de lecture avant la remise**. La création du dépôt et de la vidéo ne constitue pas un envoi au professeur.

## Démarrer sur ce Mac

Double-cliquer sur **Lancer.command**, puis ouvrir **http://localhost:8502**. Le raccourci utilise les dépendances déjà installées dans le dossier voisin `tp-cyber/`. Il démarre Ollama si nécessaire, puis Streamlit. Choisir « Ollama · agents IA » et lancer les cinq agents.

Le modèle local `arms-qwen3` dérive de **Qwen3 0.6B**, quantifié et configuré pour CPU. Aucun compte cloud ni clé API nécessaire. Le modèle léger peut produire des commentaires inexacts : les résultats des outils constituent les preuves. Une erreur d’appel ou de modèle fait échouer le run et conserve le dernier rapport réussi, sans le présenter comme une nouvelle exécution IA.

## Installer depuis un nouveau clone

Prérequis : Node.js 22+, Python 3.11+ et [Ollama](https://ollama.com/). Démarrer `ollama serve` dans un terminal séparé, puis :

```bash
bash scripts/setup.sh
npm run agents
.venv/bin/streamlit run dashboard/app.py --server.port 8502
```

Sur ce Mac, le serveur Ollama utilise également `LLAMA_ARG_DEVICE=none` et `LLAMA_ARG_KV_OFFLOAD=0` pour fonctionner dans l’environnement d’exécution. Le raccourci fourni contient ces réglages. Les poids des modèles sont hors du dépôt.

```bash
npm run typecheck
npm test
npm run lab       # outils déterministes, sans LLM
npm run agents    # vrais appels Ollama avec le SDK Vercel
npm run schedule  # exécution immédiate puis toutes les 1 440 minutes
```

L’ordonnanceur reste actif uniquement tant que son terminal est ouvert. `RUN_EVERY_MINUTES` permet de changer l’intervalle (1 à 10 080 minutes). Un verrou partagé empêche deux runs concurrents. Aucune tâche macOS ni automatisation cloud n’est enregistrée. Après un arrêt brutal uniquement, vérifier qu’aucun run ne tourne avant de supprimer `reports/.run.lock`.

## Les cinq agents

| Agent | Outil autorisé | Compétence du template | Preuve transmise |
|---|---|---|---|
| Reconnaissance | `map_surface` | `ict-risk-framework-check` | Composants, flux, points d’entrée et fournisseur |
| Attaquant | `simulate_cyber` | `logging-and-monitoring-evidence-pack` | Mesures d’altération avant/après |
| IA Adversaire | `simulate_poisoning` | `ai-impact-assessment` | Données, hash et résultats du modèle empoisonné |
| Compliance Breaker | `map_regulatory_gaps` | `ai-act-risk-classification` | Écart, preuve, article, applicabilité et action |
| Impact & Risk Scoring | `score_impact` | `risk-treatment-plan-drafting` | Exposition, score explicite et priorité |

Chaque étape utilise le SDK Vercel pour faire appeler un outil au modèle, puis lui demander une courte synthèse. L’outil calcule les résultats. Les rôles et l’ordre sont bornés par le programme : le modèle ne dispose d’aucun shell, scanner réseau, outil de paiement ni cible externe. Les compétences du dépôt sont lues et leurs hash enregistrés. Les principes retenus sont intégrés aux instructions spécialisées. Les workflows documentaires complets de ces skills ne sont pas exécutés comme des audits réels.

La mémoire partagée contient les preuves structurées des étapes précédentes. L’agent conformité consomme les deux simulations et l’agent impact leurs mesures. Chaque sortie contient les hash amont, le hash du skill, le modèle, les outils réellement appelés, la consommation de tokens et la durée.

## Cible et scénarios

Architecture : fournisseur crypto simulé, passerelle, caractéristiques de transactions, entraînement, modèle de détection et journal d’audit. `data/architecture.json` décrit les dépendances et les flux.

**Scénario cyber.** Le jeu d’évaluation compte 40 transactions, dont 20 frauduleuses. L’attaquant modifie le montant et la vélocité de 16 événements frauduleux, sans recalculer la signature. La version vulnérable accepte les données et le modèle sous-estime le risque. La version corrigée vérifie la signature avant inférence et met les événements altérés en quarantaine.

**Scénario données/IA.** Une régression logistique apprend sur 80 transactions distinctes du jeu de test. L’attaquant remplace les 40 labels frauduleux par des labels légitimes. La version vulnérable réentraîne et promeut ce modèle. La version corrigée refuse le jeu dont le hash diffère de la version approuvée et conserve le modèle propre. Ce scénario est volontairement sévère. Il ne démontre pas la résistance à un empoisonnement subtil d’un jeu approuvé.

Le label vérité terrain n’entre jamais dans les caractéristiques de prédiction. Un score de fraude supérieur ou égal à 0,5 déclenche une revue humaine. Les tests ne réalisent aucun mouvement de fonds. La clé HMAC est publique et réservée au test : en production, il faudrait gérer les clés séparément et protéger le registre des hash approuvés.

## Résultats reproductibles

| Scénario | Version | Fraudes interceptées / 20 | Faux positifs / 20 | Exposition synthétique |
|---|---|---:|---:|---:|
| Transactions altérées | Vulnérable | 4 | 0 | 324 500 € |
| Transactions altérées | Corrigée | 20 | 0 | 0 € |
| Labels empoisonnés | Vulnérable | 0 | 0 | 392 500 € |
| Labels empoisonnés | Corrigée | 20 | 0 | 0 € |

« Interceptée » inclut l’alerte du modèle et la quarantaine du contrôle d’intégrité. Chaque scénario réutilise le même échantillon : les expositions **ne s’additionnent pas**. Zéro faux négatif ici ne prouve pas l’absence de risque résiduel en production.

Score pédagogique : `min(exposition / 400000, 1) × 0,6`, soit **0,487** pour l’altération et **0,589** pour l’empoisonnement avant correction. Le coefficient 0,6 est une probabilité supposée, pas une fréquence observée. La perte de stress utilise une hypothèse de perte de 25 %, soit 81 125 € et 98 125 €. Aucune amende n’est estimée. L’impact réputationnel reste qualitatif et non mesuré.

## Conformité et recommandations

Les règles sont un catalogue revu à partir de sources officielles, **pas un moteur de veille juridique en temps réel**. La vérification est datée du 12 novembre 2026. La consultation juridique détaillée et les limites figurent dans `docs/revue-reglementaire.txt`.

- [DORA, règlement 2022/2554](https://eur-lex.europa.eu/eli/reg/2022/2554/oj) : cartographie (art. 8), intégrité (art. 9), détection (art. 10), tests (art. 24–25), risques tiers (art. 28). L’établissement de crédit et le régime complet sont des hypothèses du cas fictif.
- [MiCA, règlement 2023/1114](https://eur-lex.europa.eu/eli/reg/2023/1114/oj) : art. 68 et, si conservation pour clients, art. 75. La consommation d’une API crypto ne suffit pas à rendre toutes ces obligations applicables.
- [AI Act, règlement 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) : l’annexe III 5(b) exclut l’antifraude du cas crédit/solvabilité. Les art. 10, 12, 14 et 15 sont ici des bonnes pratiques ou obligations conditionnelles, sans constat automatique d’infraction.
- [RGPD, règlement 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj) : minimisation, rétention et sécurité à analyser avant données réelles. Le lab utilise uniquement des données synthétiques.

Priorité P0 : vérifier l’intégrité avant inférence et contrôler la promotion des données/modèles. Responsables proposés : RSSI/API et MLOps. Retest : comparer les métriques avant/après sur un échantillon indépendant. Priorité P1 : compléter le registre TIC, les tests de continuité, la qualification MiCA et la classification de finalité IA. Une réussite technique ne certifie aucune conformité globale.

## Fichiers à présenter

- `src/agents.ts` : cinq rôles, cerveau, outils et orchestration.
- `src/lab.ts` : modèle entraîné, scénarios et mesures.
- `src/compliance.ts` : catalogue de règles et matrice de constats.
- `src/schedule.ts` : planification et arrêt propre.
- `dashboard/app.py` : interface Streamlit, preuves et exports.
- `reports/latest.json` : dernier run réussi, avec son mode explicite.
- `reports/<run-id>/` : rapport, événements, manifeste et métriques archivés.
- `docs/sujet-original.txt` : copie du sujet remis.
- `docs/verification.txt` : contrôles réellement exécutés pendant la préparation.

Le support demandé comporte exactement trois diapositives : architecture, scénarios, conclusions. Le PDF est disponible dans `demo/ARMS-3-diapositives.pdf` et contient le lien GitHub du code source.

## Provenance et publication

Base clonée : [scortalabs/epitalab](https://github.com/scortalabs/epitalab), commit `1b38bb11393aa6da843e11b583b657b86c27b4b2`. Les fichiers de compétences et consignes d’origine sont conservés. Les sources techniques sont [AI SDK](https://ai-sdk.dev/docs/introduction), [compatibilité OpenAI d’Ollama](https://docs.ollama.com/api/openai-compatibility) et [Streamlit](https://docs.streamlit.io/).

Dépôt de rendu : [AbdelBakary/arms-grc-agentic-lab](https://github.com/AbdelBakary/arms-grc-agentic-lab), privé. Donner un accès de lecture au professeur avant remise. Le dépôt du professeur reste le remote `origin` de la copie locale ; le rendu est publié séparément. Ne publier ni `.env`, ni poids des modèles, ni dépendances, ni logs machine.
