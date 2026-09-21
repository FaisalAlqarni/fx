'use strict';
// The single generator of fx's opencode commands: one per user-invoked lane.
//
// `plugins/fx.js` registers these in the `config` hook's `config.command`, so
// the plugin-only route can type a hidden lane. `scripts/fx-opencode-install`
// calls this same module to write `commands/<name>.md`, instead of keeping
// its own conversion: the two routes can never register different text.
//
// Sources, as the installer has always read them:
//   - every `commands/*.md`, body verbatim apart from opencode's names;
//   - every skill marked `disable-model-invocation: true` that has no source
//     command of its own (today, `fx-audit`). Its `../../references/...` and
//     `../../agents/...` citations become absolute paths under `destAbs`,
//     because a command has no skill directory to resolve them against.
//
// Every command ends with `Arguments, if any: $ARGUMENTS`: both runtimes read
// the body as the full prompt.

const fs = require('fs');
const path = require('path');
const { splitFrontmatter, field } = require('./agent-dialects.js');

// Claude Code addresses plugin parts as `fx:fx-<name>`; opencode registers
// the same commands and agents as `fx-<name>`.
const PLUGIN_PREFIX_RE = /\bfx:(?=fx-)/g;
// A citation into references/ or agents/, or the bare prefix illustrating
// the convention.
const SKILL_PATH_RE = /`(\.\.\/\.\.\/(?:references|agents)\/[^`]+|\.\.\/\.\.\/)`/g;
// The skill's sentence saying its `../../` paths resolve from the base
// directory a skill is given. A command is given none, so it is replaced
// whole, before the paths inside it are rewritten.
const BASE_DIR_SENTENCE_RE = /Every path below that starts `\.\.\/\.\.\/`[^.]*\./g;

function command(desc, body) {
  const strip = (s) => s.replace(PLUGIN_PREFIX_RE, '');
  return {
    description: strip(desc),
    template: strip(body).replace(/^\n+|\n+$/g, '') + '\n\nArguments, if any: $ARGUMENTS',
  };
}

function frontmatter(text) {
  try { return splitFrontmatter(text); } catch { return null; }
}

/**
 * `{ name: { description, template } }`, usable directly as opencode's
 * `config.command`. `destAbs` is the absolute directory that holds fx's
 * `references/` and `agents/` for the caller: the install destination, or
 * the checkout the plugin was loaded from. Throws when a rewritten citation
 * names no file in fx's own tree.
 */
function opencodeCommands(root, destAbs) {
  const out = {};
  const commandsDir = path.join(root, 'commands');
  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md')).sort()) {
    const parsed = frontmatter(fs.readFileSync(path.join(commandsDir, file), 'utf8'));
    if (!parsed) continue;
    const name = file.slice(0, -3);
    out[name] = command(field(parsed.fm, 'description') || name, parsed.body);
  }

  const skillsDir = path.join(root, 'skills');
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const skillMd = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const parsed = frontmatter(fs.readFileSync(skillMd, 'utf8'));
    if (!parsed || (field(parsed.fm, 'disable-model-invocation') || '') !== 'true') continue;
    // Generated FROM commands/<name>.md, which the loop above already took.
    if (fs.existsSync(path.join(commandsDir, `${name}.md`))) continue;

    const missing = [];
    const body = parsed.body
      .replace(BASE_DIR_SENTENCE_RE, () => `Every path below that starts \`${destAbs}\` is an absolute path into `
        + "the fx install, never into the user's repository.")
      .replace(SKILL_PATH_RE, (_, rel) => {
        const tail = rel.slice('../../'.length);
        // Checked against fx's own tree, never the destination, which a
        // dry run never populates.
        const source = path.resolve(skillsDir, name, rel);
        if (!fs.existsSync(source)) missing.push(source);
        return tail ? `\`${destAbs}/${tail}\`` : `\`${destAbs}\``;
      });
    if (missing.length) throw new Error(`rewritten path does not exist: ${missing.join(', ')}`);
    out[name] = command(field(parsed.fm, 'description') || name, body);
  }
  return out;
}

module.exports = { opencodeCommands };
