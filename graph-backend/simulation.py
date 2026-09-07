"""Non-destructive disruption simulation helpers."""
from typing import Any
import networkx as nx


def network_summary(graph: nx.Graph) -> dict:
    """Collect the network facts shown before and after disruption."""
    return {
        "people": graph.number_of_nodes(),
        "connections": graph.number_of_edges(),
        "components": nx.number_connected_components(graph) if graph else 0,
        "component_groups": [sorted(component) for component in nx.connected_components(graph)],
    }


def simulate_person_removal(original_graph: nx.Graph, person: str):
    """Remove a person from a copy and return the copy plus both summaries."""
    before = network_summary(original_graph)
    disrupted_graph = original_graph.copy()
    disrupted_graph.remove_node(person)
    after = network_summary(disrupted_graph)
    return disrupted_graph, before, after