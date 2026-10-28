# Interview

The controller runs this after the draft build passes. It settles the open
questions with the owner and writes the answers into the fragments.

## Gather

Merge the open questions from every area return and the controller's own into
`<site>/model/fragments/questions.json`. Two questions about the same items
become one. Every question carries a recommended answer: the answer the code
makes most likely, in one sentence, in `recommended`, and its `items` list the
handles it settles (`node:engine-api`, `edge:engine-l1:engine-api>engine-db`).

## Open

Send the count and the choice, with `<n>` the number of questions:

```markdown
<n> questions. Answer one at a time, skip, or take the recommended answer for every question.
```

Then ask question 1. One question per message: its text, the items it
settles, and its recommended answer. Wait for the reply before the next.

## Each reply

- **An answer, or the recommendation taken** (for this question, or for every
  question when the owner says so): write `answer` and `date` on the question.
  On every item it settles, add the owner entry
  `{ "owner": "<date>", "question": "<question id>" }` to `evidence` and
  remove `unconfirmed`. The site shows it as `owner, <date>`.
- **A skip:** leave the items `unconfirmed` and the question unanswered. It
  stays listed on the site as open.
- **An answer that changes a fact already in a fragment** (a label, a role, a
  store row, a flow step): edit the item in the fragment that owns it and add
  a `corrections` entry with `reason: "owner"`, the `before` and `after` text,
  and the date.

After each write, run `system-flow check --fragment <file>` on every fragment
you changed until it exits 0.

## Done

The interview is done when every question is answered or skipped. Report the
count of each in step 6.
