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
    arg: lisp.Obj<T>,
    ctx: lisp.Env<T>,
    act: lisp.Act<T>,
  ): Promise<lisp.Obj<T>> => {
    while (arg.isNotEmpty) {
      const value = arg.fst;
      const rest = arg.snd;
      if (!check(value)) {
        const result = lisp.f<T>();
        return act(result);
      }
      arg = rest;
    }
    const result = lisp.t<T>();
    return act(result);
  };
}

function proc_is_equal<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  let state;
  while (arg.isNotEmpty) {
    const value = arg.fst;
    const rest = arg.snd;
    if (state === undefined) {
      state = value
    } else if (!(value.equal(state))) {
      const result = lisp.f<T>();
      return act(result);
    }
    arg = rest;
  }
  const result = lisp.t<T>();
  return act(result);
}

function proc_if<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const flag = arg.fst;
  const if_branch = arg.snd.fst;
  const else_branch = arg.snd.snd.isEmpty? undefined : arg.snd.snd.fst;
  return flag.evaluate(ctx, (flag) => {
    if (flag.asBool) {
      return if_branch.evaluate(ctx, act);
    }
    if (else_branch !== undefined) {
      return else_branch.evaluate(ctx, act);
    }
    const result = lisp.nil<T>();
    return act(result);
  });
}

async function proc_cond<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  if (arg.isNotEmpty) {
    const flag = arg.fst.fst;
    const body = arg.fst.snd.fst;
    const tail = arg.snd;
    return flag.evaluate(ctx, async (flag) => {
      if (flag.asBool) {
        return body.evaluate(ctx, act);
      }
      return proc_cond(tail, ctx, act);
    });
  }
  const result = lisp.nil<T>();
  return act(result);
}

async function proc_case<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const target = arg.fst;
  const clauses = arg.snd;
  return target.evaluate(ctx, (target) => {
    function iterate(
      clauses: lisp.Obj<T>,
    ): Promise<lisp.Obj<T>> {
      if (clauses.isNotEmpty) {
        const patterns = clauses.fst.fst;
        const body = clauses.fst.snd;
        return patterns.evaluateAll(ctx, async (patterns) => {
          while (patterns.isNotEmpty) {
            const value = patterns.fst;
            const rest = patterns.snd;
            if (value.equal(target)) {
              return body.execute(ctx, act);
            }
            patterns = rest;
          }
          return iterate(clauses.snd);
        });
      } else {
        const result = lisp.nil<T>();
        return act(result);
      }
    }
    return iterate(clauses);
  });
}

function proc_macro<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const head = arg.fst;
  const body = arg.snd.snd;
  const lexical = ctx;
  const dynamic = arg.snd.fst;
  const result = new lisp.Macro(head, body, lexical, dynamic);
  return act(result);
}

async function proc_fn<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const head = arg.fst;
  const body = arg.snd;
  const dynamic = lisp.ignore<T>();
  const lexical = ctx;
  const result = new lisp.Wrap(
    new lisp.Macro(head, body, lexical, dynamic),
  );
  return act(result);
}

function proc_and<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  while (arg.isNotEmpty) {
    const value = arg.fst;
    const rest = arg.snd;
    if (!value.asBool) {
      return act(arg.fst);
    }
    arg = rest;
  }
  return act(lisp.t());
}

function proc_or<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  while (arg.isNotEmpty) {
    const value = arg.fst;
    const rest = arg.snd;
    if (value.asBool) {
      return act(arg.fst);
    }
    arg = rest;
  }
  return act(lisp.f());
}

function proc_not<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Bool<T>(!arg.fst.asBool);
  return act(result);
}

function proc_wrap<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Wrap(arg.fst);
  return act(result);
}

function proc_unwrap<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  if (!(arg.fst instanceof lisp.Wrap)) throw arg;
  const result = arg.fst.body;
  return act(result);
}

async function proc_reset<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const result = await arg.execute(ctx, async (x) => x);
  return act(result);
}

function proc_shift<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act_outer: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const body = new lisp.Proc("shift#<closure>", async (
    arg: lisp.Obj<T>,
    _ctx: lisp.Env<T>,
    act_inner: lisp.Act<T>,
  ): Promise<lisp.Obj<T>> => {
    const inner_arg = arg.fst;
    const result_outer = await act_outer(inner_arg);
    return act_inner(result_outer);
  });
  const dynamic_act = new lisp.Wrap(body);
  const wrapped_act = new lisp.Pair(dynamic_act, lisp.nil());
  const id = async (x: lisp.Obj<T>) => x;
  return arg.fst.apply(wrapped_act, ctx, id);
}

function proc_eval<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const exp = arg.fst;
  const local_ctx = arg.snd.fst.asEnv;
  return exp.evaluate(local_ctx, act);
}

function proc_def<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const symbol = arg.fst;
  const value = arg.snd.fst;
  return value.evaluate(ctx, (value) => {
    symbol.bind(value, ctx);
    const result = lisp.nil<T>();
    return act(result);
  });
}

function proc_defn<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  ctx = ctx.asRoot;
  const name = arg.fst.asSym;
  const parameters = arg.snd.fst;
  let data = arg.snd.snd;
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
      new lisp.Macro(parameters, body, ctx, lisp.ignore()),
    );
    ctx.define(name, proc);
  }
  const result = lisp.nil<T>();
  return act(result);
}

async function proc_let_star<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  let local = new lisp.Env(ctx);
  const bindings = arg.fst;
  const body = arg.snd;
  function iterate(
    bindings: lisp.Obj<T>,
  ): Promise<lisp.Obj<T>> {
    if (bindings.isNotEmpty) {
      const lhs = bindings.fst.fst;
      const rhs = bindings.fst.snd.fst;
      const rest = bindings.snd;
      return rhs.evaluate(local, (rhs) => {
        lhs.bind(rhs, local);
        return iterate(rest);
      });
    } else {
      return body.execute(local, act);
    }
  }
  return iterate(bindings);
}

function proc_apply<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const proc = arg.fst;
  const inner_arg = arg.snd;
  return proc.apply(inner_arg, ctx, act);
}

function proc_list<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  return act(arg);
}

function proc_list_star<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  if (arg.isEmpty) {
    return act(lisp.nil());
  }
  let items = arg.asArray;
  let state = items.pop()!;
  for (const child of reverse(items)) {
    state = new lisp.Pair(child, state);
  }
  return act(state);
}

function proc_pair<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const fst = arg.fst;
  const snd = arg.snd.fst;
  const result = new lisp.Pair(fst, snd);
  return act(result);
}

function proc_fst<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const pair = arg.fst;
  return act(pair.fst);
}

function proc_snd<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const pair = arg.fst;
  return act(pair.snd);
}

function proc_len<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const list = arg.fst;
  const result = new lisp.Num<T>(list.len);
  return act(result);
}

function proc_append<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  let items = arg.asArray;
  let state = lisp.nil<T>();
  for (const item of reverse(items)) {
    state = item.append(state);
  }
  return act(state);
}

async function proc_map<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const proc = arg.fst;
  const xs = arg.snd;
  return lisp.map(proc, lisp.zip(xs), ctx, act);
}

function proc_add<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  let state = 0;
  while (arg.isNotEmpty) {
    state += arg.fst.asNum;
    arg = arg.snd;
  }
  const result = new lisp.Num<T>(state);
  return act(result);
}

function proc_mul<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  let state = 1;
  while (arg.isNotEmpty) {
    state *= arg.fst.asNum;
    arg = arg.snd;
  }
  const result = new lisp.Num<T>(state);
  return act(result);
}

function proc_neg<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  if (arg.isEmpty) throw arg;
  let state = arg.fst.asNum;
  arg = arg.snd;
  while (arg.isNotEmpty) {
    state -= arg.fst.asNum;
    arg = arg.snd;
  }
  const result = new lisp.Num<T>(state);
  return act(result);
}

function proc_inv<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  if (arg.isEmpty) throw arg;
  let state = arg.fst.asNum;
  arg = arg.snd;
  while (arg.isNotEmpty) {
    state /= arg.fst.asNum;
    arg = arg.snd;
  }
  const result = new lisp.Num<T>(state);
  return act(result);
}

function proc_empty_env<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Env<T>();
  return act(result);
}

function proc_initial_env<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const result = initial<T>();
  return act(result);
}

function proc_assert<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  while (arg.isNotEmpty) {
    if (!arg.fst.asBool) throw arguments[0];
    arg = arg.snd;
  }
  return act(lisp.nil());
}

function proc_do<T>(
  arg: lisp.Obj<T>,
  ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  return arg.execute(ctx, act);
}

function proc_to_str<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const result = new lisp.Str<T>(`${arg.fst}`);
  return act(result);
}

async function proc_read<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const port = arg.fst.asPort;
  const result = await port.read();
  return act(result);
}

async function proc_write<T>(
  arg: lisp.Obj<T>,
  _ctx: lisp.Env<T>,
  act: lisp.Act<T>,
): Promise<lisp.Obj<T>> {
  const port = arg.fst.asPort;
  await port.write(arg.snd);
  const result = lisp.nil<T>();
  return act(result);
}

/**
 * The initial environment for Lisp programs.
 */
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
      async (arg) => {
        const text = arg.asArray.map((x) => {
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
