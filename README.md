A Lisp dialect based on John Shutt's vau calculus.

---

- [x] First class macros

These are actually fexprs, but I think I'm going to use the word
"macros" because people actually know what macros are, while no one
knows what a fexpr is. Macro is close enough in meaning to tweak,
which seems better than starting from scratch with fexpr.

- [x] Delimited continuations with shift/reset

This is important for implementing other languages; delimited
continuations are like a "top type for effects"

- [ ] Conditions and restarts

I think I can implement this with exceptions. Basically whenever you
throw an exception, attach some continuations to "restart" and try
again with a more sensible value.

- [ ] Emacs mode/language server

This would be nice to have, idk how important it is right now.

- [ ] R5RS, R6RS, R(-1)RK

Compatibility with Scheme would be nice but is not important.

---

I'm planning on using this Lisp as a metalanguage, as John described on Lambda
the Ultimate:

## [a strong compile-time language](http://lambda-the-ultimate.org/node/5104#comment-83850)

> I'm a bit skeptical that types are anything but a drastically weak
> compile-time language. What if we allow a strong compile-time language?

Funny you should mention that. If I'm following you, that's been for several
years near the top of my list of cool uses for fexprs. While Kernel's standard
environment binds symbols to combiners that do ordinary operations immediately,
it seems one might readily set up an environment in which those symbols instead
generate object code. Taking advantage of the agility with which fexprs tread
the line between parsing and evaluation. And, ironically, employing fexprs, with
their abstractive power derived from eliminating the phase separation between
interpretation and execution, in the first phase of a phase-separated system.

By John Shutt at Mon, 2015-01-19 16:59
