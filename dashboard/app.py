import json
import os
from pathlib import Path
import subprocess
import urllib.request

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
LOCAL_NODE = ROOT.parent / 'tp-cyber/runtime/node_modules/node/bin/node'
st.set_page_config(page_title='ARMS · GRC Lab', page_icon='🛡️', layout='wide')
st.markdown('''<style>
.stApp {background:#0b1324;color:#e9eef6}
h1,h2,h3 {letter-spacing:-.035em}
[data-testid="stMetric"] {background:#16283e;border-top:2px solid #75dbc5;padding:18px;border-radius:8px}
[data-testid="stSidebar"] {background:#101e31}
</style>''', unsafe_allow_html=True)

st.caption('EPITALAB / CONFORMITÉ ET FINANCE AGENTIQUE')
st.title('ARMS · Red Team GRC')
st.write('Cinq agents. Deux scénarios. Des résultats vérifiables avant et après correction.')
st.info('Laboratoire fictif avec données synthétiques. Aucun système réel de BNP Paribas évalué.')

with st.sidebar:
    st.header('Centre de contrôle')
    mode = st.radio('Exécution', ['Ollama · agents IA', 'Déterministe · sans IA'])
    st.caption('Le mode déterministe teste les outils. Il ne simule pas une réponse de modèle IA.')
    try:
        with urllib.request.urlopen('http://127.0.0.1:11434/api/tags', timeout=2) as r:
            models = json.load(r)['models']
        st.success('Ollama disponible')
        st.caption(', '.join(m['name'] for m in models))
    except Exception:
        st.warning('Ollama arrêté : utiliser le raccourci de lancement.')
    if st.button('Lancer les cinq agents', type='primary', width='stretch'):
        env = os.environ.copy()
        node = str(LOCAL_NODE) if LOCAL_NODE.exists() else 'node'
        with st.status('Exécution des cinq agents…', expanded=True) as status:
            try:
                process = subprocess.Popen([node, '--import', 'tsx', 'src/cli.ts', '--mode', 'ollama' if mode.startswith('Ollama') else 'deterministic'], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                output = st.empty()
                lines = []
                for line in process.stdout:
                    lines.append(line.rstrip())
                    output.code('\n'.join(lines[-14:]), language='text')
                if process.wait() != 0:
                    status.update(label='Exécution échouée. Le dernier rapport réussi reste disponible.', state='error')
                else:
                    status.update(label='Rapport enregistré', state='complete')
            except OSError as error:
                st.error(str(error))
    st.link_button('Google Data Studio', 'https://datastudio.google.com/')
    st.link_button('Grafana local', 'http://localhost:3000')

report_path = ROOT / 'reports/latest.json'
if not report_path.exists():
    st.warning('Aucun rapport enregistré. Lance une première exécution.')
    st.stop()
report = json.loads(report_path.read_text())
stamp = pd.Timestamp(report['finishedAt']).tz_convert('Europe/Paris').strftime('%d/%m/%Y à %H:%M')
st.caption(f"Dernier succès : {stamp} · Mode : {report['mode']} · Run : {report['runId']}")
if report['mode'] == 'deterministic':
    st.warning('Ce rapport provient des outils déterministes, sans exécution d’un LLM.')

rows = []
for run in report['runs']:
    rows.append({'Scénario': 'Altération de transactions' if run['scenario'] == 'cyber' else 'Empoisonnement des labels',
                 'Version': 'Corrigée' if run['hardened'] else 'Vulnérable', **run['metrics']})
df = pd.DataFrame(rows)
c1, c2, c3, c4 = st.columns(4)
c1.metric('Agents exécutés', len(report['agents']))
c2.metric('Scénarios testés', 2)
c3.metric('Cas par version', 40)
c4.metric('Faux négatifs après correction', int(df[df.Version == 'Corrigée'].falseNegatives.sum()))

overview, agents, evidence, grc = st.tabs(['Résultats', 'Architecture et agents', 'Preuves', 'Conformité et risque'])
with overview:
    st.subheader('La correction bloque les deux scénarios testés')
    chart = df.assign(Série=df['Scénario'] + ' / ' + df['Version']).set_index('Série')[['detectionRate']]
    chart.columns = ['Détection ou quarantaine des fraudes']
    st.bar_chart(chart, horizontal=True, color='#75dbc5')
    show = df[['Scénario', 'Version', 'detected', 'falseNegatives', 'falsePositives', 'exposedEUR']].rename(columns={'detected':'Fraudes interceptées', 'falseNegatives':'Fraudes manquées', 'falsePositives':'Faux positifs', 'exposedEUR':'Exposition EUR'})
    st.dataframe(show, hide_index=True, width='stretch')
    st.caption('Chaque test contient 20 transactions frauduleuses et 20 légitimes. Les scénarios réutilisent le même échantillon : leurs expositions ne s’additionnent pas.')
    left, right = st.columns(2)
    with left:
        st.markdown('### 01 · Altération de transactions')
        st.write('Le fournisseur simulé modifie le montant et la vélocité de 16 événements signés. La version vulnérable ignore la signature. La version corrigée vérifie l’intégrité et met les événements altérés en quarantaine.')
    with right:
        st.markdown('### 02 · Empoisonnement des données')
        st.write('L’attaquant inverse les 40 labels frauduleux du jeu d’apprentissage. Le modèle logistique perd sa capacité de détection. Le contrôle de promotion rejette le hash non approuvé et conserve le modèle propre.')

with agents:
    st.graphviz_chart('''digraph {rankdir=LR; bgcolor="transparent"; node [shape=box,style=rounded,color="#75dbc5",fontcolor="#e9eef6"]; edge[color="#75dbc5"]; "Reconnaissance" -> "Attaquant" -> "IA Adversaire" -> "Compliance Breaker" -> "Impact & Risk Scoring";}''')
    st.subheader('Surfaces d’attaque du système fictif')
    st.graphviz_chart('digraph {rankdir=LR; bgcolor="transparent"; node [shape=box,color="#75dbc5",fontcolor="#e9eef6"]; edge[color="#75dbc5"]; "API externe" -> "Passerelle" -> "Caractéristiques" -> "Modèle fraude" -> "Audit"; "Jeu d’apprentissage" -> "Modèle fraude";}')
    for agent in report['agents']:
        with st.expander(f"{agent['name']} · {agent['durationMs'] / 1000:.1f} s"):
            st.write(agent['role'])
            st.caption(f"Compétence : {agent['skill']} · Modèle : {agent['model'] or 'aucun'} · Outil : {', '.join(agent['toolCalls'])}")
            st.caption('Commentaire IA brut, non validé : les chiffres de référence sont ceux des outils dans Résultats et Preuves.')
            st.write(agent['commentary'] or 'Aucun commentaire textuel. Les preuves de l’outil restent disponibles.')
            st.code(agent['evidenceHash'], language='text')
    st.caption('Orchestration bornée : chaque agent appelle un outil spécialisé. Le modèle commente les mesures, il ne modifie pas les résultats de test.')

with evidence:
    selected = st.selectbox('Jeu de preuves', range(len(report['runs'])), format_func=lambda i: f"{report['runs'][i]['scenario']} / {'corrigé' if report['runs'][i]['hardened'] else 'vulnérable'}")
    st.dataframe(pd.DataFrame(report['runs'][selected]['observations']), hide_index=True, width='stretch')
    st.json({k: report['runs'][selected][k] for k in ['model', 'approvedHash', 'candidateHash', 'metrics']})
    st.download_button('Télécharger le rapport JSON', report_path.read_bytes(), 'arms-report.json', 'application/json')
    st.download_button('Télécharger les métriques CSV', (ROOT / 'reports/metrics.csv').read_bytes(), 'arms-metrics.csv', 'text/csv')

with grc:
    st.subheader('Des écarts de laboratoire, pas une certification')
    for finding in report['findings']:
        with st.expander(f"{finding['id']} · {finding['framework']} art. {finding['article']} · {finding['status']}"):
            st.write(finding['gap'])
            st.write('Preuve : ' + finding['evidence'])
            st.write('Action : ' + finding['action'])
            st.caption(f"Responsable proposé : {finding['owner']} · Priorité : {finding['priority']}")
            st.link_button('Source officielle', finding['source']['url'])
    st.subheader('Priorisation')
    st.dataframe(pd.DataFrame(report['ranking'])[['scenario','hardened','exposureEUR','stressLossEUR','score','level']], hide_index=True, width='stretch')
    st.caption('Score = min(exposition / 400 000 €, 1) × 0,6. Perte de stress = exposition × 25 %. Les deux coefficients sont des hypothèses pédagogiques. Aucune amende estimée.')
    for source in report['sources']:
        st.markdown(f"[{source['title']}]({source['url']}) : {source['applicability']}")
