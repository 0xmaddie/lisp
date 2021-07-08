import * as lisp from "./mod.ts";

function proc_if<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (args instanceof lisp.Pair) {
    return args.fst.evaluate(ctx, (flag) => {
      if (
        flag instanceof lisp.Bool &&
        args.snd instanceof lisp.Pair
      ) {
        if (flag.value) {
          return args.snd.fst.evaluate(ctx, rest);
        }
        if (args.snd.snd instanceof lisp.Pair) {
          return args.snd.snd.fst.evaluate(ctx, rest);
        }
        const result = lisp.nil();
        return rest(result);
      }
      throw `if: ${args}`;
    });
  }
  throw `if: ${args}`;
}

function proc_vau<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (
    args instanceof lisp.Pair &&
    args.snd instanceof lisp.Pair &&
    args.snd.fst instanceof lisp.Var
  ) {
    const head = args.fst;
    const body = args.snd.snd;
    const lexical = ctx;
    const dynamic = args.snd.fst;
    const result = new lisp.Vau(head, body, lexical, dynamic);
    return rest(result);
  }
  throw `vau: ${args}`;
}

function proc_and<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  const initial_args = args;
  let state = true;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Bool) {
      state = state && args.fst.value;
      args = args.snd;
    } else {
      throw `and: ${initial_args}`;
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Bool(state);
    return rest(result);
  }
  throw `and: ${initial_args}`;
}

function proc_or<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  const initial_args = args;
  let state = false;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Bool) {
      state = state || args.fst.value;
      args = args.snd;
    } else {
      throw `or: ${initial_args}`;
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Bool(state);
    return rest(result);
  }
  throw `or: ${initial_args}`;
}

function proc_not<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Bool &&
    args.snd instanceof lisp.Nil
  ) {
    const result = new lisp.Bool(!args.fst.value);
    return rest(result);
  }
  throw `not: ${args}`;
}

function proc_wrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (
    args instanceof lisp.Pair &&
    args.fst.canApply &&
    args.snd instanceof lisp.Nil
  ) {
    const result = new lisp.Wrap(args.fst);
    return rest(result);
  }
  throw `wrap: ${args}`;
}

function proc_unwrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Wrap &&
    args.snd instanceof lisp.Nil
  ) {
    const result = args.fst.body;
    return rest(result);
  }
  throw `unwrap: ${args}`;
}

function proc_reset<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  return rest(args.execute(ctx, (x) => x));
}

function proc_shift<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest_outer: lisp.Rest<T>,
): lisp.Lisp<T> {
  function closure(
    args: lisp.Lisp<T>,
    _ctx: lisp.Env<T>,
    rest_inner: lisp.Rest<T>,
  ): lisp.Lisp<T> {
    if (
      args instanceof lisp.Pair &&
      args.snd instanceof lisp.Nil
    ) {
      return rest_inner(rest_outer(args.fst));
    }
    throw `shift#<closure>: ${args}`;
  }
  if (
    args instanceof lisp.Pair &&
    args.fst.canApply &&
    args.snd instanceof lisp.Nil
  ) {
    const ks = new lisp.Wrap(
      new lisp.Proc("shift#<closure>", closure),
    );
    const xs = new lisp.Pair(ks, lisp.nil());
    return args.fst.apply(xs, ctx, (x) => x);
  }
  throw `shift: ${args}`;
}

function proc_list<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  // Should we even bother to check this?
  if (args.isList) {
    return rest(args);
  }
  throw `list: ${args}`;
}

function proc_add<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  const initial_args = args;
  let state = 0;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Num) {
      state += args.fst.value;
      args = args.snd;
    } else {
      throw `add: ${initial_args}`;
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Num(state);
    return rest(result);
  }
  throw `add: ${initial_args}`;
}

function proc_mul<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  const initial_args = args;
  let state = 1;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Num) {
      state *= args.fst.value;
      args = args.snd;
    } else {
      throw `mul: ${initial_args}`;
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Num(state);
    return rest(result);
  }
  throw `mul: ${initial_args}`;
}

function proc_pr<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  const initial_args = args;
  let buffer = [];
  while (args instanceof lisp.Pair) {
    buffer.push(`${args.fst}`);
    args = args.snd;
  }
  if (args instanceof lisp.Nil) {
    const data = buffer.join(" ");
    console.log(data);
    const result = lisp.nil();
    return rest(result);
  }
  throw `pr: ${initial_args}`;
}

export default function initial<T>(): lisp.Env<T> {
  let env = new lisp.Env();

  function defvau(name: string, body: lisp.Fproc<T>): void {
    const value = new lisp.Proc(name, body);
    env.define(name, value);
  }

  function defwrap(name: string, body: lisp.Fproc<T>): void {
    const value = new lisp.Wrap(new lisp.Proc(name, body));
    env.define(name, value);
  }

  defvau("if", proc_if);
  defvau("vau", proc_vau);
  defwrap("and", proc_and);
  defwrap("or", proc_or);
  defwrap("not", proc_not);
  defwrap("wrap", proc_wrap);
  defwrap("unwrap", proc_unwrap);
  defwrap("reset", proc_reset);
  defwrap("shift", proc_shift);
  defwrap("list", proc_list);
  defwrap("+", proc_add);
  defwrap("*", proc_mul);
  defwrap("pr", proc_pr);

  return env;
}
