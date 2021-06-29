A small Lisp dialect based on [the vau
calculus](http://web.cs.wpi.edu/~jshutt/kernel.html).

Unlike a `lambda` expression, the arguments to a `vau` expression are
not evaluated; evaluation is explicitly requested with `wrap`:

```
       ((vau (x) e x) (+ 1 1)) = (+ 1 1)
((wrap (vau (x) e x)) (+ 1 1)) = 2
```

This implementation of Lisp has delimited continuations, using `shift`
and `reset`.

```
(* 2 (reset (+ 1 (shift (lambda (k) (k 5)))))) = 12
```

---

I want to use this Lisp [the way John Shutt describes it
here:](http://lambda-the-ultimate.org/node/5104#comment-83850)

> Funny you should mention that. If I'm following you, that's been for
> several years near the top of my list of cool uses for fexprs. While
> Kernel's standard environment binds symbols to combiners that do
> ordinary operations immediately, it seems one might readily set up
> an environment in which those symbols instead generate object
> code. Taking advantage of the agility with which fexprs tread the
> line between parsing and evaluation. And, ironically, employing
> fexprs, with their abstractive power derived from eliminating the
> phase separation between interpretation and execution, in the first
> phase of a phase-separated system.

Lisp will host the other languages I'm working on: ABC, Xlog, and
Transformers, essentially serving as a fancy compile-time using
fexprs.
