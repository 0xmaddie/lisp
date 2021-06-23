import * as lisp from "./lisp.ts"

export function pr<T>(
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

export function add<T>(
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

export function mul<T>(
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

export function vau<T>(
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

export function wrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Proc &&
    args.snd instanceof lisp.Nil
  ) {
    const result = new lisp.Wrap(args.fst);
    return rest(result);
  }
  throw `wrap: ${args}`;
}

export function unwrap<T>(
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

export function if_<T>(
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

export function and<T>(
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

export function or<T>(
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
      throw `and: ${initial_args}`;
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Bool(state);
    return rest(result);
  }
  throw `and: ${initial_args}`;
}

export function not<T>(
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

export function list<T>(
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
