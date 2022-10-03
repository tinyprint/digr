import { Graph, Node } from "./graph";

function nodeError(nodeName: string, error: string) {
  return `error with definition of node '${nodeName}': ${error}`;
}

type ValidatorFn = <
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  graph: Graph<State, NodeName, NodeContext, EdgeContext>
) => string[];

function validatePrematureCatchalls<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(graph: Graph<State, NodeName, NodeContext, EdgeContext>): string[] {
  return Object.entries<Node<State, NodeName, NodeContext, EdgeContext>>(
    graph.nodes
  ).flatMap(([nodeName, node]) => {
    if (node.edges.length === 0) {
      return [];
    }

    const catchallNodeIndex = node.edges.findIndex(
      (nextNode) => nextNode.catchall
    );
    if (
      catchallNodeIndex !== -1 &&
      catchallNodeIndex !== node.edges.length - 1
    ) {
      return [
        nodeError(
          nodeName,
          "catchall route should be the last route in the list of 'next' predicates"
        ),
      ];
    }

    return [];
  });
}

function getCyclicalErrors<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(
  graph: Graph<State, NodeName, NodeContext, EdgeContext>,
  nodeName: NodeName,
  visitedNodes: NodeName[] = [nodeName]
): string[] {
  if (
    typeof graph.nodes[nodeName] === "undefined" ||
    graph.nodes[nodeName].edges.length === 0
  ) {
    return [];
  }

  return graph.nodes[nodeName].edges.flatMap(({ toNodeName }) => {
    if (visitedNodes.includes(toNodeName)) {
      return nodeError(
        nodeName,
        `cycle detected: ${visitedNodes.join(" => ")} => ${toNodeName}`
      );
    }

    return getCyclicalErrors(graph, toNodeName, [...visitedNodes, toNodeName]);
  });
}

function validateCycles<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(graph: Graph<State, NodeName, NodeContext, EdgeContext>): string[] {
  return Object.entries<Node<State, NodeName, NodeContext, EdgeContext>>(
    graph.nodes
  ).flatMap(([nodeName]) => getCyclicalErrors(graph, nodeName));
}

function validateConditionalEnds<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(graph: Graph<State, NodeName, NodeContext, EdgeContext>): string[] {
  return Object.entries<Node<State, NodeName, NodeContext, EdgeContext>>(
    graph.nodes
  ).flatMap(([nodeName, node]) => {
    if (node.edges.length === 0) {
      return [];
    }

    const catchallNodeIndex = node.edges.findIndex(
      (nextNode) => nextNode.catchall
    );
    if (catchallNodeIndex === -1) {
      return [
        nodeError(
          nodeName,
          "catchall route is required for all nodes that have any 'next' predicates defined"
        ),
      ];
    }

    return [];
  });
}

function validateDestinations<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(graph: Graph<State, NodeName, NodeContext, EdgeContext>): string[] {
  return Object.entries<Node<State, NodeName, NodeContext, EdgeContext>>(
    graph.nodes
  ).flatMap(([nodeName, node]) => {
    if (node.edges.length === 0) {
      return [];
    }

    return node.edges
      .filter(
        (nextNode) => typeof graph.nodes[nextNode.toNodeName] === "undefined"
      )
      .map(({ toNodeName }) =>
        nodeError(nodeName, `unknown destination node '${toNodeName}'`)
      );
  });
}

export default function validate<
  State,
  NodeName extends string = string,
  NodeContext = unknown,
  EdgeContext = unknown
>(graph: Graph<State, NodeName, NodeContext, EdgeContext>): string[] {
  const validators: ValidatorFn[] = [validatePrematureCatchalls];
  if (!graph.validators.allowCycles) {
    validators.push(validateCycles);
  }
  if (!graph.validators.allowConditionalEnds) {
    validators.push(validateConditionalEnds);
  }
  if (!graph.validators.allowUnknownDestinations) {
    validators.push(validateDestinations);
  }

  return validators.flatMap((validator) => validator(graph));
}
