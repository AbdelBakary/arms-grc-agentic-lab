import type { Simulation } from './lab.js';

export const sources = [
  { id: 'DORA', title: 'Règlement (UE) 2022/2554', url: 'https://eur-lex.europa.eu/eli/reg/2022/2554/oj', applicability: 'Établissement de crédit fictif, régime complet supposé. Art. 2 et 4.' },
  { id: 'MICA', title: 'Règlement (UE) 2023/1114', url: 'https://eur-lex.europa.eu/eli/reg/2023/1114/oj', applicability: 'Conditionnel : activité de service sur crypto-actifs à établir. Consommer une API ne suffit pas.' },
  { id: 'AI_ACT', title: 'Règlement (UE) 2024/1689', url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj', applicability: 'Antifraude seule exclue du cas crédit de l’annexe III 5(b). Aucun classement haut risque automatique.' },
  { id: 'GDPR', title: 'Règlement (UE) 2016/679', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj', applicability: 'Aucune donnée personnelle réelle dans le lab. Exigences à analyser si déploiement réel.' },
];

export function compliance(runs: Simulation[]) {
  const cyber = runs.find(x => x.scenario === 'cyber' && !x.hardened)!;
  const ai = runs.find(x => x.scenario === 'poisoning' && !x.hardened)!;
  return [
    { id: 'G01', framework: 'DORA', article: '8', status: 'Preuve partielle', evidence: 'data/architecture.json : composants et flux fictifs inventoriés', gap: 'Contrats, RTO et tests de continuité absents du périmètre.', action: 'Inventorier les services TIC et tester le basculement fournisseur.', owner: 'Responsable risques TIC', priority: 'P1' },
    { id: 'G02', framework: 'DORA', article: '9(2)-(3)', status: 'Écart démontré dans le lab', evidence: `cyber/vulnerable : ${cyber.metrics.falseNegatives} fraudes non détectées après altération`, gap: 'Les données modifiées franchissent la frontière de confiance.', action: 'Vérifier signature et provenance des caractéristiques avant inférence. Rejouer le test en mode corrigé.', owner: 'RSSI et équipe API', priority: 'P0' },
    { id: 'G03', framework: 'DORA', article: '10, 24 et 25', status: 'Écart démontré dans le lab', evidence: `poisoning/vulnerable : ${ai.metrics.falseNegatives} faux négatifs`, gap: 'Un jeu de données non approuvé déclenche un entraînement et dégrade la détection.', action: 'Bloquer la promotion sans hash approuvé, validation indépendante et test de non-régression.', owner: 'Responsable MLOps', priority: 'P0' },
    { id: 'G04', framework: 'DORA', article: '28(3)-(4)', status: 'Preuve insuffisante', evidence: 'data/architecture.json : un fournisseur simulé', gap: 'Le registre de contrats et la due diligence ne sont pas démontrés.', action: 'Établir le registre TIC et documenter la stratégie de sortie.', owner: 'Achats et risques tiers', priority: 'P1' },
    { id: 'G05', framework: 'MICA', article: '68(7), 75 si conservation', status: 'Applicable sous condition', evidence: 'Aucun service de conservation ou d’échange réel décrit.', gap: 'Périmètre crypto à qualifier avant toute conclusion.', action: 'Faire qualifier les activités par la fonction juridique. Tester rapprochement et continuité si applicables.', owner: 'Conformité crypto', priority: 'P1' },
    { id: 'G06', framework: 'AI_ACT', article: 'Annexe III 5(b) ; art. 10, 12, 14, 15 si haut risque', status: 'Bonne pratique / conditionnel', evidence: 'Journal de décisions, hash du modèle et comparaison avant/après.', gap: 'L’usage exclusivement antifraude ne suffit pas à établir le haut risque.', action: 'Documenter finalité et qualification. Garder provenance, supervision et tests de robustesse.', owner: 'Responsable gouvernance IA', priority: 'P1' },
    { id: 'G07', framework: 'GDPR', article: '5(1)(c),(e), 32', status: 'Illustratif', evidence: 'Identifiants TX synthétiques, aucun nom ni donnée bancaire réelle.', gap: 'Rétention et contrôle d’accès restent à définir pour un service réel.', action: 'Définir minimisation, durée de conservation et habilitations avant données réelles.', owner: 'DPO et RSSI', priority: 'P1' },
  ].map(finding => ({ ...finding, source: sources.find(x => x.id === finding.framework)! }));
}
