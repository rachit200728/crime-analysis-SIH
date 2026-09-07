"""Graph creation and network metrics for the demo application."""
import networkx as nx


def create_demo_graph() -> nx.Graph:
    """Build a fictional relationship graph that can later be replaced by real data."""
    graph = nx.Graph()
    people = {
        "Person A": {"group": "Group A", "role": "Coordinator", "location": "Zone 1"},
        "Person B": {"group": "Group A", "role": "Analyst", "location": "Zone 1"},
        "Person C": {"group": "Group A", "role": "Researcher", "location": "Zone 2"},
        "Person D": {"group": "Group B", "role": "Coordinator", "location": "Zone 2"},
        "Person E": {"group": "Group B", "role": "Analyst", "location": "Zone 2"},
        "Person F": {"group": "Group B", "role": "Researcher", "location": "Zone 3"},
        "Person G": {"group": "Group C", "role": "Coordinator", "location": "Zone 3"},
        "Person H": {"group": "Group C", "role": "Analyst", "location": "Zone 3"},
        "Person I": {"group": "Group C", "role": "Researcher", "location": "Zone 1"},
    }
    graph.add_nodes_from((person, details) for person, details in people.items())
    relationships = [
        ("Person A", "Person B"),
        ("Person A", "Person C"),
        ("Person B", "Person C"),
        ("Person C", "Person D"),
        ("Person D", "Person E"),
        ("Person D", "Person F"),
        ("Person E", "Person F"),
        ("Person F", "Person G"),
        ("Person G", "Person H"),
        ("Person G", "Person I"),
        ("Person H", "Person I"),
    ]
    graph.add_edges_from(relationships)
    return graph


def calculate_bridge_scores(graph: nx.Graph) -> dict:
    """Return normalized betweenness centrality, used as the Bridge Score."""
    return nx.betweenness_centrality(graph, normalized=True)