import * as lisp from "./lisp.ts";
import { initial } from "./env.ts";

import {
  assert,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

Deno.test({
  name: "lisp-sanity-arithmetic",
  fn: () => {
    let ctx = initial();
    const iterations = 1024;
    const operators: any = [
      ["+", (a: number, b: number) => a + b],
      ["*", (a: number, b: number) => a * b],
    ];
    for (let [name, body] of operators) {
      for (let i = 0; i < iterations; ++i) {
        const fst = Math.random() * 100 - 50;
        const snd = Math.random() * 100 - 50;
        const code = `(${name} ${fst} ${snd})`;
        const xs = lisp.read(code);
        assert(xs.length === 1);
        xs[0].evaluate(ctx, (result) => {
          assert(result instanceof lisp.Num, `
Evaluated ${code} and expected a float, but got:\n${result}`);
          const actual = result.value;
          const expected = body(fst, snd);
          const epsilon = 0.001;
          const delta = Math.abs(expected-actual);
          assert(delta <= epsilon, `expected ${expected} but got ${actual}`);
          return result;
        });
      }
    }
  },
});
Deno.test({
  name: "lisp-sanity-bool",
  fn: () => {
    let ctx = initial();
    const lisp_f = lisp.read("#f")[0];
    const lisp_t = lisp.read("#t")[0];
    let truth_table: any = {
      "or": [
        [lisp_f, lisp_f, lisp_f],
        [lisp_f, lisp_t, lisp_t],
        [lisp_t, lisp_f, lisp_t],
        [lisp_t, lisp_t, lisp_t],
      ],
      "and": [
        [lisp_f, lisp_f, lisp_f],
        [lisp_f, lisp_t, lisp_f],
        [lisp_t, lisp_f, lisp_f],
        [lisp_t, lisp_t, lisp_t],
      ],
    };
    for (let key of Object.keys(truth_table)) {
      for (let row of truth_table[key]) {
        const code = `(${key} ${row[0]} ${row[1]})`;
        const body = lisp.read(code);
        assert(body.length === 1);
        body[0].evaluate(ctx, (result) => {
          assert(result instanceof lisp.Bool);
          assert(result.equals(row[2]));
          return result;
        });
      }
    }
  },
});
