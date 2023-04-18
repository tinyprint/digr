import { expect, it } from "@jest/globals";

import {
  catchall,
  catchallWithoutContext,
  createGraph,
  next,
  node,
  nodeWithoutContext,
  to,
  topologicalOrder,
  toWithoutContext,
} from "./graph";
import validate from "./validator";

interface SurveyCreator {
  questionType: "multipleChoice" | "date" | "monthYear";
}

it("given a valid graph, the next route is properly determined", () => {
  const graph = createGraph<SurveyCreator>({
    questionType: nodeWithoutContext([
      toWithoutContext("monthYear", (s) => s.questionType === "monthYear"),
      toWithoutContext("date", (s) => s.questionType === "date"),
      catchallWithoutContext("multipleChoice"),
    ]),
    monthYear: nodeWithoutContext([catchallWithoutContext("finish")]),
    date: nodeWithoutContext([catchallWithoutContext("finish")]),
    multipleChoice: nodeWithoutContext([catchallWithoutContext("finish")]),
    finish: nodeWithoutContext([]),
  });

  const surveyNext = (currentNodeName: string, currentState: SurveyCreator) =>
    next(graph, currentNodeName, currentState);

  const multipleChoiceSurvey: SurveyCreator = {
    questionType: "multipleChoice",
  };
  expect(surveyNext("questionType", multipleChoiceSurvey)).toBe(
    "multipleChoice"
  );
  expect(surveyNext("multipleChoice", multipleChoiceSurvey)).toBe("finish");

  const monthYearSurvey: SurveyCreator = {
    questionType: "monthYear",
  };
  expect(surveyNext("questionType", monthYearSurvey)).toBe("monthYear");
  expect(surveyNext("monthYear", monthYearSurvey)).toBe("finish");

  const dateSurvey: SurveyCreator = {
    questionType: "date",
  };
  expect(surveyNext("questionType", dateSurvey)).toBe("date");
  expect(surveyNext("date", dateSurvey)).toBe("finish");

  expect(surveyNext("finish", dateSurvey)).toBeNull();
});

it("given a graph with a custom edge context, the custom edge's properties can be accessed", () => {
  type NodeName = "start" | "multipleChoice" | "finish";
  interface EdgeContext {
    annotation: string;
  }

  const graph = createGraph<SurveyCreator, NodeName, unknown, EdgeContext>({
    start: nodeWithoutContext([
      to("multipleChoice", (s) => s.questionType === "multipleChoice", {
        annotation: "questionType is multiple choice",
      }),
      catchall("finish", { annotation: "*" }),
    ]),
    multipleChoice: nodeWithoutContext([
      catchall("finish", { annotation: "*" }),
    ]),
    finish: nodeWithoutContext([]),
  });

  expect(graph.nodes.start.edges[0].context.annotation).toBe(
    "questionType is multiple choice"
  );
  expect(graph.nodes.start.edges[1].context.annotation).toBe("*");
  expect(graph.nodes.multipleChoice.edges[0].context.annotation).toBe("*");
});

it("given a graph with a custom edge context, some edges can lack context", () => {
  type NodeName = "start" | "multipleChoice" | "finish";
  interface EdgeContext {
    annotation: string;
  }

  const graph = createGraph<
    SurveyCreator,
    NodeName,
    unknown,
    EdgeContext | null
  >({
    start: nodeWithoutContext([
      to("multipleChoice", (s) => s.questionType === "multipleChoice", {
        annotation: "questionType is multiple choice",
      }),
      catchallWithoutContext("finish"),
    ]),
    multipleChoice: nodeWithoutContext([
      toWithoutContext("finish", () => false),
      catchall("finish", { annotation: "*" }),
    ]),
    finish: nodeWithoutContext([]),
  });

  expect(graph.nodes.start.edges[0].context?.annotation).toBe(
    "questionType is multiple choice"
  );
  expect(graph.nodes.start.edges[1].context).toBeNull();
  expect(graph.nodes.multipleChoice.edges[0].context).toBeNull();
  expect(graph.nodes.multipleChoice.edges[1].context?.annotation).toBe("*");
});

it("given a graph with a custom node context, the custom node's properties can be accessed", () => {
  type NodeName = "start" | "finish";
  interface NodeContext {
    component: () => string;
  }

  const graph = createGraph<SurveyCreator, NodeName, NodeContext>({
    start: node([catchallWithoutContext("finish")], {
      component: () => "<Start>",
    }),
    finish: node([], { component: () => "<Finish>" }),
  });

  expect(graph.nodes.start.context.component()).toBe("<Start>");
  expect(graph.nodes.finish.context.component()).toBe("<Finish>");
});

it("given a graph with a custom node context, some nodes can lack context", () => {
  type NodeName = "start" | "finish";
  interface NodeContext {
    component: () => string;
  }

  const graph = createGraph<SurveyCreator, NodeName, NodeContext | null>({
    start: node([catchallWithoutContext("finish")], {
      component: () => "<Start>",
    }),
    finish: nodeWithoutContext([]),
  });

  expect(graph.nodes.start.context?.component()).toBe("<Start>");
  expect(graph.nodes.finish.context).toBeNull();
});

it("given a graph, the topological order can be determined", () => {
  const graph = createGraph<SurveyCreator>({
    monthYear: nodeWithoutContext([catchallWithoutContext("finish")]),
    questionType: nodeWithoutContext([
      toWithoutContext("monthYear", (s) => s.questionType === "monthYear"),
      toWithoutContext("date", (s) => s.questionType === "date"),
      toWithoutContext(
        "multipleChoice",
        (s) => s.questionType === "multipleChoice"
      ),
      catchallWithoutContext("other"),
    ]),
    date: nodeWithoutContext([catchallWithoutContext("finish")]),
    multipleChoice: nodeWithoutContext([catchallWithoutContext("details")]),
    other: nodeWithoutContext([
      toWithoutContext("details", (s) => s.questionType === "multipleChoice"),
      catchallWithoutContext("unknown"),
    ]),
    details: nodeWithoutContext([catchallWithoutContext("finish")]),
    unknown: nodeWithoutContext([]),
    finish: nodeWithoutContext([]),
    unused: nodeWithoutContext([]),
  });

  expect(validate(graph)).toHaveLength(0);

  const order = topologicalOrder(graph);
  expect([
    order[0].sort(),
    order[1].sort(),
    order[2].sort(),
    order[3].sort(),
  ]).toEqual([
    ["unused", "questionType"].sort(),
    ["monthYear", "date", "multipleChoice", "other"].sort(),
    ["details", "unknown"].sort(),
    ["finish"].sort(),
  ]);
});
