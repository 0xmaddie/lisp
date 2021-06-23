import * as lisp from "./lisp.ts";
import * as proc from "./proc.ts";

export function initial<T>(): lisp.Env<T> {
  let env = new lisp.Env();

  function defvau(name: string, body: lisp.Fproc<T>): void {
    const value = new lisp.Proc(name, body);
    env.define(name, value);
  }

  function defwrap(name: string, body: lisp.Fproc<T>): void {
    const value = new lisp.Wrap(new lisp.Proc(name, body));
    env.define(name, value);
  }

  defvau("vau", proc.vau);
  defvau("if", proc.if_);

  defwrap("and", proc.and);
  defwrap("or", proc.or);
  defwrap("not", proc.not);

  defwrap("wrap", proc.wrap);
  defwrap("unwrap", proc.unwrap);
  defwrap("reset", proc.reset);
  defwrap("shift", proc.shift);

  defwrap("list", proc.list);

  defwrap("+", proc.add);
  defwrap("*", proc.mul);

  defwrap("pr", proc.pr);

  return env;
}
