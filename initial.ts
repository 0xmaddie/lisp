import * as lisp from "./mod.ts";

function mk_type<T>(
  check: (value: lisp.Lisp<T>) => boolean,
): lisp.Fproc<T> {
  return (
    args: lisp.Lisp<T>,
    ctx: lisp.Env<T>,
    rest: lisp.Rest<T>,
  ): lisp.Lisp<T> => {
    while (args instanceof lisp.Pair) {
      if (!check(args.fst)) {
        return rest(lisp.f());
      }
      args = args.snd;
    }
    if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
    return rest(lisp.t());
  }
}

function proc_is_equal<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  let state;
  while (args instanceof lisp.Pair) {
    if (state === undefined) {
      state = args.fst;
    } else {
      if (!(args.fst.equal(state))) {
        return rest(lisp.f());
      }
      args = args.snd;
    }
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  return rest(lisp.t());
}

function proc_if<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  return args.fst.evaluate(ctx, (flag) => {
    if (!(args.snd instanceof lisp.Pair)) { throw args; }
    if (!(flag instanceof lisp.Bool)) { throw args; }
    if (flag.value) {
      return args.snd.fst.evaluate(ctx, rest);
    }
    if (args.snd.snd instanceof lisp.Pair) {
      return args.snd.snd.fst.evaluate(ctx, rest);
    }
    return rest(lisp.nil());
  });
}

function proc_vau<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.snd instanceof lisp.Pair)) { throw args; }
  if (!(args.snd.fst instanceof lisp.Sym)) { throw args; }
  const head = args.fst;
  const body = args.snd.snd;
  const lexical = ctx;
  const dynamic = args.snd.fst;
  const result = new lisp.Vau(head, body, lexical, dynamic);
  return rest(result);
}

function proc_and<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Bool)) { throw arguments[0]; }
    if (!args.fst.value) {
      return rest(lisp.f());
    }
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  return rest(lisp.t());
}

function proc_or<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Bool)) { throw arguments[0]; }
    if (args.fst.value) {
      return rest(lisp.t());
    }
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  return rest(lisp.f());
}

function proc_not<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.fst instanceof lisp.Bool)) { throw args; }
  if (!(args.snd instanceof lisp.Nil)) { throw args; }
  const result = new lisp.Bool(!args.fst.value);
  return rest(result);
}

function proc_wrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!args.fst.canApply) { throw args; }
  if (!(args.snd instanceof lisp.Nil)) { throw args; }
  const result = new lisp.Wrap(args.fst);
  return rest(result);
}

function proc_unwrap<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.fst instanceof lisp.Wrap)) { throw args; }
  if (!(args.snd instanceof lisp.Nil)) { throw args; }
  const result = args.fst.body;
  return rest(result);
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
    if (!(args instanceof lisp.Pair)) { throw args; }
    if (!(args.snd instanceof lisp.Nil)) { throw args; }
    return rest_inner(rest_outer(args.fst));
  }
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!args.fst.canApply) { throw args; }
  if (!(args.snd instanceof lisp.Nil)) { throw args; }
  const ks = new lisp.Wrap(
    new lisp.Proc("shift#<closure>", closure),
  );
  const xs = new lisp.Pair(ks, lisp.nil());
  return args.fst.apply(xs, ctx, (x) => x);
}

function proc_eval<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.snd instanceof lisp.Pair)) { throw args; }
  if (!(args.snd.fst instanceof lisp.Env)) { throw args; }
  if (!(args.snd.snd instanceof lisp.Nil)) { throw args; }
  return args.fst.evaluate(args.snd.fst, rest);
}

function proc_apply<T>(
  args: lisp.Lisp<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!args.fst.canApply) { throw args; }
  return args.fst.apply(args.snd, ctx, rest);
}

function proc_list<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  // Should we even bother to check this?
  if (!(args.isList)) { throw args; }
  return rest(args);
}

function proc_list_star<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  let buffer = [];
  while (args instanceof lisp.Pair) {
    buffer.push(args.fst);
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  if (buffer.length === 0) {
    return rest(lisp.nil());
  }
  let state = buffer[buffer.length-1];
  for (let i = buffer.length-2; i >= 0; --i) {
    state = new lisp.Pair(buffer[i], state);
  }
  return rest(state);
}

function proc_pair<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.snd instanceof lisp.Pair)) { throw args; }
  if (!(args.snd.snd instanceof lisp.Nil)) { throw args; }
  return rest(new lisp.Pair(args.fst, args.snd.fst));
}

function proc_fst<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.fst instanceof lisp.Pair)) { throw args; }
  if (!(args.snd instanceof lisp.Nil)) { throw args; }
  return rest(args.fst.fst);
}

function proc_snd<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  if (!(args instanceof lisp.Pair)) { throw args; }
  if (!(args.fst instanceof lisp.Pair)) { throw args; }
  if (!(args.snd instanceof lisp.Nil)) { throw args; }
  return rest(args.fst.snd);
}

function proc_add<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  let state = 0;
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Num)) { throw arguments[0]; }
    state += args.fst.value;
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  const result = new lisp.Num(state);
  return rest(result);
}

function proc_mul<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  let state = 1;
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Num)) { throw arguments[0]; }    
    state *= args.fst.value;
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  const result = new lisp.Num(state);
  return rest(result);
}

function proc_pr<T>(
  args: lisp.Lisp<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Lisp<T> {
  let buffer = [];
  while (args instanceof lisp.Pair) {
    buffer.push(`${args.fst}`);
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) { throw arguments[0]; }
  const data = buffer.join(" ");
  console.log(data);
  return rest(lisp.nil());
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

  const proc_is_bool = mk_type((x) => x instanceof lisp.Bool);
  const proc_is_sym = mk_type((x) => x instanceof lisp.Sym);
  const proc_is_num = mk_type((x) => x instanceof lisp.Num);
  const proc_is_str = mk_type((x) => x instanceof lisp.Str);
  const proc_is_nil = mk_type((x) => x instanceof lisp.Nil);
  const proc_is_pair = mk_type((x) => x instanceof lisp.Pair);
  const proc_is_list = mk_type((x) => x.isList);
  const proc_is_env = mk_type((x) => x instanceof lisp.Env);
  const proc_is_vau = mk_type((x) => x instanceof lisp.Vau);
  const proc_is_wrap = mk_type((x) => x instanceof lisp.Wrap);
  const proc_is_proc = mk_type((x) => {
    return (
      x instanceof lisp.Vau ||
        x instanceof lisp.Wrap ||
        x instanceof lisp.Proc
    );
  });

  // Pairs and Lists
  defwrap("list?", proc_is_list);
  defwrap("nil?", proc_is_nil);
  defwrap("pair?", proc_is_pair);
  defwrap("list", proc_list);
  defwrap("list*", proc_list_star);
  defwrap("pair", proc_pair);
  defwrap("fst", proc_fst);
  defwrap("snd", proc_snd);

  // Procedures
  defwrap("procedure?", proc_is_proc);
  defwrap("operative?", proc_is_vau);
  defwrap("applicative?", proc_is_wrap);
  defvau("vau", proc_vau);
  defwrap("wrap", proc_wrap);
  defwrap("unwrap", proc_unwrap);
  defwrap("apply", proc_apply);

  // Environments
  defwrap("environment?", proc_is_env);
  defvau("eval", proc_eval);

  // Symbols
  defwrap("symbol?", proc_is_sym);

  // Booleans
  defwrap("boolean?", proc_is_bool);
  defwrap("and", proc_and);
  defwrap("or", proc_or);
  defwrap("not", proc_not);

  // Numbers
  defwrap("number?", proc_is_num);
  defwrap("+", proc_add);
  defwrap("*", proc_mul);

  // Strings
  defwrap("string?", proc_is_str);
  
  // Control
  defvau("if", proc_if);
  defwrap("reset", proc_reset);
  defwrap("shift", proc_shift);

  // Equivalence
  defwrap("equal?", proc_is_equal);

  // Input/Output
  defwrap("pr", proc_pr);

  return env;
}
