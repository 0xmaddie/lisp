import { assert } from "https://deno.land/std@0.97.0/testing/asserts.ts";

/**
 * The type of continuations during a Lisp computation.
 */
export type Act<T> = (value: Obj<T>) => Promise<Obj<T>>;

/**
 * A Lisp object. This Lisp is written in TypeScript, but this object
 * has a "dynamically typed" API that supports every possible Lisp
 * operation and throws if the receiver has the wrong type.
 */
export abstract class Obj<T> {
  /**
   * Returns true if this object is either nil or a pair.
   */
  get isList(): boolean {
    return false;
  }

  /**
   * Returns true if this object can bind an object within an
   * environment, e.g. if it's a symbol or a pair of bindable objects.
   */
  get canBind(): boolean {
    return false;
  }

  /**
   * Returns true if this object can be applied.
   */
  get canApply(): boolean {
    return false;
  }

  /**
   * Returns the first element of a pair.
   */
  get fst(): Obj<T> {
    throw `${this} is not a pair`;
  }

  /**
   * Returns the second element of a pair.
   */
  get snd(): Obj<T> {
    throw `${this} is not a pair`;
  }

  /**
   * Returns the length of a collection.
   */
  get len(): number {
    throw `${this} is not a list`;
  }

  /**
   * Returns this object's boolean value.
   */
  get asBool(): boolean {
    throw `${this} is not a bool`;
  }

  /**
   * Returns this object's number value.
   */
  get asNum(): number {
    throw `${this} is not a num`;
  }

  /**
   * Returns this object's string value.
   */
  get asStr(): string {
    throw `${this} is not a str`;
  }

  /**
   * Returns this object's symbol value.
   */
  get asSym(): string {
    throw `${this} is not a sym`;
  }

  /**
   * Returns this object's port value.
   */
  get asPort(): Port<T> {
    throw `${this} is not a port`;
  }

  /**
   * Returns this object's embedded value.
   */
  get asEmbed(): T {
    throw `${this} is not an embedded value`;
  }

  /**
   * If the receiver is a list, return the elements as a JavaScript
   * array.
   */
  get asArray(): Obj<T>[] {
    throw `${this} is not a list`;
  }

  /**
   * If the receiver is an environment, return it.
   */
  get asEnv(): Env<T> {
    throw `${this} is not an environment`;
  }

  /**
   * If the receiver is a top level environment, return it.
   */
  get asRoot(): Env<T> {
    throw `${this} is not an environment`;
  }

  /**
   * Returns true if this object is nil.
   */
  get isEmpty(): boolean {
    throw `${this} is not a list`;
  }

  /**
   * Returns true if this object is a non-empty list.
   */
  get isNotEmpty(): boolean {
    throw `${this} is not a list`;
  }

  /**
   * If the receiver and rhs are lists, concatenate them together.
   */
  append(_rhs: Obj<T>): Obj<T> {
    throw `${this} is not a list`;
  }

  /**
   * If the receiver is a list, apply fn to each element and return
   * the result as a list.
   */
  map(_fn: Obj<T>, _ctx: Env<T>, _act: Act<T>): Promise<Obj<T>> {
    throw `${this} is not a list`;
  }

  /**
   * Evaluate the receiver in the environment provided.
   */
  evaluate(_ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return act(this);
  }

  /**
   * If the receiver is a list, evaluate each element in the
   * environment provided, and return the result as a list.
   */
  evaluateAll(_ctx: Env<T>, _act: Act<T>): Promise<Obj<T>> {
    throw `${this} is not a list`;
  }

  /**
   * If the receiver is a list, evaluate each element in the
   * environment provided, and return the last element. This is used
   * to evaluate an object for its effects.
   */
  execute(_ctx: Env<T>, _act: Act<T>): Promise<Obj<T>> {
    throw `${this} is not a list`;
  }

  /**
   * If the receiver is a procedure, apply to the arguments and
   * environment provided.
   */
  apply(_arg: Obj<T>, _ctx: Env<T>, _act: Act<T>): Promise<Obj<T>> {
    throw `${this} is not a procedure`;
  }

  /**
   * Use the receiver to bind the arguments and environment provided.
   */
  bind(arg: Obj<T>, _ctx: Env<T>): void {
    throw `${this} cannot bind ${arg}`;
  }

  /**
   * If the receiver is a read port, read an object.
   */
  read(): Promise<Obj<T>> {
    throw `${this} is not a read port`;
  }

  /**
   * If the receiver is a write port, write an object.
   */
  write(obj: Obj<T>): Promise<void> {
    throw `${this} is not a write port`;
  }

  /**
   * Returns true if the receiver is equivalent to the rhs. If the
   * receiver is mutable, this uses object identity, i.e. it will
   * return true only if the rhs points to the same object.
   */
  equal(rhs: Obj<T>): boolean {
    return this === rhs;
  }
}

/**
 * Nil, written (), is the empty list. Used with Pair to construct
 * lists. It's often returned from procedures that have "no value",
 * i.e. are only called for their effects.
 */
export class Nil<T> extends Obj<T> {
  constructor() {
    super();
  }

  get asArray(): Obj<T>[] {
    return [];
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

  async map(_fn: Obj<T>, _ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return act(this);
  }

  evaluateAll(_ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return act(this);
  }

  execute(_ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return act(this);
  }

  bind(rhs: Obj<T>, _ctx: Env<T>): void {
    if (!(rhs instanceof Nil)) {
      throw `() cannot bind ${rhs}`;
    }
  }

  toString(): string {
    return "()";
  }

  equal(rhs: Obj<T>): boolean {
    return rhs instanceof Nil;
  }
}

/**
 * A pair of objects. Used with Nil to construct lists.
 */
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

  get asArray(): Obj<T>[] {
    let xs: Obj<T> = this;
    let buffer = [];
    while (xs instanceof Pair) {
      buffer.push(xs.fst);
      xs = xs.snd;
    }
    if (xs instanceof Nil) {
      return buffer;
    }
    throw `asArray on invalid list: ${this}`;
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
    act: Act<T>,
  ): Promise<Obj<T>> {
    return fn.apply(list([this.fst]), ctx, async (fst) => {
      return this.snd.map(fn, ctx, async (snd) => {
        const result = new Pair(fst, snd);
        return act(result);
      });
    });
  }

  async evaluate(ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return this.fst.evaluate(ctx, (proc) => {
      return proc.apply(this.snd, ctx, act);
    });
  }

  async evaluateAll(ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.evaluateAll(ctx, (snd) => {
        const value = new Pair(fst, snd);
        return act(value);
      });
    });
  }

  async execute(ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return this.fst.evaluate(ctx, (fst) => {
      return this.snd.execute(ctx, (snd) => {
        if (snd instanceof Nil) {
          return act(fst);
        } else {
          return act(snd);
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

/**
 *  A boolean value, #t (true) or #f (false).
 */
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

/**
 * A floating point number.
 */
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

/**
 * An immutable string.
 */
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

/**
 * A symbol. Can be bound to another object within an environment.
 */
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

  evaluate(ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    const entry = ctx.lookup(this);
    return act(entry.value);
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

/**
 * An entry within an environment. Stores a documentation string along
 * with the object.
 */
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

/**
 * An environment mapping symbols to objects.
 */
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

  get asEnv(): Env<T> {
    return this;
  }

  get asRoot(): Env<T> {
    if (this.parent !== undefined) {
      throw `${this} is not the root environment`;
    }
    return this;
  }

  apply(arg: Obj<T>, _ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    const ident = arg.fst;
    const entry = this.lookup(ident);
    return act(entry.value);
  }

  /**
   * Return the entry associated with an identifier.
   */
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

  /**
   * Associate the symbol and object provided.
   */
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

  /**
   * Remove the entry associated with an identifier.
   */
  remove(key: string | Obj<T>): void {
    const name = nameof(key);
    this.frame.delete(name);
  }

  /**
   * Define a fexpr with the name and body provided.
   */
  defmacro(name: string, body: Fproc<T>): void {
    const value = new Proc(name, body);
    this.define(name, value);
  }

  /**
   * Define a procedure with the name and body provided.
   */
  defn(name: string, body: Fproc<T>): void {
    const value = new Wrap(new Proc(name, body));
    this.define(name, value);
  }

  toString(): string {
    return "#<env>";
  }
}

/**
 *  A fexpr, or a lexically scoped procedure that receives its
 * arguments unevaluated, along with the dynamic environment.
 */
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

  async apply(arg: Obj<T>, ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    let local = new Env(this.lexical);
    try {
      this.head.bind(arg, local);
      this.dynamic.bind(ctx, local);
      return this.body.execute(local, act);
    } catch (error) {
      const lhs = `${this.head} ${this.dynamic}`;
      const rhs = `${arg} ${ctx}`;
      throw `${error} @ macro: ${lhs} ${rhs}`;
    }
  }

  toString(): string {
    return "#<proc>";
  }
}

/**
 * A wrapper that induces argument evaluation on another procedure.
 */
export class Wrap<T> extends Obj<T> {
  body: Obj<T>;

  constructor(body: Obj<T>) {
    super();
    this.body = body;
  }

  get canApply(): boolean {
    return true;
  }

  async apply(arg: Obj<T>, ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    return arg.evaluateAll(ctx, (arg) => {
      return this.body.apply(arg, ctx, act);
    });
  }

  toString(): string {
    return "#<proc>";
  }
}

/**
 * The type of procedure bodies.
 */
export type Fproc<T> = (
  arg: Obj<T>,
  ctx: Env<T>,
  act: Act<T>,
) => Promise<Obj<T>>;

/**
 * A procedure whose body is a JavaScript function. Receives its
 * arguments unevaluated; use Wrap in order to induce evaluation.
 */
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

  async apply(arg: Obj<T>, ctx: Env<T>, act: Act<T>): Promise<Obj<T>> {
    try {
      return this.body(arg, ctx, act);
    } catch (error) {
      if (error instanceof Obj) {
        throw `${this.name}: ${arg}`;
      }
      throw `${error}\nin ${this.name} @ ${arg}`;
    }
  }

  toString(): string {
    return "#<proc>";
  }
}

/**
 * An embedded value of type T.
 */
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

/**
 * A JavaScript function used to read values from a read port.
 */
export type Fread<T> = () => Promise<Obj<T>>;

/**
 * A JavaScript function used to write values to a write port.
 */
export type Fwrite<T> = (obj: Obj<T>) => Promise<void>;

/**
 * Ports represent input and output devices. Lisp can read objects
 * from an input port, or write objects to an output port. Some ports
 * support both interfaces.
 */
export class Port<T> extends Obj<T> {
  name: string;
  _read?: Fread<T>;
  _write?: Fwrite<T>;

  constructor(
    name: string,
    read?: Fread<T>,
    write?: Fwrite<T>,
  ) {
    super();
    this.name = name;
    this._read = read;
    this._write = write;
  }

  get asPort(): Port<T> {
    return this;
  }

  get canRead(): boolean {
    return this.read !== undefined;
  }

  get canWrite(): boolean {
    return this.write !== undefined;
  }

  read(): Promise<Obj<T>> {
    if (this._read) {
      return this._read();
    }
    throw `${this} is not a readable port`;
  }

  write(obj: Obj<T>): Promise<void> {
    if (this._write) {
      return this._write(obj);
    }
    throw `${this} is not a writable port`;
  }

  toString(): string {
    return `#<port:${this.name}>`;
  }

  equal(rhs: Obj<T>): boolean {
    return this === rhs;
  }
}

/**
 * The empty list.
 */
export function nil<T>(): Obj<T> {
  return new Nil();
}

/**
 * The true boolean value.
 */
export function t<T>(): Obj<T> {
  return new Bool(true);
}

/**
 * The false boolean value.
 */
export function f<T>(): Obj<T> {
  return new Bool(false);
}

/**
 * The symbol `_` will not bind an object within an environment.
 */
export function ignore<T>(): Obj<T> {
  return new Sym("_");
}

/**
 * Returns a Lisp list of the objects provided. If the `dot` option is
 * true, the last element of the array is used as the last element of
 * the list, rather than nil, and the result is a list only if the
 * last element is a list.
 */
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
