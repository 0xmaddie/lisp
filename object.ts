import { assert } from "https://deno.land/std@0.97.0/testing/asserts.ts";

export type Rest<T> = (value: Object<T>) => Object<T>;

export abstract class Object<T> {
  get isList(): boolean {
    return false;
  }

  get canBind(): boolean {
    return false;
  }

  get canApply(): boolean {
    return false;
  }

  get fst(): Object<T> {
    throw `${this} is not a pair`;
  }

  get snd(): Object<T> {
    throw `${this} is not a pair`;
  }

  get len(): number {
    throw `${this} is not a list`;
  }

  get asBool(): boolean {
    throw `${this} is not a bool`;
  }

  get asNum(): number {
    throw `${this} is not a num`;
  }

  get asStr(): string {
    throw `${this} is not a str`;
  }

  get asSym(): string {
    throw `${this} is not a sym`;
  }

  get isEmpty(): boolean {
    throw `${this} is not a list`;
  }

  get isNotEmpty(): boolean {
    throw `${this} is not a list`;
  }

  append(rhs: Object<T>): Object<T> {
    throw `${this} is not a list`;
  }

  map(fn: Object<T>, ctx: Env<T>): Object<T> {
    throw `${this} is not a list`;
  }

  evaluate(_ctx: Env<T>, rest: Rest<T>): Object<T> {
    return rest(this);
  }

  evaluateAll(_ctx: Env<T>, _rest: Rest<T>): Object<T> {
    throw `${this} is not a list`;
  }

  execute(_ctx: Env<T>, _rest: Rest<T>): Object<T> {
    throw `${this} is not a list`;
  }

  apply(_args: Object<T>, _ctx: Env<T>, _rest: Rest<T>): Object<T> {
    throw `${this} is not a procedure`;
  }

  bind(args: Object<T>, _ctx: Env<T>): void {
    throw `${this} cannot bind ${args}`;
  }

  toArray(): Object<T>[] {
    throw `${this} is not a list`;
  }

  equal(rhs: Object<T>): boolean {
    return this === rhs;
  }
}

export class Nil<T> extends Object<T> {
  constructor() {
    super();
  }

  get isList(): boolean {
    return true;
  }

  get canBind(): boolean {
    return true;
  }

  get len(): number {
    return 0;
  }

  get isEmpty(): boolean {
    return true;
  }

  get isNotEmpty(): boolean {
    return false;
  }

  append(rhs: Object<T>): Object<T> {
    return rhs;
  }

  map(fn: Object<T>, ctx: Env<T>): Object<T> {
    return this;
  }

  evaluateAll(_ctx: Env<T>, rest: Rest<T>): Object<T> {
    return rest(this);
  }

  execute(_ctx: Env<T>, rest: Rest<T>): Object<T> {
    return rest(this);
  }

  bind(rhs: Object<T>, _ctx: Env<T>): void {
    if (!(rhs instanceof Nil)) {
      throw `() cannot bind ${rhs}`;
    }
  }

  toArray(): Object<T>[] {
    return [];
  }

  toString(): string {
    return "()";
  }

  equal(rhs: Object<T>): boolean {
    return rhs instanceof Nil;
  }
}

export class Pair<T> extends Object<T> {
  _fst: Object<T>;
  _snd: Object<T>;

  constructor(fst: Object<T>, snd: Object<T>) {
    super();
    this._fst = fst;
    this._snd = snd;
  }

  get isList(): boolean {
    return this.snd.isList;
  }

  get canBind(): boolean {
    return this.fst.canBind && this.snd.canBind;
  }

  get fst(): Object<T> {
    return this._fst;
  }

  get snd(): Object<T> {
    return this._snd;
  }

  get len(): number {
    return 1 + this.snd.len;
  }

  get isEmpty(): boolean {
    return false;
  }

  get isNotEmpty(): boolean {
    return true;
  }

  append(rhs: Object<T>): Object<T> {
    const snd = this.snd.append(rhs);
    return new Pair(this.fst, snd);
  }

  map(fn: Object<T>, ctx: Env<T>): Object<T> {
    const fst = fn.apply(list([this.fst]), ctx, (x) => x);
    const snd = this.snd.map(fn, ctx);
    return new Pair(fst, snd);
  }

  evaluate(ctx: Env<T>, rest: Rest<T>): Object<T> {
    return this.fst.evaluate(ctx, (proc) => {
      return proc.apply(this.snd, ctx, rest);
    });
  }

  evaluateAll(ctx: Env<T>, rest: Rest<T>): Object<T> {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.evaluateAll(ctx, (snd) => {
        const value = new Pair(fst, snd);
        return rest(value);
      });
    });
  }

  execute(ctx: Env<T>, rest: Rest<T>): Object<T> {
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

  bind(rhs: Object<T>, ctx: Env<T>): void {
    if (rhs instanceof Pair) {
      this.fst.bind(rhs.fst, ctx);
      this.snd.bind(rhs.snd, ctx);
    } else {
      throw `${this} couldn't bind ${rhs}`;
    }
  }

  toArray(): Object<T>[] {
    let xs: Object<T> = this;
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
      let xs: Object<T> = this;
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

  equal(rhs: Object<T>): boolean {
    if (rhs instanceof Pair) {
      if (this.fst.equal(rhs.fst)) {
        return this.snd.equal(rhs.snd);
      }
    }
    return false;
  }
}

export class Bool<T> extends Object<T> {
  value: boolean;

  constructor(value: boolean) {
    super();
    this.value = value;
  }

  get asBool(): boolean {
    return this.value;
  }

  toString(): string {
    if (this.value) {
      return "#t";
    }
    return "#f";
  }

  equal(rhs: Object<T>): boolean {
    if (rhs instanceof Bool) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Num<T> extends Object<T> {
  value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  get asNum(): number {
    return this.value;
  }

  toString(): string {
    return `${this.value}`;
  }

  equal(rhs: Object<T>): boolean {
    if (rhs instanceof Num) {
      const epsilon = 0.001;
      const delta = Math.abs(this.value - rhs.value);
      return delta <= epsilon;
    }
    return false;
  }
}

export class Str<T> extends Object<T> {
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  get asStr(): string {
    return this.value;
  }

  get len(): number {
    return this.value.length;
  }

  toString(): string {
    return `"${this.value}"`;
  }

  equal(rhs: Object<T>): boolean {
    if (rhs instanceof Str) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Sym<T> extends Object<T> {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  get canBind(): boolean {
    return true;
  }

  get asSym(): string {
    return this.name;
  }

  evaluate(ctx: Env<T>, rest: Rest<T>): Object<T> {
    const binding = ctx.lookup(this);
    return rest(binding);
  }

  bind(rhs: Object<T>, ctx: Env<T>): void {
    if (this.name !== "_") {
      ctx.define(this, rhs);
    }
  }

  toString(): string {
    return this.name;
  }

  equal(rhs: Object<T>): boolean {
    if (rhs instanceof Sym) {
      return this.name === rhs.name;
    }
    return false;
  }
}

function nameof<T>(key: string | Object<T>): string {
  if (typeof (key) === "string") {
    return key;
  }
  return key.asSym;
}

export class Env<T> extends Object<T> {
  frame: Map<string, Object<T>>;
  parent?: Env<T>;

  constructor(parent?: Env<T>) {
    super();
    this.frame = new Map();
    this.parent = parent;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Object<T>, _ctx: Env<T>, rest: Rest<T>): Object<T> {
    return rest(this.lookup(args.fst));
  }

  lookup(key: string | Object<T>): Object<T> {
    const name = nameof(key);
    if (this.frame.has(name)) {
      return this.frame.get(name)!;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    throw `${key} is undefined`;
  }

  define(key: string | Object<T>, value: Object<T>): void {
    const name = nameof(key);
    if (this.frame.has(name)) {
      const value = this.frame.get(name);
      throw `${key} is already defined as ${value}`;
    }
    this.frame.set(name, value);
  }

  remove(key: string | Object<T>): void {
    const name = nameof(key);
    this.frame.delete(name);
  }

  defmacro(name: string, body: Fproc<T>): void {
    const value = new Proc(name, body);
    this.define(name, value);
  }

  defn(name: string, body: Fproc<T>): void {
    const value = new Fn(new Proc(name, body));
    this.define(name, value);
  }

  toString(): string {
    return "#<env>";
  }
}

export class Macro<T> extends Object<T> {
  head: Object<T>;
  body: Object<T>;
  lexical: Env<T>;
  dynamic: Object<T>;

  constructor(
    head: Object<T>,
    body: Object<T>,
    lexical: Env<T>,
    dynamic: Object<T>,
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

  apply(args: Object<T>, ctx: Env<T>, rest: Rest<T>): Object<T> {
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
    return "#<proc>";
  }
}

export class Fn<T> extends Object<T> {
  body: Object<T>;

  constructor(body: Object<T>) {
    super();
    this.body = body;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Object<T>, ctx: Env<T>, rest: Rest<T>): Object<T> {
    return args.evaluateAll(ctx, (args) => {
      return this.body.apply(args, ctx, rest);
    });
  }

  toString(): string {
    return "#<proc>";
  }
}

export type Fproc<T> = (
  args: Object<T>,
  ctx: Env<T>,
  rest: Rest<T>,
) => Object<T>;

export class Proc<T> extends Object<T> {
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

  apply(args: Object<T>, ctx: Env<T>, rest: Rest<T>): Object<T> {
    try {
      return this.body(args, ctx, rest);
    } catch (error) {
      if (error instanceof Object) {
        throw `${this.name}: ${args}`;
      }
      throw `${error}\nin ${this.name} @ ${args}`;
    }
  }

  toString(): string {
    return "#<proc>";
  }
}

export class Embed<T> extends Object<T> {
  body: T;

  constructor(body: T) {
    super();
    this.body = body;
  }

  toString(): string {
    return `${this.body}`;
  }

  equal(rhs: Object<T>): boolean {
    // TODO: `equal` constraint on T
    return false;
  }
}

export function nil<T>(): Object<T> {
  return new Nil();
}

export function t<T>(): Object<T> {
  return new Bool(true);
}

export function f<T>(): Object<T> {
  return new Bool(false);
}

export function ignore<T>(): Object<T> {
  return new Sym("_");
}

export function list<T>(
  xs: Object<T>[],
  options?: { dot: boolean },
): Object<T> {
  options = options || { dot: false };
  let state;
  let start;
  if (options.dot) {
    assert(xs.length >= 1);
    state = xs[xs.length - 1];
    start = xs.length - 2;
  } else {
    state = new Nil();
    start = xs.length - 1;
  }
  for (let i = start; i >= 0; --i) {
    state = new Pair(xs[i], state);
  }
  return state;
}
