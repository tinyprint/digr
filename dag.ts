type PredicateFn<State> = (state: State) => boolean;

export interface Edge<State, NodeName extends string, EdgeContext> {
  toNodeName: NodeName;
  predicate: PredicateFn<State>;
  catchall: boolean;
  context: EdgeContext;
}

export interface Node<
  State,
  NodeName extends string,
  NodeContext = unknown,
  EdgeContext = unknown
> {
  edges: Edge<State, NodeName, EdgeContext>[];
  context: NodeContext;
}

export interface Graph<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
> {
  nodes: Record<NodeName, Node<State, NodeName, NodeContext, EdgeContext>>;
}

export function node<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  edges: Edge<State, NodeName, EdgeContext>[],
  context: NodeContext
): Node<State, NodeName, NodeContext, EdgeContext> {
  return { edges, context };
}

export function nodeWithoutContext<
  State,
  NodeName extends string,
  EdgeContext = unknown
>(edges: Edge<State, NodeName, EdgeContext>[]) {
  return node(edges, null);
}

export function to<
  State,
  NodeName extends string = string,
  EdgeContext = unknown
>(toNodeName: NodeName, when: PredicateFn<State>, context: EdgeContext) {
  return {
    toNodeName,
    predicate: when,
    catchall: false,
    context,
  };
}

export function toWithoutContext<
  State,
  NodeName extends string = string,
  EdgeContext = unknown
>(toNodeName: NodeName, when: PredicateFn<State>) {
  return to(toNodeName, when, null);
}

export function catchall<
  State,
  NodeName extends string = string,
  EdgeContext = unknown
>(
  toNodeName: NodeName,
  context: EdgeContext
): Edge<State, NodeName, EdgeContext> {
  return {
    toNodeName,
    predicate: () => true,
    catchall: true,
    context,
  };
}
export function catchallWithoutContext<
  State,
  NodeName extends string = string,
  EdgeContext = unknown
>(toNodeName: NodeName) {
  return catchall(toNodeName, null);
}

export function next<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  graph: Graph<State, NodeName, NodeContext, EdgeContext>,
  currentNodeName: NodeName,
  currentState: State
): NodeName | null {
  const matchedNext = graph.nodes[currentNodeName].edges.find((nextChoice) =>
    nextChoice.predicate(currentState)
  );

  if (typeof matchedNext === "undefined") {
    return null;
  }

  return matchedNext.toNodeName;
}

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
