import { assert } from "https://deno.land/std@0.97.0/testing/asserts.ts";

export type Rest<T> = (value: Obj<T>) => Promise<Obj<T>>;

export abstract class Obj<T> {
  get isList(): boolean {
    return false;
  }

  get canBind(): boolean {
    return false;
  }

  get canApply(): boolean {
    return false;
  }

  get fst(): Obj<T> {
    throw `${this} is not a pair`;
  }

  get snd(): Obj<T> {
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

  get asEmbed(): T {
    throw `${this} is not an embedded value`;
  }

  get isEmpty(): boolean {
    throw `${this} is not a list`;
  }

  get isNotEmpty(): boolean {
    throw `${this} is not a list`;
  }

  append(_rhs: Obj<T>): Obj<T> {
    throw `${this} is not a list`;
  }

  map(_fn: Obj<T>, _ctx: Env<T>, _rest: Rest<T>): Promise<Obj<T>> {
    throw `${this} is not a list`;
  }

  evaluate(_ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return rest(this);
  }

  evaluateAll(_ctx: Env<T>, _rest: Rest<T>): Promise<Obj<T>> {
    throw `${this} is not a list`;
  }

  execute(_ctx: Env<T>, _rest: Rest<T>): Promise<Obj<T>> {
    throw `${this} is not a list`;
  }

  apply(_args: Obj<T>, _ctx: Env<T>, _rest: Rest<T>): Promise<Obj<T>> {
    throw `${this} is not a procedure`;
  }

  bind(args: Obj<T>, _ctx: Env<T>): void {
    throw `${this} cannot bind ${args}`;
  }

  toArray(): Obj<T>[] {
    throw `${this} is not a list`;
  }

  equal(rhs: Obj<T>): boolean {
    return this === rhs;
  }
}

export class Nil<T> extends Obj<T> {
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

  append(rhs: Obj<T>): Obj<T> {
    return rhs;
  }

  async map(_fn: Obj<T>, _ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return rest(this);
  }

  evaluateAll(_ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return rest(this);
  }

  execute(_ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return rest(this);
  }

  bind(rhs: Obj<T>, _ctx: Env<T>): void {
    if (!(rhs instanceof Nil)) {
      throw `() cannot bind ${rhs}`;
    }
  }

  toArray(): Obj<T>[] {
    return [];
  }

  toString(): string {
    return "()";
  }

  equal(rhs: Obj<T>): boolean {
    return rhs instanceof Nil;
  }
}

export class Pair<T> extends Obj<T> {
  _fst: Obj<T>;
  _snd: Obj<T>;

  constructor(fst: Obj<T>, snd: Obj<T>) {
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

  get fst(): Obj<T> {
    return this._fst;
  }

  get snd(): Obj<T> {
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

  append(rhs: Obj<T>): Obj<T> {
    const snd = this.snd.append(rhs);
    return new Pair(this.fst, snd);
  }

  async map(
    fn: Obj<T>,
    ctx: Env<T>,
    rest: Rest<T>,
  ): Promise<Obj<T>> {
    return fn.apply(list([this.fst]), ctx, async (fst) => {
      return this.snd.map(fn, ctx, async (snd) => {
        const result = new Pair(fst, snd);
        return rest(result);
      });
    });
  }

  async evaluate(ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return this.fst.evaluate(ctx, (proc) => {
      return proc.apply(this.snd, ctx, rest);
    });
  }

  async evaluateAll(ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.evaluateAll(ctx, (snd) => {
        const value = new Pair(fst, snd);
        return rest(value);
      });
    });
  }

  async execute(ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
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

  bind(rhs: Obj<T>, ctx: Env<T>): void {
    if (rhs instanceof Pair) {
      this.fst.bind(rhs.fst, ctx);
      this.snd.bind(rhs.snd, ctx);
    } else {
      throw `${this} couldn't bind ${rhs}`;
    }
  }

  toArray(): Obj<T>[] {
    let xs: Obj<T> = this;
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
      let xs: Obj<T> = this;
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

  equal(rhs: Obj<T>): boolean {
    if (rhs instanceof Pair) {
      if (this.fst.equal(rhs.fst)) {
        return this.snd.equal(rhs.snd);
      }
    }
    return false;
  }
}

export class Bool<T> extends Obj<T> {
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

  equal(rhs: Obj<T>): boolean {
    if (rhs instanceof Bool) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Num<T> extends Obj<T> {
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

  equal(rhs: Obj<T>): boolean {
    if (rhs instanceof Num) {
      const epsilon = 0.001;
      const delta = Math.abs(this.value - rhs.value);
      return delta <= epsilon;
    }
    return false;
  }
}

export class Str<T> extends Obj<T> {
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

  equal(rhs: Obj<T>): boolean {
    if (rhs instanceof Str) {
      return this.value === rhs.value;
    }
    return false;
  }
}

export class Sym<T> extends Obj<T> {
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

  evaluate(ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    const entry = ctx.lookup(this);
    return rest(entry.value);
  }

  bind(rhs: Obj<T>, ctx: Env<T>): void {
    if (this.name !== "_") {
      ctx.define(this, rhs);
    }
  }

  toString(): string {
    return this.name;
  }

  equal(rhs: Obj<T>): boolean {
    if (rhs instanceof Sym) {
      return this.name === rhs.name;
    }
    return false;
  }
}

function nameof<T>(key: string | Obj<T>): string {
  if (typeof (key) === "string") {
    return key;
  }
  return key.asSym;
}

export class Entry<T> {
  value: Obj<T>;
  doc?: string;

  constructor(value: Obj<T>, doc?: string) {
    this.value = value;
    this.doc = doc;
  }

  toString(): string {
    if (this.doc) {
      return `${this.value}\n${this.doc}`;
    }
    return `${this.value}`;
  }
}

export class Env<T> extends Obj<T> {
  frame: Map<string, Entry<T>>;
  parent?: Env<T>;

  constructor(parent?: Env<T>) {
    super();
    this.frame = new Map();
    this.parent = parent;
  }

  get canApply(): boolean {
    return true;
  }

  apply(args: Obj<T>, _ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    const entry = this.lookup(args.fst);
    return rest(entry.value);
  }

  lookup(key: string | Obj<T>): Entry<T> {
    const name = nameof(key);
    if (this.frame.has(name)) {
      return this.frame.get(name)!;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    throw `${key} is undefined`;
  }

  define(key: string | Obj<T>, rhs: Obj<T> | Entry<T>): void {
    const name = nameof(key);
    if (this.frame.has(name)) {
      const entry = this.frame.get(name);
      throw `${key} is already defined as ${rhs}`;
    }
    if (rhs instanceof Obj) {
      const entry = new Entry(rhs);
      this.frame.set(name, entry);
    } else {
      this.frame.set(name, rhs);
    }
  }

  remove(key: string | Obj<T>): void {
    const name = nameof(key);
    this.frame.delete(name);
  }

  defmacro(name: string, body: Fproc<T>): void {
    const value = new Proc(name, body);
    this.define(name, value);
  }

  defn(name: string, body: Fproc<T>): void {
    const value = new Wrap(new Proc(name, body));
    this.define(name, value);
  }

  toString(): string {
    return "#<env>";
  }
}

export class Macro<T> extends Obj<T> {
  head: Obj<T>;
  body: Obj<T>;
  lexical: Env<T>;
  dynamic: Obj<T>;

  constructor(
    head: Obj<T>,
    body: Obj<T>,
    lexical: Env<T>,
    dynamic: Obj<T>,
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

  async apply(args: Obj<T>, ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    let local = new Env(this.lexical);
    try {
      this.head.bind(args, local);
      this.dynamic.bind(ctx, local);
      return this.body.execute(local, rest);
    } catch (error) {
      const lhs = `${this.head} ${this.dynamic}`;
      const rhs = `${args} ${ctx}`;
      throw `${error} @ macro: ${lhs} ${rhs}`;
    }
  }

  toString(): string {
    return "#<proc>";
  }
}

export class Wrap<T> extends Obj<T> {
  body: Obj<T>;

  constructor(body: Obj<T>) {
    super();
    this.body = body;
  }

  get canApply(): boolean {
    return true;
  }

  async apply(args: Obj<T>, ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    return args.evaluateAll(ctx, (args) => {
      return this.body.apply(args, ctx, rest);
    });
  }

  toString(): string {
    return "#<proc>";
  }
}

export type Fproc<T> = (
  args: Obj<T>,
  ctx: Env<T>,
  rest: Rest<T>,
) => Promise<Obj<T>>;

export class Proc<T> extends Obj<T> {
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

  async apply(args: Obj<T>, ctx: Env<T>, rest: Rest<T>): Promise<Obj<T>> {
    try {
      return this.body(args, ctx, rest);
    } catch (error) {
      if (error instanceof Obj) {
        throw `${this.name}: ${args}`;
      }
      throw `${error}\nin ${this.name} @ ${args}`;
    }
  }

  toString(): string {
    return "#<proc>";
  }
}

export class Embed<T> extends Obj<T> {
  body: T;

  constructor(body: T) {
    super();
    this.body = body;
  }

  get asEmbed(): T {
    return this.body;
  }

  toString(): string {
    return `${this.body}`;
  }

  equal(rhs: Obj<T>): boolean {
    // TODO: `equal` constraint on T
    return false;
  }
}

export function nil<T>(): Obj<T> {
  return new Nil();
}

export function t<T>(): Obj<T> {
  return new Bool(true);
}

export function f<T>(): Obj<T> {
  return new Bool(false);
}

export function ignore<T>(): Obj<T> {
  return new Sym("_");
}

export function list<T>(
  xs: Obj<T>[],
  options?: { dot: boolean },
): Obj<T> {
  options = options || { dot: false };
  let state;
  let start;
  if (options.dot) {
    assert(xs.length >= 1);
    state = xs[xs.length - 1];
    start = xs.length - 2;
  } else {
    state = new Nil<T>();
    start = xs.length - 1;
  }
  for (let i = start; i >= 0; --i) {
    state = new Pair<T>(xs[i], state);
  }
  return state;
}
