import { assert } from "https://deno.land/std@0.97.0/testing/asserts.ts";

export type Rest<T> = (value: Lisp<T>) => Lisp<T>;

export abstract class Lisp<T> {
  get isList(): boolean {
    return false;
  }

  get canBind(): boolean {
    return false;
  }

  get canApply(): boolean {
    return false;
  }

  evaluate(_ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return rest(this);
  }

  evaluateAll(_ctx: Env<T>, _rest: Rest<T>): Lisp<T> {
    throw `${this} is not a list`;
  }

  execute(_ctx: Env<T>, _rest: Rest<T>): Lisp<T> {
    throw `${this} is not a list`;
  }

  apply(_args: Lisp<T>, _ctx: Env<T>, _rest: Rest<T>): Lisp<T> {
    throw `${this} is not a procedure`;
  }

  bind(args: Lisp<T>, _ctx: Env<T>): void {
    throw `${this} cannot bind ${args}`;
  }

  toArray(): Lisp<T>[] {
    throw `${this} is not a list`;
  }

  equals(rhs: Lisp<T>): boolean {
    return this === rhs;
  }
}

export class Nil<T> extends Lisp<T> {
  constructor() {
    super();
  }

  get isList(): boolean {
    return true;
  }

  get canBind(): boolean {
    return true;
  }

  evaluateAll(_ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return rest(this);
  }

  execute(_ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return rest(this);
  }

  bind(rhs: Lisp<T>, _ctx: Env<T>): void {
    if (!(rhs instanceof Nil)) {
      throw `() cannot bind ${rhs}`;
    }
  }

  toArray(): Lisp<T>[] {
    return [];
  }

  toString(): string {
    return "()";
  }

  equals(rhs: Lisp<T>): boolean {
    return rhs instanceof Nil;
  }
}

export class Pair<T> extends Lisp<T> {
  fst: Lisp<T>;
  snd: Lisp<T>;

  constructor(fst: Lisp<T>, snd: Lisp<T>) {
    super();
    this.fst = fst;
    this.snd = snd;
  }

  get isList(): boolean {
    return this.snd.isList;
  }

  get canBind(): boolean {
    return this.fst.canBind && this.snd.canBind;
  }

  evaluate(ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return this.fst.evaluate(ctx, (proc) => {
      return proc.apply(this.snd, ctx, rest);
    });
  }

  evaluateAll(ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.evaluateAll(ctx, (snd) => {
        const value = new Pair(fst, snd);
        return rest(value);
      });
    });
  }

  execute(ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.execute(ctx, (snd) => {
        if (snd instanceof Nil) {
          return rest(fst);
        } else {
          return rest(snd);
        }
      });
    });
  }

  bind(rhs: Lisp<T>, ctx: Env<T>): void {
    if (rhs instanceof Pair) {
      this.fst.bind(rhs.fst, ctx);
      this.snd.bind(rhs.snd, ctx);
    } else {
      throw `${this} couldn't bind ${rhs}`;
    }
  }

  toArray(): Lisp<T>[] {
    let xs: Lisp<T> = this;
    let buffer = [];
    while (xs instanceof Pair) {
      buffer.push(xs.fst);
      xs = xs.snd;
    }
    if (xs instanceof Nil) {
      return buffer;
    }
    throw `toArray on invalid list: ${this}`;
  }

  toString(): string {
    if (this.isList) {
      let xs: Lisp<T> = this;
      let buffer = [];
      while (xs instanceof Pair) {
        buffer.push(`${xs.fst}`);
        xs = xs.snd;
      }
      if (xs instanceof Nil) {
        const content = buffer.join(" ");
        return `(${content})`;
      }
      throw `toString on invalid list: ${this}`;
    }
    return `(${this.fst} . ${this.snd})`;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Pair) {
      if (this.fst.equals(rhs.fst)) {
        return this.snd.equals(rhs.snd);
      }
    }
    return false;
  }
}

export class Bool<T> extends Lisp<T> {
  value: boolean;

  constructor(value: boolean) {
    super();
    this.value = value;
  }

  toString(): string {
    if (this.value) {
      return "#t";
    }
    return "#f";
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Bool) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Num<T> extends Lisp<T> {
  value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  toString(): string {
    return `${this.value}`;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Num) {
      const epsilon = 0.001;
      const delta = Math.abs(this.value-rhs.value);
      return delta <= epsilon;
    }
    return false;
  }
}

export class Str<T> extends Lisp<T> {
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  toString(): string {
    return `"${this.value}"`;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Str) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Var<T> extends Lisp<T> {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  get canBind(): boolean {
    return true;
  }

  evaluate(ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    const binding = ctx.lookup(this);
    return rest(binding);
  }

  bind(rhs: Lisp<T>, ctx: Env<T>): void {
    ctx.define(this, rhs);
  }

  toString(): string {
    return this.name;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Var) {
      return this.name === rhs.name;
    }
    return false;
  }
}

function nameof<T>(key: string | Var<T>): string {
  if (typeof (key) === "string") {
    return key;
  }
  return key.name;
}

export class Env<T> extends Lisp<T> {
  frame: Map<string, Lisp<T>>;
  parent?: Env<T>;

  constructor(parent?: Env<T>) {
    super();
    this.frame = new Map();
    this.parent = parent;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Lisp<T>, _ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    if (
      args instanceof Pair &&
      args.fst instanceof Var &&
      args.snd instanceof Nil
    ) {
      return rest(this.lookup(args.fst));
    }
    throw `Env#apply: ${args}`;
  }

  lookup(key: string | Var<T>): Lisp<T> {
    const name = nameof(key);
    if (this.frame.has(name)) {
      return this.frame.get(name)!;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    throw `${key} is undefined`;
  }

  define(key: string | Var<T>, value: Lisp<T>): void {
    const name = nameof(key);
    this.frame.set(name, value);
  }

  remove(key: string | Var<T>): void {
    const name = nameof(key);
    this.frame.delete(name);
  }

  toString(): string {
    return "#<environment>";
  }
}

export class Vau<T> extends Lisp<T> {
  head: Lisp<T>;
  body: Lisp<T>;
  lexical: Env<T>;
  dynamic: Var<T>;

  constructor(
    head: Lisp<T>,
    body: Lisp<T>,
    lexical: Env<T>,
    dynamic: Var<T>,
  ) {
    super();
    this.head = head;
    this.body = body;
    this.lexical = lexical;
    this.dynamic = dynamic;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Lisp<T>, ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    let local = new Env(this.lexical);
    try {
      this.head.bind(args, local);
      this.dynamic.bind(ctx, local);
      return this.body.execute(local, rest);
    } catch (_) {
      const lhs = `${this.head} ${this.dynamic}`;
      const rhs = `${args} ${ctx}`;
      throw `vau: ${lhs} couldn't bind ${rhs}`;
    }
  }

  toString(): string {
    return "#<procedure>";
  }
}

export class Wrap<T> extends Lisp<T> {
  body: Lisp<T>;

  constructor(body: Lisp<T>) {
    super();
    this.body = body;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Lisp<T>, ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return args.evaluateAll(ctx, (args) => {
      return this.body.apply(args, ctx, rest);
    });
  }

  toString(): string {
    return "#<procedure>";
  }
}

export type Fproc<T> = (
  args: Lisp<T>,
  ctx: Env<T>,
  rest: Rest<T>,
) => Lisp<T>;

export class Proc<T> extends Lisp<T> {
  name: string;
  body: Fproc<T>;

  constructor(name: string, body: Fproc<T>) {
    super();
    this.name = name;
    this.body = body;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Lisp<T>, ctx: Env<T>, rest: Rest<T>): Lisp<T> {
    return this.body(args, ctx, rest);
  }

  toString(): string {
    return "#<procedure>";
  }
}

export class Embed<T> extends Lisp<T> {
  body: T;

  constructor(body: T) {
    super();
    this.body = body;
  }

  toString(): string {
    return `${this.body}`;
  }

  equals(rhs: Lisp<T>): boolean {
    // TODO: `equals` constraint on T
    return false;
  }
}

export function nil<T>(): Lisp<T> {
  return new Nil();
}

export function list<T>(
  xs: Lisp<T>[],
  options?: { dot: boolean },
): Lisp<T> {
  options = options || { dot: false };
  let state;
  let start;
  if (options.dot) {
    assert(xs.length >= 1);
    state = xs[xs.length-1];
    start = xs.length-2;
  } else {
    state = new Nil();
    start = xs.length-1;
  }
  for (let i = start; i>=0; --i) {
    state = new Pair(xs[i], state);
  }
  return state;
}

type Token =
  | { tag: "open" | "close" | "dot" }
  | { tag: "str"; value: string }
  | { tag: "var"; name: string }
  | { tag: "constant"; name: string }
  | { tag: "num"; value: number };

export function tokenize(source: string): Token[] {
  let tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    if (source[index] === "(") {
      tokens.push({ tag: "open" });
      index++;
    } else if (source[index] === ")") {
      tokens.push({ tag: "close" });
      index++;
    } else if (source[index] === ".") {
      tokens.push({ tag: "dot" });
      index++;
    } else if (source[index] === '"') {
      const start = ++index;
      while (index < source.length) {
        if (source[index] === '"') {
          break;
        }
        index++;
      }
      if (index >= source.length) {
        throw `unbalanced quotes`;
      }
      const value = source.substring(start, index);
      tokens.push({ tag: "str", value });
      index++;
    } else if (/\s/.test(source[index])) {
      while (/\s/.test(source[index])) {
        index++;
      }
    } else {
      const start = index++;
      while (
        index < source.length &&
        !/\s/.test(source[index]) &&
        source[index] !== "(" &&
        source[index] !== ")" &&
        source[index] !== '"'
      ) {
        index++;
      }
      const content = source.substring(start, index);
      if (content.startsWith("#<")) {
        throw `unreadable token: ${content}`;
      } else if (content.startsWith("#")) {
        tokens.push({ tag: "constant", name: content.substring(1) });
      } else {
        const maybe_number = Number.parseFloat(content);
        if (!Number.isNaN(maybe_number) && Number.isFinite(maybe_number)) {
          tokens.push({ tag: "num", value: maybe_number });
        } else {
          tokens.push({ tag: "var", name: content });
        }
      }
    }
  }
  return tokens;
}

export function read<T>(source: string): Lisp<T>[] {
  let stack: Lisp<T>[][] = [];
  let dot_stack: boolean[] = [];
  let build: Lisp<T>[] = [];
  let dot = false;
  const tokens = tokenize(source);
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];
    switch (token.tag) {
      case "open": {
        stack.push(build);
        build = [];
        dot_stack.push(dot);
        dot = false;
        break;
      }
      case "close": {
        if (stack.length === 0) {
          throw `unbalanced parentheses`;
        }
        const value = list(build, { dot });
        build = stack.pop()!;
        build.push(value);
        dot = dot_stack.pop()!;
        break;
      }
      case "dot": {
        if (dot === false) {
          dot = true;
        } else {
          throw `too many dots`;
        }
        break;
      }
      case "num": {
        const value = new Num(token.value);
        build.push(value);
        break;
      }
      case "str": {
        const value = new Str(token.value);
        build.push(value);
        break;
      }
      case "var": {
        const value = new Var(token.name);
        build.push(value);
        break;
      }
      case "constant": {
        switch (token.name) {
          case "t": {
            const value = new Bool(true);
            build.push(value);
            break;
          }
          case "f": {
            const value = new Bool(false);
            build.push(value);
            break;
          }
          default:
            throw `unknown constant: ${token.name}`;
        }
        break;
      }
    }
  }
  if (stack.length !== 0) {
    throw `unbalanced parentheses`;
  }
  return build;
}
