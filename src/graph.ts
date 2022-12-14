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

interface ValidatorConfig {
  allowCycles: boolean;
  allowConditionalEnds: boolean;
  allowUnknownDestinations: boolean;
}

export interface Graph<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
> {
  nodes: Record<NodeName, Node<State, NodeName, NodeContext, EdgeContext>>;
  validators: ValidatorConfig;
}

export function createGraph<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  nodes: Graph<State, NodeName, NodeContext, EdgeContext>["nodes"],
  validators: Partial<ValidatorConfig> = {}
): Graph<State, NodeName, NodeContext, EdgeContext> {
  return {
    nodes,
    validators: {
      allowCycles: false,
      allowConditionalEnds: false,
      allowUnknownDestinations: false,
      ...validators,
    },
  };
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
>(
  edges: Edge<State, NodeName, EdgeContext>[]
): Node<State, NodeName, null, EdgeContext> {
  return node(edges, null);
}

export function to<
  State,
  NodeName extends string = string,
  EdgeContext = unknown
>(
  toNodeName: NodeName,
  when: PredicateFn<State>,
  context: EdgeContext
): Edge<State, NodeName, EdgeContext> {
  return {
    toNodeName,
    predicate: when,
    catchall: false,
    context,
  };
}

export function toWithoutContext<State, NodeName extends string = string>(
  toNodeName: NodeName,
  when: PredicateFn<State>
): Edge<State, NodeName, null> {
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
export function catchallWithoutContext<State, NodeName extends string = string>(
  toNodeName: NodeName
): Edge<State, NodeName, null> {
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
