import * as lisp from "./mod.ts";

function* reverse<T>(xs: T[]): Iterable<T> {
  for (let i = xs.length - 1; i >= 0; --i) {
    yield xs[i];
  }
}

function mk_type<T>(
  check: (value: lisp.Object<T>) => boolean,
): lisp.Fproc<T> {
  return (
    args: lisp.Object<T>,
    ctx: lisp.Env<T>,
    rest: lisp.Rest<T>,
  ): lisp.Object<T> => {
    while (args instanceof lisp.Pair) {
      if (!check(args.fst)) {
        return rest(lisp.f());
      }
      args = args.snd;
    }
    if (!(args instanceof lisp.Nil)) throw arguments[0];
    return rest(lisp.t());
  };
}

function proc_is_equal<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
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
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  return rest(lisp.t());
}

function proc_if<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  return args.fst.evaluate(ctx, (flag) => {
    if (!(args.snd instanceof lisp.Pair)) throw args;
    if (!(flag instanceof lisp.Bool)) throw args;
    if (flag.value) {
      return args.snd.fst.evaluate(ctx, rest);
    }
    if (args.snd.snd instanceof lisp.Pair) {
      return args.snd.snd.fst.evaluate(ctx, rest);
    }
    return rest(lisp.nil());
  });
}

function proc_macro<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.snd instanceof lisp.Pair)) throw args;
  if (!(args.snd.fst instanceof lisp.Sym)) throw args;
  const head = args.fst;
  const body = args.snd.snd;
  const lexical = ctx;
  const dynamic = args.snd.fst;
  const result = new lisp.Macro(head, body, lexical, dynamic);
  return rest(result);
}

function proc_fn<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  const head = args.fst;
  const body = args.snd;
  const dynamic = new lisp.Sym("_");
  const lexical = ctx;
  const result = new lisp.Fn(
    new lisp.Macro(head, body, lexical, dynamic),
  );
  return rest(result);
}

function proc_and<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Bool)) throw arguments[0];
    if (!args.fst.value) {
      return rest(lisp.f());
    }
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  return rest(lisp.t());
}

function proc_or<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Bool)) throw arguments[0];
    if (args.fst.value) {
      return rest(lisp.t());
    }
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  return rest(lisp.f());
}

function proc_not<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.fst instanceof lisp.Bool)) throw args;
  if (!(args.snd instanceof lisp.Nil)) throw args;
  const result = new lisp.Bool(!args.fst.value);
  return rest(result);
}

function proc_wrap<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!args.fst.canApply) throw args;
  if (!(args.snd instanceof lisp.Nil)) throw args;
  const result = new lisp.Fn(args.fst);
  return rest(result);
}

function proc_unwrap<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.fst instanceof lisp.Fn)) throw args;
  if (!(args.snd instanceof lisp.Nil)) throw args;
  const result = args.fst.body;
  return rest(result);
}

function proc_reset<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  return rest(args.execute(ctx, (x) => x));
}

function proc_shift<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest_outer: lisp.Rest<T>,
): lisp.Object<T> {
  function closure(
    args: lisp.Object<T>,
    _ctx: lisp.Env<T>,
    rest_inner: lisp.Rest<T>,
  ): lisp.Object<T> {
    if (!(args instanceof lisp.Pair)) throw args;
    if (!(args.snd instanceof lisp.Nil)) throw args;
    return rest_inner(rest_outer(args.fst));
  }
  if (!(args instanceof lisp.Pair)) throw args;
  if (!args.fst.canApply) throw args;
  if (!(args.snd instanceof lisp.Nil)) throw args;
  const ks = new lisp.Fn(
    new lisp.Proc("shift#<closure>", closure),
  );
  const xs = new lisp.Pair(ks, lisp.nil());
  return args.fst.apply(xs, ctx, (x) => x);
}

function proc_eval<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.snd instanceof lisp.Pair)) throw args;
  if (!(args.snd.fst instanceof lisp.Env)) throw args;
  if (!(args.snd.snd instanceof lisp.Nil)) throw args;
  return args.fst.evaluate(args.snd.fst, rest);
}

function proc_def<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.fst instanceof lisp.Sym)) throw args;
  if (!(args.snd instanceof lisp.Pair)) throw args;
  if (!(args.snd.snd instanceof lisp.Nil)) throw args;
  return args.snd.fst.evaluate(ctx, (rhs) => {
    args.fst.bind(rhs, ctx);
    return rest(lisp.nil());
  });
}

function proc_let_star<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.fst instanceof lisp.Pair)) throw args;
  let bindings = args.fst.toArray();
  for (const binding of bindings) {
    if (!(binding instanceof lisp.Pair)) throw args;
    const lhs = binding.fst;
    const rhs = binding.snd.evaluate(ctx, (x) => x);
    lhs.bind(rhs, ctx);
  }
  return args.snd.evaluate(ctx, rest);
}

function proc_apply<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!args.fst.canApply) throw args;
  return args.fst.apply(args.snd, ctx, rest);
}

function proc_list<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  // Should we even bother to check this?
  if (!(args.isList)) throw args;
  return rest(args);
}

function proc_list_star<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  let buffer = [];
  while (args instanceof lisp.Pair) {
    buffer.push(args.fst);
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  if (buffer.length === 0) {
    return rest(lisp.nil());
  }
  let state = buffer[buffer.length - 1];
  for (let i = buffer.length - 2; i >= 0; --i) {
    state = new lisp.Pair(buffer[i], state);
  }
  return rest(state);
}

function proc_pair<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.snd instanceof lisp.Pair)) throw args;
  if (!(args.snd.snd instanceof lisp.Nil)) throw args;
  return rest(new lisp.Pair(args.fst, args.snd.fst));
}

function proc_fst<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.fst instanceof lisp.Pair)) throw args;
  if (!(args.snd instanceof lisp.Nil)) throw args;
  return rest(args.fst.fst);
}

function proc_snd<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (!(args.fst instanceof lisp.Pair)) throw args;
  if (!(args.snd instanceof lisp.Nil)) throw args;
  return rest(args.fst.snd);
}

function proc_len<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Pair)) throw args;
  if (
    !args.fst.isList &&
    !(args.fst instanceof lisp.Str)
  ) {
    throw args;
  }
  if (!(args.snd instanceof lisp.Nil)) throw args;
  return rest(new lisp.Num(args.fst.len));
}

function proc_append<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!args.isList) throw args;
  let state = lisp.nil();
  for (const item of reverse(args.toArray())) {
    state = item.append(state);
  }
  return rest(state);
}

function proc_add<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  let state = 0;
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Num)) throw arguments[0];
    state += args.fst.value;
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  const result = new lisp.Num(state);
  return rest(result);
}

function proc_mul<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  let state = 1;
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Num)) throw arguments[0];
    state *= args.fst.value;
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  const result = new lisp.Num(state);
  return rest(result);
}

function proc_neg<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  let state = undefined;
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Num)) throw arguments[0];
    if (state === undefined) {
      state = args.fst.value;
    } else {
      state -= args.fst.value;
    }
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil) || state === undefined) throw arguments[0];
  const result = new lisp.Num(state);
  return rest(result);
}

function proc_inv<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  let state = undefined;
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Num)) throw arguments[0];
    if (state === undefined) {
      state = args.fst.value;
    } else {
      state /= args.fst.value;
    }
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil) || state === undefined) throw arguments[0];
  const result = new lisp.Num(state);
  return rest(result);
}

function proc_print<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  let buffer = [];
  while (args instanceof lisp.Pair) {
    buffer.push(`${args.fst}`);
    args = args.snd;
  }
  if (!(args instanceof lisp.Nil)) throw arguments[0];
  const data = buffer.join(" ");
  console.log(data);
  return rest(lisp.nil());
}

function proc_empty_env<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Nil)) throw args;
  return rest(new lisp.Env());
}

function proc_initial_env<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  if (!(args instanceof lisp.Nil)) throw args;
  return rest(initial());
}

function proc_assert<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  while (args instanceof lisp.Pair) {
    if (!(args.fst instanceof lisp.Bool)) throw arguments[0];
    if (!(args.fst.value)) throw arguments[0];
    args = args.snd;
  }
  return rest(lisp.nil());
}

function proc_do<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): lisp.Object<T> {
  return args.execute(ctx, rest);
}

export default function initial<T>(): lisp.Env<T> {
  let env = new lisp.Env();

  function macro(name: string, body: lisp.Fproc<T>): void {
    const value = new lisp.Proc(name, body);
    env.define(name, value);
  }

  function fn(name: string, body: lisp.Fproc<T>): void {
    const value = new lisp.Fn(new lisp.Proc(name, body));
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
  const proc_is_macro = mk_type((x) => {
    return x instanceof lisp.Macro || x instanceof lisp.Proc;
  });
  const proc_is_fn = mk_type((x) => x instanceof lisp.Fn);
  const proc_is_proc = mk_type((x) => {
    return (
      x instanceof lisp.Macro ||
      x instanceof lisp.Fn ||
      x instanceof lisp.Proc
    );
  });

  // Pairs and Lists
  fn("list?", proc_is_list);
  fn("nil?", proc_is_nil);
  fn("pair?", proc_is_pair);
  fn("list", proc_list);
  fn("list*", proc_list_star);
  fn("pair", proc_pair);
  fn("fst", proc_fst);
  fn("snd", proc_snd);
  fn("len", proc_len);
  fn("append", proc_append);
  //fn("map", proc_map);
  //fn("filter", proc_filter);
  //fn("reduce", proc_reduce);

  // Procedures
  macro("macro", proc_macro);
  macro("fn", proc_fn);
  fn("proc?", proc_is_proc);
  fn("macro?", proc_is_macro);
  fn("fn?", proc_is_fn);
  fn("wrap", proc_wrap);
  fn("unwrap", proc_unwrap);
  fn("apply", proc_apply);

  // Env
  macro("eval", proc_eval);
  macro("def", proc_def);
  macro("let", proc_let_star);
  fn("env?", proc_is_env);
  fn("empty-env", proc_empty_env);
  fn("initial-env", proc_initial_env);

  // Booleans
  fn("bool?", proc_is_bool);
  fn("and", proc_and);
  fn("or", proc_or);
  fn("not", proc_not);

  // Numbers
  fn("num?", proc_is_num);
  fn("+", proc_add);
  fn("*", proc_mul);
  fn("-", proc_neg);
  fn("/", proc_inv);
  //fn("min", proc_min);
  //fn("max", proc_max);
  //fn("abs", proc_abs);
  //fn(">", proc_gt);
  //fn(">=", proc_gteq);
  //fn("<", proc_lt);
  //fn("<=", proc_lteq);
  //fn("exp", proc_exp);
  //fn("log", proc_log);
  //fn("sin", proc_sin);
  //fn("cos", proc_cos);
  //fn("tan", proc_tan);
  //fn("sinh", proc_sinh);
  //fn("cosh", proc_cosh);
  //fn("tanh", proc_tanh);

  // Symbols
  fn("sym?", proc_is_sym);
  //fn("sym->str", proc_sym2str);

  // Strings
  fn("str?", proc_is_str);
  //fn("str->sym", proc_str2sym);

  // Control
  //macro("case", proc_case);
  macro("if", proc_if);
  macro("do", proc_do);
  fn("reset", proc_reset);
  fn("shift", proc_shift);

  // Equivalence
  fn("=", proc_is_equal);

  // Input/Output
  fn("print!", proc_print);
  fn("assert!", proc_assert);

  return env;
}
