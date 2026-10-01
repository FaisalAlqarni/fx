'use strict';
// The lanes a person must type, never a model auto-selection. The one copy the
// opencode plugins hide from the model; tests/gates/user-invoked.test.js pins
// it to the skills' `disable-model-invocation: true` frontmatter. No
// dependencies, so a plugin can load it before anything else can fail.
module.exports = { USER_INVOKED_LANES: ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'] };
