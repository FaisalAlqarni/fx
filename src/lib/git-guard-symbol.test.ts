// The hooks and plugins turn a throw from inspect into a deny, so an input
// that cannot be read as a string must throw, as the JavaScript guard did.
import * as assert from 'assert';
import { inspect } from './git-guard.js';

assert.throws(() => inspect(Symbol('git push -f')), TypeError);
console.log('git-guard-symbol: passed');
