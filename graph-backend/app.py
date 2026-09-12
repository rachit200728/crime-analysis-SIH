from flask import Flask, jsonify, request
from flask_cors import CORS
import networkx as nx
import requests

from graph import create_demo_graph, calculate_bridge_scores
from simulation import network_summary, simulate_person_removal

app = Flask(__name__)
CORS(app)

AI_API = "http://127.0.0.1:5001"


def fetch_case_entities():
    try:
        resp = requests.get(f"{AI_API}/api/all-entities", timeout=3)
        return resp.json()
    except Exception:
        return {}


def assign_communities(graph):
    """Detect groups automatically instead of hardcoding them."""
    if graph.number_of_edges() == 0:
        return {n: "Group A" for n in graph.nodes()}

    from networkx.algorithms.community import greedy_modularity_communities
    labels = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F"]
    mapping = {}
    communities = list(greedy_modularity_communities(graph))
    for idx, community in enumerate(communities):
        label = labels[idx % len(labels)]
        for person in community:
            mapping[person] = label
    return mapping


def build_graph_from_cases(entities_store, filter_case_id=None):
    """Build a real graph: people who appear together in the same case's evidence are linked.
    If filter_case_id is given, only that case's entities are used."""
    graph = nx.Graph()

    items = entities_store.items()
    if filter_case_id:
        items = [(cid, ents) for cid, ents in items if cid == filter_case_id]

    for case_id, ents in items:
        persons = ents.get("person", [])
        locations = ents.get("location", [])
        primary_location = locations[0] if locations else "Unknown"

        for p in persons:
            if p not in graph:
                graph.add_node(p, role="Person of Interest", location=primary_location, cases=[case_id])
            else:
                if case_id not in graph.nodes[p]["cases"]:
                    graph.nodes[p]["cases"].append(case_id)

        for i in range(len(persons)):
            for j in range(i + 1, len(persons)):
                a, b = persons[i], persons[j]
                if graph.has_edge(a, b):
                    graph[a][b]["weight"] += 1
                else:
                    graph.add_edge(a, b, weight=1)

    if graph.number_of_nodes() > 0:
        groups = assign_communities(graph)
        for person, group in groups.items():
            graph.nodes[person]["group"] = group

    return graph


def get_active_graph(filter_case_id=None):
    """Use real evidence-derived graph if enough data exists, otherwise fall back to demo."""
    store = fetch_case_entities()
    real_graph = build_graph_from_cases(store, filter_case_id)

    # Drop isolated people (no connections) so leftover single-mention names don't clutter the view
    isolated = [n for n in real_graph.nodes() if real_graph.degree(n) == 0]
    real_graph.remove_nodes_from(isolated)

    if real_graph.number_of_nodes() >= 2:
        return real_graph, True

    return create_demo_graph(), False


def graph_to_json(graph, bridge_scores):
    nodes = []
    for person, details in graph.nodes(data=True):
        nodes.append({
            "id": person,
            "group": details.get("group", "Group A"),
            "role": details.get("role", "Unknown"),
            "location": details.get("location", "Unknown"),
            "connections": graph.degree(person),
            "bridge_score": round(bridge_scores.get(person, 0), 4),
            "cases": details.get("cases", []),
        })

    edges = [{"source": a, "target": b} for a, b in graph.edges()]

    return {"nodes": nodes, "edges": edges}


@app.route("/api/network", methods=["GET"])
def get_network():
    case_id = request.args.get("case_id")
    graph, is_real = get_active_graph(case_id)
    bridge_scores = calculate_bridge_scores(graph)
    data = graph_to_json(graph, bridge_scores)
    data["is_real_data"] = is_real
    return jsonify(data)


@app.route("/api/simulate", methods=["POST"])
def simulate():
    data = request.get_json()
    person = data.get("person")
    case_id = data.get("case_id")

    graph, is_real = get_active_graph(case_id)

    if person not in graph.nodes():
        return jsonify({"error": "Person not found."}), 404

    disrupted_graph, before, after = simulate_person_removal(graph, person)
    bridge_scores = calculate_bridge_scores(disrupted_graph)

    return jsonify({
        "removed": person,
        "before": before,
        "after": after,
        "became_more_disconnected": after["components"] > before["components"],
        "disrupted_network": graph_to_json(disrupted_graph, bridge_scores),
        "is_real_data": is_real,
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "Graph service running"})


if __name__ == "__main__":
    app.run(port=5002, debug=True)