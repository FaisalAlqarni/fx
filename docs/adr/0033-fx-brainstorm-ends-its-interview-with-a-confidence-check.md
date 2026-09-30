# fx-brainstorm ends its interview with a confidence check

### Context

The owner asked that `fx-brainstorm` keep interviewing until the agent is 95% confident it understands the request. The agent then sends one message saying what made it confident and, in two lines, what it will do, and waits. Before this, the interview ended when the open-questions ledger was empty, and approaches or a design could follow in the same breath.

### Decision

Section 3 of the skill closes with the subsection `Close the interview with a confidence check`. It applies to the bounded and architectural paths. The spike path keeps its own nod gate.

The check is a numbered step in both checklists (bounded step 3, architectural step 4), not a sentence inside another step. The skill tells agents to create a task for each item on their path, so a sentence would never become a task and could be skipped. A red-flags row covers showing approaches in the same message as the check.

The 95% bar has a concrete test: the ledger is empty and no decision rests on a guess. The message names what settled each decision and any assumption still standing.

### Consequences

Every bounded or architectural brainstorm has one extra turn before approaches or a design. The architectural checklist is renumbered 1 to 10; its `(§N)` references are unchanged. `tests/gates/brainstorm-confidence.test.js` pins the text and the step order.
