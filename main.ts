import { assert } from "https://deno.land/std@0.97.0/testing/asserts.ts";

import * as lisp from "./mod.ts";

assert(Deno.args.length === 1, `usage: lisp [filename]`);
const source_filename = Deno.args[0];
const source_contents = await Deno.readTextFile(source_filename);
const source_objects = lisp.read(source_contents);
let ctx = lisp.initial();
source_objects.forEach(async (obj) => {
  const result = await obj.evaluate(ctx, (res) => Promise.resolve(res));
});
