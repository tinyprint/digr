import { expect, it } from "@jest/globals";

import {
  catchallWithoutContext,
  Graph,
  nodeWithoutContext,
  toWithoutContext,
} from "./dag";
import { getGraphErrors } from "./validator";

interface SurveyCreator {
  questionType: "multipleChoice" | "date" | "monthYear";
}

it("given a valid graph, the validator returns no errors", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      questionType: nodeWithoutContext([
        toWithoutContext("monthYear", (s) => s.questionType === "monthYear"),
        toWithoutContext("date", (s) => s.questionType === "date"),
        catchallWithoutContext("multipleChoice"),
      ]),
      monthYear: nodeWithoutContext([catchallWithoutContext("finish")]),
      date: nodeWithoutContext([catchallWithoutContext("finish")]),
      multipleChoice: nodeWithoutContext([catchallWithoutContext("finish")]),
      finish: nodeWithoutContext([]),
    },
  };

  expect(getGraphErrors(graph)).toEqual([]);
});

it("given a graph with an unknown destination `catchall`, the validator returns an error", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      first: nodeWithoutContext([catchallWithoutContext("finish")]),
    },
  };

  expect(getGraphErrors(graph)[0]).toMatch(/unknown destination node.*finish/i);
});

it("given a graph with an unknown destination `to`, the validator returns an error", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      first: nodeWithoutContext([
        toWithoutContext("second", () => false),
        catchallWithoutContext("finish"),
      ]),
      finish: nodeWithoutContext([]),
    },
  };

  expect(getGraphErrors(graph)[0]).toMatch(/unknown destination node.*second/i);
});

it("given a graph with `to` predicates but without a `catchall`, the validator returns an error", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      first: nodeWithoutContext([toWithoutContext("second", () => false)]),
      second: nodeWithoutContext([]),
    },
  };

  expect(getGraphErrors(graph)[0]).toMatch(/catchall route is required/i);
});

it("given a graph with a `catchall` before a conditional predicate, the validator returns an error", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      first: nodeWithoutContext([
        catchallWithoutContext("finish"),
        toWithoutContext("second", () => false),
      ]),
      second: nodeWithoutContext([]),
      finish: nodeWithoutContext([]),
    },
  };

  expect(getGraphErrors(graph)[0]).toMatch(
    /catchall route should be the last route/i
  );
});

it("given a graph with a cycle, the validator returns an error", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      first: nodeWithoutContext([catchallWithoutContext("second")]),
      second: nodeWithoutContext([catchallWithoutContext("third")]),
      third: nodeWithoutContext([catchallWithoutContext("first")]),
    },
  };

  expect(getGraphErrors(graph)[0]).toMatch(/cycle detected/i);
});

it("given a graph with an immediate cycle, the validator returns an error", () => {
  const graph: Graph<SurveyCreator> = {
    nodes: {
      first: nodeWithoutContext([catchallWithoutContext("first")]),
    },
  };

  expect(getGraphErrors(graph)[0]).toMatch(/cycle detected/i);
});
