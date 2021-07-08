A Lisp dialect based on John Shutt's vau calculus.

I'm planning on using this Lisp as a metalanguage, as John described
in this LtU comment:

> ## [a strong compile-time language](http://lambda-the-ultimate.org/node/5104#comment-83850)
>
> > I'm a bit skeptical that types are anything but a drastically weak
> > compile-time language. What if we allow a strong compile-time
> > language?
>
> Funny you should mention that. If I'm following you, that's been for
> several years near the top of my list of cool uses for fexprs. While
> Kernel's standard environment binds symbols to combiners that do
> ordinary operations immediately, it seems one might readily set up an
> environment in which those symbols instead generate object
> code. Taking advantage of the agility with which fexprs tread the line
> between parsing and evaluation. And, ironically, employing fexprs,
> with their abstractive power derived from eliminating the phase
> separation between interpretation and execution, in the first phase of
> a phase-separated system.
>
> By John Shutt at Mon, 2015-01-19 16:59
