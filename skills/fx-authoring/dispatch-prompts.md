## Writing a subagent dispatch prompt

Structure as **ordered facets**: more reliable than freeform constraint prose.
Constraints last, for recency.

1. **Persona**: role, expertise, operating principles.
2. **Knowledge**: the specific context and references it needs. Nothing more.
3. **Instruction**: the one concrete task.
4. **Policy**: split into **rules** (MUST), **prohibitions** (NEVER), and
   **standards** (quality bars). Splitting one "constraints" blob into these
   three catches far more.
5. **Output contract**: the exact return shape: a greppable verdict line, a
   JSON schema, or a bounded artifact handle (path + summary + confidence).
   **Never "return your findings": name the format.**

Keep each facet minimal. Add only what the agent lacks.
