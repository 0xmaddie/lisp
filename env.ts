import * as lisp from "./lisp.ts";
import * as proc from "./proc.ts";

export function initial<T>(): lisp.Env<T> {
  let env = new lisp.Env();

  function defvau(name: string, body: lisp.Fnat<T>): void {
    const value = new lisp.Native(name, body);
    env.define(name, value);
  }

  function defwrap(name: string, body: lisp.Fnat<T>): void {
    const value = new lisp.Wrap(new lisp.Native(name, body));
    env.define(name, value);
  }

  env.define("nil", lisp.nil());

  defvau("vau", proc.vau);
  defvau("if", proc.if_);

  defwrap("and", proc.and);
  defwrap("or", proc.or);
  defwrap("not", proc.not);

  defwrap("wrap", proc.wrap);
  defwrap("unwrap", proc.unwrap);
  defwrap("list", proc.list);
  defwrap("pr", proc.pr);

  defwrap("+", proc.add);
  defwrap("*", proc.mul);

  return env;
}
