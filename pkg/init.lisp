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
