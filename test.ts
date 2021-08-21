import * as lisp from "./mod.ts";

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

Deno.test({
  name: "arithmetic sanity",
  fn: () => {
    let ctx = lisp.initial();
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
        xs[0].evaluate(ctx, async (result) => {
          assert(
            result instanceof lisp.Num,
            `
Evaluated ${code} and expected a float, but got:\n${result}`,
          );
          const actual = result.value;
          const expected = body(fst, snd);
          const epsilon = 0.001;
          const delta = Math.abs(expected - actual);
          assert(delta <= epsilon, `expected ${expected} but got ${actual}`);
          return result;
        });
      }
    }
  },
});

Deno.test({
  name: "boolean sanity",
  fn: () => {
    let ctx = lisp.initial();
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
        body[0].evaluate(ctx, async (result) => {
          assert(result instanceof lisp.Bool);
          assert(result.equal(row[2]));
          return result;
        });
      }
    }
  },
});

Deno.test({
  name: "basic equality checks",
  async fn(): Promise<void> {
    let ctx = lisp.initial();
    const pairs = [
      ["(append (list 1 2) (list 3 4))", "(list 1 2 3 4)"],
      ["(+ 1 2 3 4)", "10"],
      ["(* 1 2 3 4)", "24"],
      ["(or #f #f)", "#f"],
      ["(or #f #t)", "#t"],
      ["(and #f #f)", "#f"],
      ["(and #f #t)", "#f"],
      ["(and #t #t)", "#t"],
      ["(or #f #f #f #f #f #f #t #f)", "#t"],
      ["(or #f #f #f #f #f #f #f #f)", "#f"],
      ["(and #f #f #f #f #t #f #f #f)", "#f"],
      ["(and #t #t #t #t #t #t #t #t)", "#t"],
      ["(map (fn (x) (* x x)) (list 1 2 3 4))", "(list 1 4 9 16)"],
      ["(map (fn (x y) (* x y)) (list 2 4 6) (list 3 5 7))", "(list 6 20 42)"],
      ["(* 2 (reset (+ 1 (shift (wrap (macro (k) e (k 5)))))))", "12"],
      ["(* 2 (reset (+ 1 (shift (fn (k) (k 5))))))", "12"],
      ["((macro (x) _ x) (1 . 2))", "(pair 1 2)"],
    ];
    for (const [source, target] of pairs) {
      const actual = await lisp.evaluate(source, ctx);
      const expected = await lisp.evaluate(target, ctx);
      assert(
        actual.equal(expected),
        `expected ${source} => ${expected} but got ${source} => ${actual}`,
      );
    }
  },
});
