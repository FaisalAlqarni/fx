#!/usr/bin/env python3
"""Run: python3 lib/fix-dashes.test.py

Every case here is one the fixer got wrong on a real file. The first version
replaced every ' - ' with ': ' and produced "in every caller: and patching". The
second version added paragraph-aware pairing and was worse: it paired one list
item's dash with the NEXT item's dash and emitted 272 mismatched parentheses
across 35 files, including "1. **Expand** (add the new form ... 2. **Migrate**)".

So the rule is: a fixer that rewrites prose in bulk gets a regression suite
before it is pointed at anything, and every case in it is a real defect rather
than an imagined one.
"""
import importlib.machinery
import importlib.util
import pathlib
import sys

spec = importlib.util.spec_from_loader(
    'check_prose',
    importlib.machinery.SourceFileLoader(
        'check_prose', str(pathlib.Path(__file__).resolve().parent.parent / 'scripts' / 'check-prose')))
cp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cp)

EM = '\u2014'   # kept as an escape so the fixer cannot rewrite its own fixture
EN = '\u2013'

CASES = [
    # (label, input, expected)
    ('single dash becomes a colon',
     f'Boring over clever {EM} clever is what someone decodes at 3am.\n',
     'Boring over clever: clever is what someone decodes at 3am.\n'),

    ('dash before a conjunction becomes a comma',
     f'a guard in every caller {EM} and patching only the path\n',
     'a guard in every caller, and patching only the path\n'),

    ('paired dashes on one line become parentheses',
     f'Project facts {EM} structure, patterns {EM} are in repo.md\n',
     'Project facts (structure, patterns) are in repo.md\n'),

    ('paired dashes wrapped across a continuation line still pair',
     f'question {EM} how deep the module is,\nwhere it belongs {EM} read the reference\n',
     'question (how deep the module is,\nwhere it belongs) read the reference\n'),

    ('numeric ranges are ranges, not clause breaks',
     f'2{EN}3 sentences on the approach\n',
     '2 to 3 sentences on the approach\n'),

    # ---- the 272-line regression ----
    ('an ordered list does not pair across items',
     f'1. **Expand** {EM} add the new form beside the old.\n'
     f'2. **Migrate** {EM} move call sites over in batches.\n',
     '1. **Expand**: add the new form beside the old.\n'
     '2. **Migrate**: move call sites over in batches.\n'),

    ('a bullet list does not pair across items',
     f'- **MVP** {EM} the smallest slice that provides value\n'
     f'- **Core** {EM} the complete happy path\n',
     '- **MVP**: the smallest slice that provides value\n'
     '- **Core**: the complete happy path\n'),

    ('a blockquoted list does not pair across items',
     f'> 1. **Start implementing** {EM} hand off to fx-implement\n'
     f'> 2. **Red-team it** {EM} fx-devils-advocate in plan mode\n',
     '> 1. **Start implementing**: hand off to fx-implement\n'
     '> 2. **Red-team it**: fx-devils-advocate in plan mode\n'),

    ('a table row does not pair across cells',
     f'| `fx-lens-database` | 100 {EM} 6 engines | one Postgres {EM} highest value |\n',
     '| `fx-lens-database` | 100: 6 engines | one Postgres: highest value |\n'),

    ('a heading takes a colon, never a paren',
     f'## Seams {EM} confirm before writing anything\n',
     '## Seams: confirm before writing anything\n'),

    ('pairing does not cross a blank line',
     f'first paragraph ends here {EM} like this\n\nsecond one starts {EM} like this\n',
     'first paragraph ends here: like this\n\nsecond one starts: like this\n'),

    ('fenced code is left exactly as written',
     f'```\nlet x = a {EM} b;\n```\ntext {EM} here\n',
     f'```\nlet x = a {EM} b;\n```\ntext: here\n'),

    # Two unrelated sentences, each with its own single dash. Pairing them wraps
    # a paren around the sentence boundary and produces text nobody wrote.
    ('does not pair across a sentence boundary',
     f'you have already stopped {EM} queue the next one instead of explaining.\n'
     f'Progress summaries waste time {EM} they asked you to execute the plan.\n',
     'you have already stopped: queue the next one instead of explaining.\n'
     'Progress summaries waste time: they asked you to execute the plan.\n'),

    ('does not pair across a question mark either',
     f'"what does personality mean here?" is conceptual {EM} terminal.\n'
     f'"Which layout works better?" is visual {EM} browser.\n',
     '"what does personality mean here?" is conceptual: terminal.\n'
     '"Which layout works better?" is visual: browser.\n'),

    ('a dash hard against a word still goes',
     f'the em{EM}dash rule\n',
     'the em:dash rule\n'),

    # Measured on the fx prompt templates: a dash sitting at end of line was
    # matched with its own newline, so the replacement ate the line break and
    # left the next line's indentation stranded mid-sentence:
    #   '...my report":     that review is already scheduled.'
    ('a dash at end of line keeps the line break and the indentation',
     f'yourself thinking "an independent review would help" {EM}\n'
     '    that review is already scheduled.\n',
     'yourself thinking "an independent review would help":\n'
     '    that review is already scheduled.\n'),

    ('the same, unindented',
     f'the failure must be caused by the missing behavior {EM}\n'
     'not by a typo.\n',
     'the failure must be caused by the missing behavior:\n'
     'not by a typo.\n'),

    # A colon already on the line means a second one reads as a stutter:
    # 'Lens: security: N findings', '[MODEL: REQUIRED: ...]'.
    ('a line that already has a colon takes a comma instead',
     f'Lens: security {EM} N findings\n',
     'Lens: security, N findings\n'),

    ('the colon may follow the dash and still forces a comma',
     f'model: [MODEL {EM} REQUIRED: per SKILL.md Model Selection]\n',
     'model: [MODEL, REQUIRED: per SKILL.md Model Selection]\n'),

    ('a line with no colon is unaffected by that rule',
     f'the output is pristine {EM} no stray warnings.\n',
     'the output is pristine: no stray warnings.\n'),

    # The 272-line paren defect again, in a shape the list-marker guard misses:
    # a tree or aligned table whose entries are columns, not list items. Each
    # line carries its own dash, so line 1's opened a paren line 2's closed:
    #   'skills/  9 lanes (model-selectable, one per intent
    #    agents/  the devil's advocate) read-only'
    ('does not pair across the entries of an aligned block',
     f'skills/       9 lanes {EM} model-selectable, one per intent\n'
     f'agents/       review lenses {EM} read-only\n',
     'skills/       9 lanes: model-selectable, one per intent\n'
     'agents/       review lenses: read-only\n'),

    ('still pairs within one aligned entry',
     f'skills/       9 lanes {EM} model-selectable {EM} one per intent\n',
     'skills/       9 lanes (model-selectable) one per intent\n'),
]

fails = 0
for label, src, want in CASES:
    got = cp.fix_dashes(src)
    if got != want:
        fails += 1
        print(f'FAIL  {label}\n  in:   {src!r}\n  want: {want!r}\n  got:  {got!r}')

print(f'\n{len(CASES) - fails} passed, {fails} failed')
sys.exit(1 if fails else 0)
