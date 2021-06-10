import * as err from "./error.ts";

export type Ok<T> = (value: Lisp<T>) => void;
export type Err = (error: err.Error) => void;

export abstract class Lisp<T> {
  get isList(): boolean {
    return false;
  }

  get canBind(): boolean {
    return false;
  }

  evaluate(_ctx: Env<T>, ok: Ok<T>, _err: Err): void {
    return ok(this);
  }

  evaluateAll(_ctx: Env<T>, _ok: Ok<T>, err: Err): void {
    return err(`${this} is not a list`);
  }

  execute(_ctx: Env<T>, _ok: Ok<T>, err: Err): void {
    return err(`${this} is not a list`);
  }

  apply(_args: Lisp<T>, _ctx: Env<T>, _ok: Ok<T>, err: Err): void {
    return err(`${this} is not a procedure`);
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

  evaluateAll(_ctx: Env<T>, ok: Ok<T>, _err: Err): void {
    return ok(this);
  }

  execute(_ctx: Env<T>, ok: Ok<T>, _err: Err): void {
    return ok(this);
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

  evaluate(ctx: Env<T>, ok: Ok<T>, err: Err): void {
    return this.fst.evaluate(ctx, (proc) => {
      return proc.apply(this.snd, ctx, ok, err);
    }, err);
  }

  evaluateAll(ctx: Env<T>, ok: Ok<T>, err: Err): void {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.evaluateAll(ctx, (snd) => {
        const value = new Pair(fst, snd);
        return ok(value);
      }, err);
    }, err);
  }

  execute(ctx: Env<T>, ok: Ok<T>, err: Err): void {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.execute(ctx, (snd) => {
        if (snd instanceof Nil) {
          return ok(fst);
        } else {
          return ok(snd);
        }
      }, err);
    }, err);
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
    return `(${this.fst} * ${this.snd})`;
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

export class Float<T> extends Lisp<T> {
  value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  toString(): string {
    return `${this.value}`;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Float) {
      const epsilon = 0.001;
      const delta = Math.abs(this.value-rhs.value);
      return delta <= epsilon;
    }
    return false;
  }
}

export class Text<T> extends Lisp<T> {
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  toString(): string {
    return `"${this.value}"`;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Text) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Variable<T> extends Lisp<T> {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  get canBind(): boolean {
    return true;
  }

  evaluate(ctx: Env<T>, ok: Ok<T>, err: Err): void {
    try {
      const binding = ctx.lookup(this);
      return ok(binding);
    } catch (error) {
      return err(error);
    }
  }

  bind(rhs: Lisp<T>, ctx: Env<T>): void {
    ctx.define(this, rhs);
  }

  toString(): string {
    return this.name;
  }

  equals(rhs: Lisp<T>): boolean {
    if (rhs instanceof Variable) {
      return this.name === rhs.name;
    }
    return false;
  }
}

function nameof<T>(key: string | Variable<T>): string {
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

  lookup(key: string | Variable<T>): Lisp<T> {
    const name = nameof(key);
    if (this.frame.has(name)) {
      return this.frame.get(name)!;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    throw `${key} is undefined`;
  }

  define(key: string | Variable<T>, value: Lisp<T>): void {
    const name = nameof(key);
    this.frame.set(name, value);
  }

  remove(key: string | Variable<T>): void {
    const name = nameof(key);
    this.frame.delete(name);
  }

  toString(): string {
    return "#<environment>";
  }
}

export abstract class Proc<T> extends Lisp<T> {
  toString(): string {
    return `#<procedure>`;
  }
}

export class Vau<T> extends Proc<T> {
  head: Lisp<T>;
  body: Lisp<T>;
  lexical: Env<T>;
  dynamic: Variable<T>;

  constructor(
    head: Lisp<T>,
    body: Lisp<T>,
    lexical: Env<T>,
    dynamic: Variable<T>,
  ) {
    super();
    this.head = head;
    this.body = body;
    this.lexical = lexical;
    this.dynamic = dynamic;
  }

  apply(args: Lisp<T>, ctx: Env<T>, ok: Ok<T>, err: Err): void {
    let local = new Env(this.lexical);
    try {
      this.head.bind(args, local);
      this.dynamic.bind(ctx, local);
      return this.body.execute(local, ok, err);
    } catch (_) {
      const lhs = `${this.head} ${this.dynamic}`;
      const rhs = `${args} ${ctx}`;
      return err(`vau: ${lhs} couldn't bind ${rhs}`);
    }
  }
}

export class Wrap<T> extends Proc<T> {
  body: Proc<T>;

  constructor(body: Proc<T>) {
    super();
    this.body = body;
  }

  apply(args: Lisp<T>, ctx: Env<T>, ok: Ok<T>, err: Err): void {
    return args.evaluateAll(ctx, (args) => {
      return this.body.apply(args, ctx, ok, err);
    }, err);
  }
}

export type Fnat<T> = (
  args: Lisp<T>,
  ctx: Env<T>,
  ok: Ok<T>,
  err: Err,
) => void;

export class Native<T> extends Proc<T> {
  name: string;
  body: Fnat<T>;

  constructor(name: string, body: Fnat<T>) {
    super();
    this.name = name;
    this.body = body;
  }

  apply(args: Lisp<T>, ctx: Env<T>, ok: Ok<T>, err: Err): void {
    return this.body(args, ctx, ok, err);
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
): Lisp<T> {
  let state = new Nil();
  for (let i = xs.length - 1; i >= 0; --i) {
    state = new Pair(xs[i], state);
  }
  return state;
}

type Token =
  | { tag: "open" | "close" }
  | { tag: "text"; value: string }
  | { tag: "variable"; name: string }
  | { tag: "constant"; name: string }
  | { tag: "float"; value: number };

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
      tokens.push({ tag: "text", value });
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
          tokens.push({ tag: "float", value: maybe_number });
        } else {
          tokens.push({ tag: "variable", name: content });
        }
      }
    }
  }
  return tokens;
}

export function read<T>(source: string): Lisp<T>[] {
  let stack: Lisp<T>[][] = [];
  let build: Lisp<T>[] = [];
  for (const token of tokenize(source)) {
    switch (token.tag) {
      case "open": {
        stack.push(build);
        build = [];
        break;
      }
      case "close": {
        if (stack.length === 0) {
          throw `unbalanced parentheses`;
        }
        const value = list(build);
        build = stack.pop()!;
        build.push(value);
        break;
      }
      case "float": {
        const value = new Float(token.value);
        build.push(value);
        break;
      }
      case "text": {
        const value = new Text(token.value);
        build.push(value);
        break;
      }
      case "variable": {
        const value = new Variable(token.name);
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
