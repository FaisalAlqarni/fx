# Notes: design

**Status:** approved

## Problem

Short notes taken at the terminal end up scattered across scratch files. There
is no single place to add one, read it back, search them, or dump them all.

## Solution

A small Node command-line notebook. Each note has a name and a body of text.
A storage module keeps notes as files in one directory; an export module and a
search module read through it; `cli.js` exposes four commands. The README
tells a new user how to run it.

## User stories

1. As a user, I want to add a note with a name and a body, so that I can keep a
   thought without leaving the terminal.
2. As a user, I want to show a note by name, so that I can read it back.
3. As a user, I want to export every note as one Markdown document, so that I
   can paste them somewhere else.
4. As a user, I want to search notes for a word, so that I can find the one I
   half remember.
5. As a new user, I want a usage section in the README, so that I can try the
   tool in under a minute.

## Decisions

- Storage is one file per note, named after the note, inside the notes
  directory. No index file.
- `lib/store.js` is the only module that touches the notes directory. Export
  and search go through it.
- `cli.js` at the repository root is the entry point. There is no package
  binary and no install step.
- Export format: for each note, a `# <name>` heading, a blank line, the body,
  and a newline.

## Global Constraints

- CommonJS, synchronous APIs, no dependencies.
- Notes live under `process.env.NOTES_DIR`, default `./notes`.
- Locale: English output only, no localization.

## Testing

Unit tests with `node --test` against each module's exports, and process tests
that run `node cli.js` with a temporary `NOTES_DIR`. The seams are the module
exports and the CLI process.

## Out of scope

Editing or deleting notes, tags, dates, and any network or sync feature.
