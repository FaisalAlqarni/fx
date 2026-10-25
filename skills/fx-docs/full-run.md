# Full run

Use it when the owner asks for it, or when no doc in the repo carries an evidence
line. Read first, draft everything, then ask.

## 1. Read

Read the code and its structure first: the top-level layout, each engine or
package, the entry points, the data stores, the jobs and the integrations. Use
semble on the repo itself. Read `repo.md`, `CONTEXT.md` and the ADRs when they
exist. The code is the evidence; note path, lines and symbol as you read.

## 2. The doc set

Name and place the files to fit the repo. Cover:

- **Overview and architecture:** what the system is for, its parts, how they fit.
- **Flows:** each public flow, step by step, with a Mermaid diagram.
- **Data and stores:** the tables, caches and queues, and who owns each.
- **Operations and onboarding:** how to run, deploy, test and debug it, and what
  a new engineer reads first.

Every factual claim gets its evidence line. Mark unbuilt or deferred things as
such.

## 3. Draft everything

Write the whole set before asking anything. Anything the code cannot answer is an
open question in the repo's callout form, not a guess.

## 4. Interview

Ask the owner about what the code cannot say, most about purpose and users,
history and decisions, and operations. Ask one question at a time. A confirmed
answer replaces its open question and cites `owner, <date>` as evidence. The owner
may skip the interview; the open questions stay.

## 5. Finish

Write the verified marker into every doc, run the stale check on the result, and
report the docs written and the open questions left.
