import { expect, it } from "@jest/globals";

import {
  catchallWithoutContext,
  createGraph,
  nodeWithoutContext,
  toWithoutContext,
} from "./dag";
import { getGraphErrors } from "./validator";

interface SurveyCreator {
  questionType: "multipleChoice" | "date" | "monthYear";
}

it("given a valid graph, none of the validators return errors", () => {
  const graph = createGraph<SurveyCreator>(
    {
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
    {
      allowCycles: false,
      allowConditionalEnds: false,
      allowUnknownDestinations: false,
    }
  );

  expect(getGraphErrors(graph)).toEqual([]);
});

it("given a graph with an unknown destination `catchall`, the validator returns an error", () => {
  const graph = createGraph<SurveyCreator>({
    first: nodeWithoutContext([catchallWithoutContext("finish")]),
  });

  expect(getGraphErrors(graph)[0]).toMatch(/unknown destination node.*finish/i);
});

it("given a graph with an unknown destination `to`, the validator returns an error", () => {
  const graph = createGraph<SurveyCreator>({
    first: nodeWithoutContext([
      toWithoutContext("second", () => false),
      catchallWithoutContext("finish"),
    ]),
    finish: nodeWithoutContext([]),
  });

  expect(getGraphErrors(graph)[0]).toMatch(/unknown destination node.*second/i);
});

it("given a graph with an unknown destinations but the unknown destinations validator off, the validator returns no errors", () => {
  const graph = createGraph<SurveyCreator>(
    {
      first: nodeWithoutContext([
        toWithoutContext("second", () => false),
        catchallWithoutContext("finish"),
      ]),
    },
    { allowUnknownDestinations: true }
  );

  expect(getGraphErrors(graph)).toHaveLength(0);
});

it("given a graph with `to` predicates but without a `catchall`, the validator returns an error", () => {
  const graph = createGraph<SurveyCreator>({
    first: nodeWithoutContext([toWithoutContext("second", () => false)]),
    second: nodeWithoutContext([]),
  });

  expect(getGraphErrors(graph)[0]).toMatch(/catchall route is required/i);
});

it("given a graph with `to` predicates but without a `catchall`, when the catchall validator is disabled, the validator returns no errors", () => {
  const graph = createGraph<SurveyCreator>(
    {
      first: nodeWithoutContext([toWithoutContext("second", () => false)]),
      second: nodeWithoutContext([]),
    },
    { allowConditionalEnds: true }
  );

  expect(getGraphErrors(graph)).toHaveLength(0);
});

it("given a graph with a `catchall` before a conditional predicate, the validator returns an error", () => {
  const graph = createGraph<SurveyCreator>(
    {
      first: nodeWithoutContext([
        catchallWithoutContext("finish"),
        toWithoutContext("second", () => false),
      ]),
      second: nodeWithoutContext([]),
      finish: nodeWithoutContext([]),
    },
    {
      allowCycles: true,
      allowConditionalEnds: true,
      allowUnknownDestinations: true,
    }
  );

  expect(getGraphErrors(graph)[0]).toMatch(
    /catchall route should be the last route/i
  );
});

it("given a graph with a cycle, the validator returns an error", () => {
  const graph = createGraph<SurveyCreator>({
    first: nodeWithoutContext([catchallWithoutContext("second")]),
    second: nodeWithoutContext([catchallWithoutContext("third")]),
    third: nodeWithoutContext([catchallWithoutContext("first")]),
  });

  expect(getGraphErrors(graph)[0]).toMatch(/cycle detected/i);
});

it("given a graph with an immediate cycle, the validator returns an error", () => {
  const graph = createGraph<SurveyCreator>({
    first: nodeWithoutContext([catchallWithoutContext("first")]),
  });

  expect(getGraphErrors(graph)[0]).toMatch(/cycle detected/i);
});

it("given a graph with a cycle but the cycle validator disabled, the validator returns no errors", () => {
  const graph = createGraph<SurveyCreator>(
    {
      first: nodeWithoutContext([catchallWithoutContext("second")]),
      second: nodeWithoutContext([catchallWithoutContext("third")]),
      third: nodeWithoutContext([catchallWithoutContext("first")]),
      fourth: nodeWithoutContext([catchallWithoutContext("fourth")]),
    },
    {
      allowCycles: true,
    }
  );

  expect(getGraphErrors(graph)).toHaveLength(0);
});
