# Bug report template

```markdown
# <symptom in a few words>

Status: fixed, YYYY-MM-DD.

## Symptom

<What the user or the system showed, and where it was seen.>

## Reproduction

<The smallest steps or command that show it.>

## Root cause

<The cause, with `path:line` evidence.>

## Fix

<What changed and why that removes the cause.>

## Guarding test

<The test that fails without the fix: path and name.>

## Prevention

<Could a check, a type or a rule have stopped this class of bug? A process or lane gap goes to `/fx:fx-retro`.>
```
