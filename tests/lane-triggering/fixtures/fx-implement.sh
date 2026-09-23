#!/usr/bin/env bash
# fx-implement.txt refers to a ready plan at this path; without design.md,
# plan.md and a tasks/ entry the trigger has no subject to point at.
set -euo pipefail
mkdir -p docs/plans/2026-01-01-notes/tasks
cat > docs/plans/2026-01-01-notes/design.md <<'MD'
# Notes: add a note field to the user profile

**Status:** approved

## Design

Add a `note` text column to the `users` table, nullable, max 280 characters.
MD
cat > docs/plans/2026-01-01-notes/plan.md <<'MD'
# Plan: add a note field to the user profile

**Status:** approved

## Tasks

- 01-add-note: add the `note` column and expose it on the profile form.
MD
cat > docs/plans/2026-01-01-notes/tasks/01-add-note.md <<'MD'
# 01: add a note field to the user profile

**Status:** ready-for-agent

Add a nullable `note` text column (max 280 characters) to `users`. Expose it
on the profile edit form and the profile view.
MD
