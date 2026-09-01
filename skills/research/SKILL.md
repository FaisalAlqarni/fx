---
name: research
description: >
  Use when a question can only be answered from OUTSIDE this repo: "research
  this", "look it up", "what do the docs say", "read the spec", "check the
  RFC", "how does <library> actually do this", "find out what's changed in
  v3", "go read this and report back". For facts that live in this repo,
  dispatch `Explore` instead — that is not this.
---

Spin up a **background agent** to do the research, so you keep working while it reads.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.

**Keep this codebase out of the queries.** A search leaves the machine and reaches a third party, so no query may carry a module name, a file path, or an internal service name — the question goes out in public terms (the library, the protocol, the vendor's own wording of the error) and the joining-up back to our code happens here, after the answer lands.
