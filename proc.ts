import * as lisp from "./lisp.ts"

export function pr<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
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
    return ok(result);
  }
  return err(`pr: ${initial_args}`);
}

export function add<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let state = 0;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Float) {
      state += args.fst.value;
      args = args.snd;
    } else {
      return err(`add: ${initial_args}`);
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Float(state);
    return ok(result);
  }
  return err(`add: ${initial_args}`);
}

export function mul<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let state = 1;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Float) {
      state *= args.fst.value;
      args = args.snd;
    } else {
      return err(`mul: ${initial_args}`);
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Float(state);
    return ok(result);
  }
  return err(`mul: ${initial_args}`);
}

export function vau<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (
    args instanceof lisp.Pair &&
    args.snd instanceof lisp.Pair &&
    args.snd.fst instanceof lisp.Variable
  ) {
    const head = args.fst;
    const body = args.snd.snd;
    const lexical = ctx;
    const dynamic = args.snd.fst;
    const result = new lisp.Vau(head, body, lexical, dynamic);
    return ok(result);
  }
  return err(`vau: ${args}`);
}

export function wrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Proc &&
    args.snd instanceof lisp.Nil
  ) {
    const result = new lisp.Wrap(args.fst);
    return ok(result);
  }
  return err(`wrap: ${args}`);
}

export function unwrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Wrap &&
    args.snd instanceof lisp.Nil
  ) {
    const result = args.fst.body;
    return ok(result);
  }
  return err(`unwrap: ${args}`);
}

export function if_<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (args instanceof lisp.Pair) {
    return args.fst.evaluate(ctx, (flag) => {
      if (
        flag instanceof lisp.Bool &&
        args.snd instanceof lisp.Pair
      ) {
        if (flag.value) {
          return args.snd.fst.evaluate(ctx, ok, err);
        }
        if (args.snd.snd instanceof lisp.Pair) {
          return args.snd.snd.fst.evaluate(ctx, ok, err);
        }
        const result = lisp.nil();
        return ok(result);
      }
      return err(`if: ${args}`);
    }, err);
  }
  return err(`if: ${args}`);
}

export function and<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let state = true;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Bool) {
      state = state && args.fst.value;
      args = args.snd;
    } else {
      return err(`and: ${initial_args}`);
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Bool(state);
    return ok(result);
  }
  return err(`and: ${initial_args}`);
}

export function or<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let state = false;
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Bool) {
      state = state || args.fst.value;
      args = args.snd;
    } else {
      return err(`and: ${initial_args}`);
    }
  }
  if (args instanceof lisp.Nil) {
    const result = new lisp.Bool(state);
    return ok(result);
  }
  return err(`and: ${initial_args}`);
}

export function not<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Bool &&
    args.snd instanceof lisp.Nil
  ) {
    const result = new lisp.Bool(!args.fst.value);
    return ok(result);
  }
  return err(`not: ${args}`);
}

export function list<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  // Should we even bother to check this?
  if (args.isList) {
    return ok(args);
  }
  return err(`list: ${args}`);
}

/**
export function seq<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let buffer: blk.Block<T>[] = [];
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Lift) {
      buffer.push(args.fst.body);
      args = args.snd;
    } else {
      return err(`seq: ${initial_args}`);
    }
  }
  let state = blk.id();
  if (args instanceof lisp.Nil) {
    for (let i = buffer.length - 1; i >= 0; --i) {
      state = buffer[i].seq(state);
    }
    const result = new lisp.Lift(state);
    return ok(result);
  }
  return err(`seq: ${initial_args}`);
}

export function alt<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let buffer: blk.Block<T>[] = [];
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Lift) {
      buffer.push(args.fst.body);
      args = args.snd;
    } else {
      return err(`alt: ${initial_args}`);
    }
  }
  let state = blk.abort();
  if (args instanceof lisp.Nil) {
    for (let i = buffer.length - 1; i >= 0; --i) {
      state = buffer[i].alt(state);
    }
    const result = new lisp.Lift(state);
    return ok(result);
  }
  return err(`alt: ${initial_args}`);
}

export function quote<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Lift &&
    args.snd instanceof lisp.Nil
  ) {
    const body = new blk.Quote(args.fst.body);
    const result = new lisp.Lift(body);
    return ok(result);
  }
  return err(`quote: ${args}`);
}

export function quote_seq<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let buffer: blk.Block<T>[] = [];
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Lift) {
      buffer.push(args.fst.body);
      args = args.snd;
    } else {
      return err(`quote_seq: ${initial_args}`);
    }
  }
  if (args instanceof lisp.Nil) {
    let state = blk.id();
    for (let i = buffer.length - 1; i >= 0; --i) {
      state = buffer[i].seq(state);
    }
    const body = new blk.Quote(state);
    const result = new lisp.Lift(body);
    return ok(result);
  }
  return err(`quote_seq: ${initial_args}`);
}

export function quote_alt<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  const initial_args = args;
  let buffer: blk.Block<T>[] = [];
  while (args instanceof lisp.Pair) {
    if (args.fst instanceof lisp.Lift) {
      buffer.push(args.fst.body);
      args = args.snd;
    } else {
      return err(`quote_alt: ${initial_args}`);
    }
  }
  if (args instanceof lisp.Nil) {
    let state = blk.abort();
    for (let i = buffer.length - 1; i >= 0; --i) {
      state = buffer[i].alt(state);
    }
    const body = new blk.Quote(state);
    const result = new lisp.Lift(body);
    return ok(result);
  }
  return err(`quote_alt: ${initial_args}`);
}

export function norm<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  ok: lisp.Ok<T>,
  err: lisp.Err,
): void {
  if (
    args instanceof lisp.Pair &&
    args.fst instanceof lisp.Lift &&
    args.snd instanceof lisp.Nil
  ) {
    try {
      const body = args.fst.body.normalize();
      const result = new lisp.Lift(body);
      return ok(result);
    } catch(error) {
      return err(`norm: ${args} ${error.message}`);
    }
  }
  return err(`norm: ${args}`);
}
**/
