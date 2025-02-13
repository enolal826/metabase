import {
  restore,
  popover,
  openPeopleTable,
  openProductsTable,
} from "__support__/e2e/cypress";

import { SAMPLE_DATABASE } from "__support__/e2e/cypress_sample_database";

const { ORDERS, ORDERS_ID } = SAMPLE_DATABASE;

describe("scenarios > question > object details", () => {
  const FIRST_ORDER_ID = 9676;
  const SECOND_ORDER_ID = 10874;
  const THIRD_ORDER_ID = 11246;

  const TEST_QUESTION = {
    query: {
      "source-table": ORDERS_ID,
      filter: [
        "and",
        [">", ["field", ORDERS.TOTAL, null], 149],
        [">", ["field", ORDERS.TAX, null], 10],
        ["not-null", ["field", ORDERS.DISCOUNT, null]],
      ],
    },
  };

  beforeEach(() => {
    restore();
    cy.signInAsAdmin();
  });

  it("handles browsing records by PKs", () => {
    cy.createQuestion(TEST_QUESTION, { visitQuestion: true });
    getFirstTableColumn()
      .eq(1)
      .should("contain", FIRST_ORDER_ID)
      .click();

    assertOrderDetailView({ id: FIRST_ORDER_ID });
    getPreviousObjectDetailButton().should("have.attr", "disabled", "disabled");

    getNextObjectDetailButton().click();
    assertOrderDetailView({ id: SECOND_ORDER_ID });

    getNextObjectDetailButton().click();
    assertOrderDetailView({ id: THIRD_ORDER_ID });
    getNextObjectDetailButton().should("have.attr", "disabled", "disabled");

    getPreviousObjectDetailButton().click();
    assertOrderDetailView({ id: SECOND_ORDER_ID });

    getPreviousObjectDetailButton().click();
    assertOrderDetailView({ id: FIRST_ORDER_ID });
  });

  it("handles browsing records by FKs", () => {
    cy.createQuestion(TEST_QUESTION, { visitQuestion: true });
    const FIRST_USER_ID = 1283;

    cy.findByText(String(FIRST_USER_ID)).click();
    popover()
      .findByText("View details")
      .click();

    assertUserDetailView({ id: FIRST_USER_ID });
    getPreviousObjectDetailButton().click();
    assertUserDetailView({ id: FIRST_USER_ID - 1 });
    getNextObjectDetailButton().click();
    getNextObjectDetailButton().click();
    assertUserDetailView({ id: FIRST_USER_ID + 1 });
  });

  it("handles opening a filtered out record", () => {
    cy.intercept("POST", "/api/card/*/query").as("cardQuery");
    const FILTERED_OUT_ID = 1;

    cy.createQuestion(TEST_QUESTION).then(({ body: { id } }) => {
      cy.visit(`/question/${id}/${FILTERED_OUT_ID}`);
      cy.wait("@cardQuery");
      cy.findByText("The page you asked for couldn't be found.");
    });
  });

  it("should allow to browse linked entities by FKs (metabase#21757)", () => {
    const PRODUCT_ID = 7;
    const EXPECTED_LINKED_ORDERS_COUNT = 92;
    const EXPECTED_LINKED_REVIEWS_COUNT = 8;
    openProductsTable();

    getFirstTableColumn()
      .eq(5)
      .should("contain", 5)
      .click();

    cy.findByTestId("object-detail").within(() => {
      cy.findByTestId("fk-relation-orders").findByText(97);
      cy.findByTestId("fk-relation-reviews").findByText(4);
      cy.findByTestId("view-next-object-detail").click();

      cy.findByTestId("fk-relation-orders").findByText(88);
      cy.findByTestId("fk-relation-reviews").findByText(5);
      cy.findByTestId("view-next-object-detail").click();

      cy.findByTestId("fk-relation-reviews").findByText(
        EXPECTED_LINKED_REVIEWS_COUNT,
      );
      cy.findByTestId("fk-relation-orders")
        .findByText(EXPECTED_LINKED_ORDERS_COUNT)
        .click();
    });

    cy.wait("@dataset");

    cy.findByTestId("qb-filters-panel").findByText(
      `Product ID is ${PRODUCT_ID}`,
    );
    cy.findByText(`Showing ${EXPECTED_LINKED_ORDERS_COUNT} rows`);
  });

  it("should not offer drill-through on the object detail records (metabase#20560)", () => {
    openPeopleTable({ limit: 2 });

    cy.get(".Table-ID")
      .contains("2")
      .click();
    cy.url().should("contain", "objectId=2");

    cy.findByTestId("object-detail")
      .findByText("Domenica Williamson")
      .click();
    // Popover is blocking the city. If it renders, Cypress will not be able to click on "Searsboro" and the test will fail.
    // Unfortunately, asserting that the popover does not exist will give us a false positive result.
    cy.findByTestId("object-detail")
      .findByText("Searsboro")
      .click();
  });
});

function getFirstTableColumn() {
  return cy.get(".TableInteractive-cellWrapper--firstColumn");
}

function assertDetailView({ id, entityName, byFK = false }) {
  cy.get("h1")
    .parent()
    .should("contain", entityName)
    .should("contain", id);

  const pattern = byFK
    ? new RegExp(`/question\\?objectId=${id}#*`)
    : new RegExp(`/question/[1-9]d*.*/${id}`);

  cy.url().should("match", pattern);
}

function assertOrderDetailView({ id }) {
  assertDetailView({ id, entityName: "Order" });
}

function assertUserDetailView({ id }) {
  assertDetailView({ id, entityName: "Person", byFK: true });
}

function getPreviousObjectDetailButton() {
  return cy.findByTestId("view-previous-object-detail");
}

function getNextObjectDetailButton() {
  return cy.findByTestId("view-next-object-detail");
}
