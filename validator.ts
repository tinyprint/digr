import { Graph, Node } from "./dag";

export function getGraphErrors<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(graph: Graph<State, NodeName, NodeContext, EdgeContext>): string[] {
  return Object.entries<Node<State, NodeName, NodeContext, EdgeContext>>(
    graph.nodes
  ).flatMap(([nodeName, node]) =>
    getNodeErrors(graph, node)
      .concat(getCyclicalErrors(graph, nodeName as NodeName))
      .map((err) => `error with definition of node '${nodeName}': ${err}`)
  );
}

export function getNodeErrors<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  graph: Graph<State, NodeName, NodeContext, EdgeContext>,
  currentNode: Node<State, NodeName, NodeContext, EdgeContext>
): string[] {
  if (currentNode.edges.length === 0) {
    return [];
  }

  const errors = [];

  const unknownNodeNames = currentNode.edges
    .filter(
      (nextNode) => typeof graph.nodes[nextNode.toNodeName] === "undefined"
    )
    .map(({ toNodeName }) => toNodeName);
  if (unknownNodeNames.length > 0) {
    errors.push(
      `unknown destination node(s) '${unknownNodeNames.join("', '")}'`
    );
  }

  const catchallNodeIndex = currentNode.edges.findIndex(
    (nextNode) => nextNode.catchall
  );
  if (catchallNodeIndex === -1) {
    errors.push(
      `catchall route is required for all nodes that have any 'next' predicates defined`
    );
  }
  if (catchallNodeIndex !== currentNode.edges.length - 1) {
    errors.push(
      `catchall route should be the last route in the list of 'next' predicates`
    );
  }

  return errors;
}

export function getCyclicalErrors<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  graph: Graph<State, NodeName, NodeContext, EdgeContext>,
  startNode: NodeName,
  visitedNodes: NodeName[] = [startNode]
): string[] {
  if (
    typeof graph.nodes[startNode] === "undefined" ||
    graph.nodes[startNode].edges.length === 0
  ) {
    return [];
  }

  return graph.nodes[startNode].edges.flatMap(({ toNodeName }) => {
    if (visitedNodes.includes(toNodeName)) {
      return [`cycle detected: ${visitedNodes.join("=>")} => ${toNodeName}`];
    }

    return getCyclicalErrors(graph, toNodeName, [...visitedNodes, toNodeName]);
  });
}
