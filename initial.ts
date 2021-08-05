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
  ): Promise<lisp.Object<T>> => {
    while (args.isNotEmpty) {
      if (!check(args.fst)) {
        return rest(lisp.f());
      }
      args = args.snd;
    }
    return rest(lisp.t());
  };
}

function proc_is_equal<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  let state;
  while (args.isNotEmpty) {
    if (state === undefined) {
      state = args.fst;
    } else if (!(args.fst.equal(state))) {
      return rest(lisp.f());
    }
    args = args.snd;
  }
  return rest(lisp.t());
}

function proc_if<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return args.fst.evaluate(ctx, (flag) => {
    if (flag.asBool) {
      return args.snd.fst.evaluate(ctx, rest);
    }
    if (args.snd.snd.isNotEmpty) {
      return args.snd.snd.fst.evaluate(ctx, rest);
    }
    return rest(lisp.nil());
  });
}

async function proc_case<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  while (args.isNotEmpty) {
    const flag = await args.fst.evaluate(ctx, (x) => Promise.resolve(x));
    if (flag.asBool) {
      return args.snd.fst.evaluate(ctx, rest);
    }
    args = args.snd.snd;
  }
  return rest(lisp.nil());
}

function proc_macro<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const head = args.fst;
  const body = args.snd.snd;
  const lexical = ctx;
  const dynamic = args.snd.fst;
  const result = new lisp.Macro(head, body, lexical, dynamic);
  return rest(result);
}

async function proc_fn<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const head = args.fst;
  const body = args.snd;
  const dynamic = lisp.ignore<T>();
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
): Promise<lisp.Object<T>> {
  while (args.isNotEmpty) {
    if (!args.fst.asBool) {
      return rest(args.fst);
    }
    args = args.snd;
  }
  return rest(lisp.t());
}

function proc_or<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  while (args.isNotEmpty) {
    if (args.fst.asBool) {
      return rest(args.fst);
    }
    args = args.snd;
  }
  return rest(lisp.f());
}

function proc_not<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = new lisp.Bool<T>(!args.fst.asBool);
  return rest(result);
}

function proc_wrap<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = new lisp.Fn(args.fst);
  return rest(result);
}

function proc_unwrap<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  if (!(args.fst instanceof lisp.Fn)) throw args;
  const result = args.fst.body;
  return rest(result);
}

async function proc_reset<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = await args.execute(ctx, (x) => Promise.resolve(x));
  return rest(result);
}

function proc_shift<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest_outer: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const body = new lisp.Proc("shift#<closure>", async (
    args: lisp.Object<T>,
    _ctx: lisp.Env<T>,
    rest_inner: lisp.Rest<T>,
  ): Promise<lisp.Object<T>> => {
    const result_outer = await rest_outer(args.fst);
    return rest_inner(result_outer);
  });
  const ks = new lisp.Fn(body);
  const xs = new lisp.Pair(ks, lisp.nil());
  return args.fst.apply(xs, ctx, (x) => Promise.resolve(x));
}

function proc_eval<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  if (!(args.snd.fst instanceof lisp.Env)) throw args;
  return args.fst.evaluate(args.snd.fst, rest);
}

function proc_def<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return args.snd.fst.evaluate(ctx, (rhs) => {
    args.fst.bind(rhs, ctx);
    return rest(lisp.nil());
  });
}

async function proc_let_star<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  let local = new lisp.Env(ctx);
  let bindings = args.fst;
  while (bindings.isNotEmpty) {
    const lhs = bindings.fst;
    const rhs = await bindings.snd.fst.evaluate(local, (x) => Promise.resolve(x));
    lhs.bind(rhs, local);
    bindings = bindings.snd.snd;
  }
  return args.snd.execute(local, rest);
}

function proc_apply<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return args.fst.apply(args.snd, ctx, rest);
}

function proc_list<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return rest(args);
}

function proc_list_star<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  if (args.isEmpty) {
    return rest(lisp.nil());
  }
  let items = args.toArray();
  let state = items.pop()!;
  for (const child of reverse(items)) {
    state = new lisp.Pair(child, state);
  }
  return rest(state);
}

function proc_pair<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = new lisp.Pair(args.fst, args.snd.fst);
  return rest(result);
}

function proc_fst<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return rest(args.fst.fst);
}

function proc_snd<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return rest(args.fst.snd);
}

function proc_len<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = new lisp.Num<T>(args.fst.len);
  return rest(result);
}

function proc_append<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  let items = args.toArray();
  let state = lisp.nil<T>();
  for (const item of reverse(items)) {
    state = item.append(state);
  }
  return rest(state);
}

async function proc_map<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = await args.snd.fst.map(args.fst, ctx);
  return rest(result);
}

function proc_add<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  let state = 0;
  while (args.isNotEmpty) {
    state += args.fst.asNum;
    args = args.snd;
  }
  const result = new lisp.Num<T>(state);
  return rest(result);
}

function proc_mul<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  let state = 1;
  while (args.isNotEmpty) {
    state *= args.fst.asNum;
    args = args.snd;
  }
  const result = new lisp.Num<T>(state);
  return rest(result);
}

function proc_neg<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  if (args.isEmpty) throw args;
  let state = args.fst.asNum;
  args = args.snd;
  while (args.isNotEmpty) {
    state -= args.fst.asNum;
    args = args.snd;
  }
  const result = new lisp.Num<T>(state);
  return rest(result);
}

function proc_inv<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  if (args.isEmpty) throw args;
  let state = args.fst.asNum;
  args = args.snd;
  while (args.isNotEmpty) {
    state /= args.fst.asNum;
    args = args.snd;
  }
  const result = new lisp.Num<T>(state);
  return rest(result);
}

function proc_print<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  let buffer = [];
  while (args.isNotEmpty) {
    buffer.push(`${args.fst}`);
    args = args.snd;
  }
  const data = buffer.join(" ");
  console.log(data);
  return rest(lisp.nil());
}

function proc_empty_env<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = new lisp.Env<T>();
  return rest(result);
}

function proc_initial_env<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = initial<T>();
  return rest(result);
}

function proc_assert<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  while (args.isNotEmpty) {
    if (!args.fst.asBool) throw arguments[0];
    args = args.snd;
  }
  return rest(lisp.nil());
}

function proc_do<T>(
  args: lisp.Object<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  return args.execute(ctx, rest);
}

function proc_to_str<T>(
  args: lisp.Object<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Object<T>> {
  const result = new lisp.Str<T>(`${args.fst}`);
  return rest(result);
}

export default function initial<T>(): lisp.Env<T> {
  let env = new lisp.Env<T>();

  const proc_is_bool = mk_type<T>((x) => x instanceof lisp.Bool);
  const proc_is_sym = mk_type<T>((x) => x instanceof lisp.Sym);
  const proc_is_num = mk_type<T>((x) => x instanceof lisp.Num);
  const proc_is_str = mk_type<T>((x) => x instanceof lisp.Str);
  const proc_is_nil = mk_type<T>((x) => x instanceof lisp.Nil);
  const proc_is_pair = mk_type<T>((x) => x instanceof lisp.Pair);
  const proc_is_list = mk_type<T>((x) => x.isList);
  const proc_is_env = mk_type<T>((x) => x instanceof lisp.Env);
  const proc_is_macro = mk_type<T>((x) => {
    return x instanceof lisp.Macro || x instanceof lisp.Proc;
  });
  const proc_is_fn = mk_type<T>((x) => x instanceof lisp.Fn);
  const proc_is_proc = mk_type<T>((x) => {
    return (
      x instanceof lisp.Macro ||
      x instanceof lisp.Fn ||
      x instanceof lisp.Proc
    );
  });

  // Pairs and Lists
  env.defn("list?", proc_is_list);
  env.defn("nil?", proc_is_nil);
  env.defn("pair?", proc_is_pair);
  env.defn("list", proc_list);
  env.defn("list*", proc_list_star);
  env.defn("pair", proc_pair);
  env.defn("fst", proc_fst);
  env.defn("snd", proc_snd);
  env.defn("len", proc_len);
  env.defn("append", proc_append);
  env.defn("map", proc_map);
  //env.defn("filter", proc_filter);
  //env.defn("reduce", proc_reduce);

  // Procedures
  env.defmacro("macro", proc_macro);
  env.defmacro("fn", proc_fn);
  env.defn("proc?", proc_is_proc);
  env.defn("macro?", proc_is_macro);
  env.defn("fn?", proc_is_fn);
  env.defn("wrap", proc_wrap);
  env.defn("unwrap", proc_unwrap);
  env.defn("apply", proc_apply);

  // Env
  env.defmacro("eval", proc_eval);
  env.defmacro("def", proc_def);
  env.defmacro("let", proc_let_star);
  env.defn("env?", proc_is_env);
  env.defn("empty-env", proc_empty_env);
  env.defn("initial-env", proc_initial_env);

  // Booleans
  env.defn("bool?", proc_is_bool);
  env.defn("and", proc_and);
  env.defn("or", proc_or);
  env.defn("not", proc_not);

  // Numbers
  env.defn("num?", proc_is_num);
  env.defn("+", proc_add);
  env.defn("*", proc_mul);
  env.defn("-", proc_neg);
  env.defn("/", proc_inv);
  //env.defn("min", proc_min);
  //env.defn("max", proc_max);
  //env.defn("abs", proc_abs);
  //env.defn(">", proc_gt);
  //env.defn(">=", proc_gteq);
  //env.defn("<", proc_lt);
  //env.defn("<=", proc_lteq);
  //env.defn("exp", proc_exp);
  //env.defn("log", proc_log);
  //env.defn("sin", proc_sin);
  //env.defn("cos", proc_cos);
  //env.defn("tan", proc_tan);
  //env.defn("sinh", proc_sinh);
  //env.defn("cosh", proc_cosh);
  //env.defn("tanh", proc_tanh);

  // Symbols
  env.defn("sym?", proc_is_sym);

  // Strings
  env.defn("str?", proc_is_str);

  // Control
  env.defmacro("case", proc_case);
  env.defmacro("if", proc_if);
  env.defmacro("do", proc_do);
  env.defn("reset", proc_reset);
  env.defn("shift", proc_shift);

  // Equivalence
  env.defn("=", proc_is_equal);

  // Input/Output
  env.defn("print!", proc_print);
  env.defn("assert!", proc_assert);
  env.defn("->str", proc_to_str);

  return env;
}
