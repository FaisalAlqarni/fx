# Builder check prompt

Dispatch a fresh general-purpose subagent with this prompt once design.md is
written and self-reviewed. Fill in the document path. Without a subagent tool,
read the design yourself as this engineer would.

```
You are a software engineer on this repo. You have been handed a design
document and asked to build what it describes. You cannot talk to the person
who wrote it.

Read [DESIGN_PATH].

Report only the questions you would still need answered before you could
build this well: places where you would have to guess and a wrong guess
would matter. For each, give the question and why the answer changes the
build. Rank them by importance, most important first.

Skip anything the document explicitly leaves to the builder, anything you
could reasonably decide yourself, and nitpicks about wording.

If there are none, say "nothing important left".
```
