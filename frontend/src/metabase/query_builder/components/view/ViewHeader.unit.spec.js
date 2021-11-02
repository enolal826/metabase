import React from "react";
import xhrMock from "xhr-mock";
import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from "__support__/ui";
import {
  SAMPLE_DATASET,
  ORDERS,
  metadata,
} from "__support__/sample_dataset_fixture";
import Question from "metabase-lib/lib/Question";
import { ViewTitleHeader } from "./ViewHeader";

const BASE_GUI_QUESTION = {
  display: "table",
  visualization_settings: {},
  dataset_query: {
    type: "query",
    database: SAMPLE_DATASET.id,
    query: {
      "source-table": ORDERS.id,
    },
  },
};

const SAVED_GUI_QUESTION = {
  ...BASE_GUI_QUESTION,
  id: 1,
  name: "Q1",
  description: null,
  collection_id: null,
};

function getQuestion(card) {
  return new Question(card, metadata);
}

function getAdHocQuestion() {
  return getQuestion(BASE_GUI_QUESTION);
}

function getSavedGUIQuestion() {
  return getQuestion(SAVED_GUI_QUESTION);
}

function setup({ question, ...props } = {}) {
  const callbacks = {
    setQueryBuilderMode: jest.fn(),
    onOpenQuestionDetails: jest.fn(),
    onCloseQuestionDetails: jest.fn(),
    onOpenModal: jest.fn(),
    onAddFilter: jest.fn(),
    onCloseFilter: jest.fn(),
    onEditSummary: jest.fn(),
    onCloseSummary: jest.fn(),
  };

  renderWithProviders(
    <ViewTitleHeader {...callbacks} {...props} question={question} />,
    {
      withRouter: true,
      withSampleDataset: true,
    },
  );

  return { question, ...callbacks };
}

function setupAdHoc(props = {}) {
  return setup({ question: getAdHocQuestion(), ...props });
}

function setupSavedGUI(props = {}) {
  const collection = {
    id: "root",
    name: "Our analytics",
  };

  xhrMock.get("/api/collection/root", {
    body: JSON.stringify(collection),
  });

  const utils = setup({ question: getSavedGUIQuestion(), ...props });

  return {
    ...utils,
    collection,
  };
}

describe("ViewHeader | Common", () => {
  const TEST_CASE = {
    SAVED_GUI_QUESTION: {
      question: getSavedGUIQuestion(),
      questionType: "a saved GUI question",
    },
    AD_HOC_QUESTION: {
      question: getAdHocQuestion(),
      questionType: "an ad-hoc question",
    },
  };

  const ALL_TEST_CASES = Object.values(TEST_CASE);
  const GUI_TEST_CASES = [
    TEST_CASE.SAVED_GUI_QUESTION,
    TEST_CASE.AD_HOC_QUESTION,
  ];

  ALL_TEST_CASES.forEach(testCase => {
    const { question, questionType } = testCase;

    it(`offers to save ${questionType}`, () => {
      const { onOpenModal } = setup({ question, isDirty: true });
      fireEvent.click(screen.getByText("Save"));
      expect(onOpenModal).toHaveBeenCalledWith("save");
    });

    it(`does not offer to save ${questionType} if it's not dirty`, () => {
      setup({ question, isDirty: false });
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });
  });

  GUI_TEST_CASES.forEach(testCase => {
    const { question, questionType } = testCase;

    it(`displays database and table names for ${questionType}`, () => {
      setup({ question });
      const databaseName = question.database().displayName();
      const tableName = question.table().displayName();

      expect(screen.queryByText(databaseName)).toBeInTheDocument();
      expect(screen.queryByText(tableName)).toBeInTheDocument();
    });

    it(`offers to filter ${questionType} results`, () => {
      const { onAddFilter } = setup({
        question,
        queryBuilderMode: "view",
      });
      fireEvent.click(screen.getByText("Filter"));
      expect(onAddFilter).toHaveBeenCalled();
    });

    it(`offers to summarize ${questionType} results`, () => {
      const { onEditSummary } = setup({
        question,
        queryBuilderMode: "view",
      });
      fireEvent.click(screen.getByText("Summarize"));
      expect(onEditSummary).toHaveBeenCalled();
    });

    it(`allows to open notebook editor for ${questionType}`, () => {
      const { setQueryBuilderMode } = setup({
        question,
        queryBuilderMode: "view",
      });
      fireEvent.click(screen.getByLabelText("notebook icon"));
      expect(setQueryBuilderMode).toHaveBeenCalledWith("notebook");
    });

    it(`allows to close notebook editor for ${questionType}`, () => {
      const { setQueryBuilderMode } = setup({
        question,
        queryBuilderMode: "notebook",
      });
      fireEvent.click(screen.getByLabelText("notebook icon"));
      expect(setQueryBuilderMode).toHaveBeenCalledWith("view");
    });

    it(`does not offer to filter ${questionType} results in notebook mode`, () => {
      setup({ question, queryBuilderMode: "notebook" });
      expect(screen.queryByText("Filter")).not.toBeInTheDocument();
    });

    it(`does not offer to filter ${questionType} in detail view`, () => {
      setup({ question, isObjectDetail: true });
      expect(screen.queryByText("Filter")).not.toBeInTheDocument();
    });

    it(`does not offer to summarize ${questionType} results in notebook mode`, () => {
      setup({ question, queryBuilderMode: "notebook" });
      expect(screen.queryByText("Summarize")).not.toBeInTheDocument();
    });

    it(`does not offer to summarize ${questionType} in detail view`, () => {
      setup({ question, isObjectDetail: true });
      expect(screen.queryByText("Summarize")).not.toBeInTheDocument();
    });
  });
});

describe("ViewHeader | Ad-hoc GUI question", () => {
  it("displays database and table names", () => {
    const { question } = setupAdHoc();
    const databaseName = question.database().displayName();
    const tableName = question.table().displayName();

    expect(screen.queryByText(databaseName)).toBeInTheDocument();
    expect(screen.queryByText(tableName)).toBeInTheDocument();
  });

  it("does not open details sidebar on table name click", () => {
    const { question, onOpenQuestionDetails } = setupAdHoc();
    const tableName = question.table().displayName();

    fireEvent.click(screen.getByText(tableName));

    expect(onOpenQuestionDetails).not.toHaveBeenCalled();
  });
});

describe("ViewHeader | Saved GUI question", () => {
  beforeEach(() => {
    xhrMock.setup();
  });

  afterEach(() => {
    xhrMock.teardown();
  });

  it("displays collection where a question is saved to", async () => {
    const { collection } = setupSavedGUI();
    await waitFor(() => screen.queryByText(collection.name));
    expect(screen.queryByText(collection.name)).toBeInTheDocument();
  });

  it("opens details sidebar on question name click", () => {
    const { question, onOpenQuestionDetails } = setupSavedGUI();
    fireEvent.click(screen.getByText(question.displayName()));
    expect(onOpenQuestionDetails).toHaveBeenCalled();
  });
});
