import * as lisp from "./mod.ts";

function* reverse<T>(xs: T[]): Iterable<T> {
  for (let i = xs.length - 1; i >= 0; --i) {
    yield xs[i];
  }
}

function mk_type<T>(
  check: (value: lisp.Obj<T>) => boolean,
): lisp.Fproc<T> {
  return (
    args: lisp.Obj<T>,
    ctx: lisp.Env<T>,
    rest: lisp.Rest<T>,
  ): Promise<lisp.Obj<T>> => {
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
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
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
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
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

async function proc_cond<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  if (args.isNotEmpty) {
    return args.fst.fst.evaluate(ctx, async (flag) => {
      if (flag.asBool) {
        return args.fst.snd.fst.evaluate(ctx, rest);
      } else {
        return proc_cond(args.snd, ctx, rest);
      }
    });
  }
  return rest(lisp.nil<T>());
}

async function proc_case<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return args.fst.evaluate(ctx, (target) => {
    function iterate(
      data: lisp.Obj<T>,
    ): Promise<lisp.Obj<T>> {
      if (data.isNotEmpty) {
        return data.fst.fst.evaluateAll(ctx, async (xs) => {
          while (xs.isNotEmpty) {
            const pattern = xs.fst;
            if (pattern.equal(target)) {
              return data.fst.snd.execute(ctx, rest);
            }
            xs = xs.snd;
          }
          return iterate(data.snd);
        });
      } else {
        const result = lisp.nil<T>();
        return rest(result);
      }
    }
    return iterate(args.snd);
  });
}

function proc_macro<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const head = args.fst;
  const body = args.snd.snd;
  const lexical = ctx;
  const dynamic = args.snd.fst;
  const result = new lisp.Macro(head, body, lexical, dynamic);
  return rest(result);
}

async function proc_fn<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const head = args.fst;
  const body = args.snd;
  const dynamic = lisp.ignore<T>();
  const lexical = ctx;
  const result = new lisp.Wrap(
    new lisp.Macro(head, body, lexical, dynamic),
  );
  return rest(result);
}

function proc_and<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  while (args.isNotEmpty) {
    if (!args.fst.asBool) {
      return rest(args.fst);
    }
    args = args.snd;
  }
  return rest(lisp.t());
}

function proc_or<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  while (args.isNotEmpty) {
    if (args.fst.asBool) {
      return rest(args.fst);
    }
    args = args.snd;
  }
  return rest(lisp.f());
}

function proc_not<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Bool<T>(!args.fst.asBool);
  return rest(result);
}

function proc_wrap<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Wrap(args.fst);
  return rest(result);
}

function proc_unwrap<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  if (!(args.fst instanceof lisp.Wrap)) throw args;
  const result = args.fst.body;
  return rest(result);
}

async function proc_reset<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = await args.execute(ctx, async (x) => x);
  return rest(result);
}

function proc_shift<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest_outer: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const body = new lisp.Proc("shift#<closure>", async (
    args: lisp.Obj<T>,
    _ctx: lisp.Env<T>,
    rest_inner: lisp.Rest<T>,
  ): Promise<lisp.Obj<T>> => {
    const result_outer = await rest_outer(args.fst);
    return rest_inner(result_outer);
  });
  const ks = new lisp.Wrap(body);
  const xs = new lisp.Pair(ks, lisp.nil());
  return args.fst.apply(xs, ctx, async (x) => x);
}

function proc_eval<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  if (!(args.snd.fst instanceof lisp.Env)) throw args;
  return args.fst.evaluate(args.snd.fst, rest);
}

function proc_def<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return args.snd.fst.evaluate(ctx, (rhs) => {
    args.fst.bind(rhs, ctx);
    return rest(lisp.nil());
  });
}

function proc_defn<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const name = args.fst.asSym;
  const parameters = args.snd.fst;
  let data = args.snd.snd;
  if (data.len > 1 && data.fst instanceof lisp.Str) {
    const doc = data.fst.asStr;
    const body = data.snd;
    const proc = new lisp.Wrap(
      new lisp.Macro(parameters, body, ctx, new lisp.Sym("_")),
    );
    const entry = new lisp.Entry(proc, doc);
    ctx.define(name, entry);
  } else {
    const body = data;
    const proc = new lisp.Wrap(
      new lisp.Macro(parameters, body, ctx, new lisp.Sym("_")),
    );
    ctx.define(name, proc);
  }
  const result = lisp.nil<T>();
  return rest(result);
}

async function proc_let_star<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  let local = new lisp.Env(ctx);
  function iterate(
    bindings: lisp.Obj<T>,
  ): Promise<lisp.Obj<T>> {
    if (bindings.isNotEmpty) {
      const lhs = bindings.fst.fst;
      return bindings.fst.snd.fst.evaluate(local, async (rhs) => {
        lhs.bind(rhs, local);
        return iterate(bindings.snd);
      });
    } else {
      return args.snd.execute(local, rest);
    }
  }
  return iterate(args.fst);
}

function proc_apply<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return args.fst.apply(args.snd, ctx, rest);
}

function proc_list<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return rest(args);
}

function proc_list_star<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
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
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Pair(args.fst, args.snd.fst);
  return rest(result);
}

function proc_fst<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return rest(args.fst.fst);
}

function proc_snd<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return rest(args.fst.snd);
}

function proc_len<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Num<T>(args.fst.len);
  return rest(result);
}

function proc_append<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  let items = args.toArray();
  let state = lisp.nil<T>();
  for (const item of reverse(items)) {
    state = item.append(state);
  }
  return rest(state);
}

async function proc_map<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return args.snd.fst.map(args.fst, ctx, rest);
}

function proc_add<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  let state = 0;
  while (args.isNotEmpty) {
    state += args.fst.asNum;
    args = args.snd;
  }
  const result = new lisp.Num<T>(state);
  return rest(result);
}

function proc_mul<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  let state = 1;
  while (args.isNotEmpty) {
    state *= args.fst.asNum;
    args = args.snd;
  }
  const result = new lisp.Num<T>(state);
  return rest(result);
}

function proc_neg<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
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
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
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

function proc_empty_env<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Env<T>();
  return rest(result);
}

function proc_initial_env<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = initial<T>();
  return rest(result);
}

function proc_assert<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  while (args.isNotEmpty) {
    if (!args.fst.asBool) throw arguments[0];
    args = args.snd;
  }
  return rest(lisp.nil());
}

function proc_do<T>(
  args: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  return args.execute(ctx, rest);
}

function proc_to_str<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Str<T>(`${args.fst}`);
  return rest(result);
}

async function proc_read<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const port = args.fst.asPort;
  const result = await port.read();
  return rest(result);
}

async function proc_write<T>(
  args: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  rest: lisp.Rest<T>,
): Promise<lisp.Obj<T>> {
  const port = args.fst.asPort;
  await port.write(args.snd);
  const result = lisp.nil<T>();
  return rest(result);
}

export function initial<T>(): lisp.Env<T> {
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
  const proc_is_fn = mk_type<T>((x) => x instanceof lisp.Wrap);
  const proc_is_proc = mk_type<T>((x) => {
    return (
      x instanceof lisp.Macro ||
      x instanceof lisp.Wrap ||
      x instanceof lisp.Proc
    );
  });
  const proc_is_port = mk_type<T>((x) => x instanceof lisp.Port);
  const proc_is_read_port = mk_type<T>((x) => {
    return x instanceof lisp.Port && x.canRead;
  });
  const proc_is_write_port = mk_type<T>((x) => {
    return x instanceof lisp.Port && x.canWrite;
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
  env.defmacro("defn", proc_defn);
  //env.defmacro("defmacro", proc_defmacro);
  env.defmacro("let", proc_let_star);
  env.defn("env?", proc_is_env);
  env.defn("env/empty", proc_empty_env);
  env.defn("env/initial", proc_initial_env);

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
  env.defmacro("cond", proc_cond);
  env.defmacro("case", proc_case);
  env.defmacro("if", proc_if);
  env.defmacro("do", proc_do);
  env.defn("reset", proc_reset);
  env.defn("shift", proc_shift);

  // Equivalence
  env.defn("=", proc_is_equal);

  // Input/Output
  env.defn("assert", proc_assert);
  env.defn("->str", proc_to_str);

  env.defn("port?", proc_is_port);
  env.defn("port/read?", proc_is_read_port);
  env.defn("port/write?", proc_is_write_port);
  env.defn("port/read", proc_read);
  env.defn("port/write", proc_write);

  env.define(
    "stdout",
    new lisp.Port(
      "stdout",
      undefined,
      async (args) => {
        const text = args.toArray().map((x) => {
          // I don't want strings to print with quotes.
          if (x instanceof lisp.Str) {
            return x.value;
          } else {
            return `${x}`;
          }
        }).join(" ");
        console.log(text);
      },
    ),
  );

  return env;
}
