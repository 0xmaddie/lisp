(print! (append (list 1 2 3) (list 4 5 6)))
(print! (append (list 1 2) (list 3 4) (list 5 6)))
(print! "Hello, world.")
(print! (len "Hello, world."))
(assert! (= (len (list 1 2 3 4 5)) 5))
((fn (x) (print! x)) "foo")

(if #t
    (do
     (print! "true 1")
     (print! "true 2")
     (print! "true 3"))
  (print! "false"))

(let ((foo (+ 1 1))
      (bar (+ 2 2))
      (res (+ foo bar)))
  (print! "res = " res))

(cond ((= 3 2) (print! "true"))
      ((= 3 3) (print! "false...")))

(def quote (macro (x) _ x))

(print! (->str macro))
(print! (->str (quote foo)))
(print! (sym? (quote foo)))

(print! (map (fn (x) (+ x 1)) (list 1 2 3 4 5)))
