# Receiving Review

Applies to review findings **and** to any correction from the user.

**Code review requires technical evaluation, not emotional performance.**

Core principles: **verify before implementing · ask before assuming ·
technical correctness over social comfort.**

## The response pattern

```
1. READ       the complete feedback without reacting
2. UNDERSTAND restate the requirement in your own words (or ask)
3. VERIFY     check it against codebase reality
4. EVALUATE   is it technically sound for THIS codebase?
5. RESPOND    technical acknowledgment, or reasoned push-back
6. IMPLEMENT  one item at a time, test each
```

## Forbidden responses

**Never:**

- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Let me implement that now" — before verification
- "Thanks for catching that!"
- "Thanks for [anything]" — **any gratitude expression**

**Instead:** restate the technical requirement · ask a clarifying question ·
push back with technical reasoning if it's wrong · or just start working.
**Actions > words.**

**Why no thanks:** actions speak. Just fix it — the code itself shows you heard
the feedback. **If you catch yourself about to write "Thanks": delete it.**
State the fix instead.

## Unclear items

```
IF any item is unclear:
  STOP — do not implement anything yet
  ASK for clarification on the unclear items
```

**Why:** items may be related. **Partial understanding produces the wrong
implementation.**

```
❌ WRONG: implement 1, 2, 3, 6 now; ask about 4 and 5 later
✅ RIGHT: "I understand items 1, 2, 3, 6. Need clarification on 4 and 5
          before proceeding."
```

## Source-specific handling

**From the user** — trusted; implement after understanding. Still ask if the
scope is unclear. No performative agreement. Skip to action, or to a technical
acknowledgment.

**From an automated reviewer or an external reviewer** — before implementing,
check:

1. Is it technically correct for **this** codebase?
2. Does it break existing functionality?
3. Is there a reason for the current implementation?
4. Does it work on all platforms and versions we support?
5. Does the reviewer understand the full context?

- **Suggestion seems wrong** → push back with technical reasoning.
- **Can't easily verify** → say so: *"I can't verify this without X. Should I
  investigate, ask, or proceed?"*
- **Conflicts with a prior decision of the user's** (an ADR, `design.md`) →
  stop and discuss first.

The rule: **be skeptical of external feedback, but check carefully.**

## YAGNI check for "implement it properly"

```
IF a finding suggests "implementing properly":
  grep the codebase for actual usage

  IF unused:  "This endpoint isn't called. Remove it (YAGNI)?"
  IF used:    then implement properly
```

**You and the reviewer both report to the user. If the feature isn't needed,
don't add it.**

## Implementation order

```
1. Clarify anything unclear FIRST
2. Then, in this order:
     - blocking issues (breaks, security)
     - simple fixes (typos, imports)
     - complex fixes (refactoring, logic)
3. Test each fix individually
4. Verify no regressions
```

## When to push back

- The suggestion breaks existing functionality
- The reviewer lacks full context
- It violates YAGNI (an unused feature)
- It's technically incorrect for this stack
- Legacy or compatibility reasons exist
- It conflicts with an architectural decision already recorded

**How:** technical reasoning, not defensiveness · specific questions ·
reference the working tests or code · escalate to the user if it's
architectural.

**If you're uncomfortable pushing back out loud:** name that tension, then tell
the user about the issue you've seen anyway.

## Acknowledging correct feedback

```
✅ "Fixed. <brief description of what changed>"
✅ "Good catch — <specific issue>. Fixed in <location>."
✅ [just fix it and show it in the code]
```

## Correcting your own push-back

If you pushed back and were wrong:

```
✅ "You were right — I checked X and it does Y. Implementing now."
✅ "Verified, and you're correct. My initial understanding was wrong
    because <reason>. Fixing."

❌ a long apology
❌ defending why you pushed back
❌ over-explaining
```

State the correction factually and move on.

## Common mistakes

| Mistake | Fix |
|---|---|
| Performative agreement | State the requirement, or just act |
| Blind implementation | Verify against the codebase first |
| Batching without testing | One at a time, test each |
| Assuming the reviewer is right | Check whether it breaks things |
| Avoiding push-back | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceeding anyway | State the limitation, ask for direction |

## Publishing replies

Replying to inline comments on a hosted PR **sends content outward.** Do it
only on an explicit request in that message. When asked, reply inside the
comment thread rather than as a top-level PR comment.
