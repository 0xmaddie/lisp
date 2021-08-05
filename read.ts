import * as ob from "./object.ts";

type Token =
  | { tag: "open" | "close" | "dot" }
  | { tag: "string"; value: string }
  | { tag: "symbol"; name: string }
  | { tag: "constant"; name: string }
  | { tag: "number"; value: number };

export function tokenize(source: string): Token[] {
  let tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    if (source[index] === "(") {
      tokens.push({ tag: "open" });
      index++;
    } else if (source[index] === ")") {
      tokens.push({ tag: "close" });
      index++;
    } else if (source[index] === ".") {
      tokens.push({ tag: "dot" });
      index++;
    } else if (source[index] === '"') {
      const start = ++index;
      while (index < source.length) {
        if (source[index] === '"') {
          break;
        }
        index++;
      }
      if (index >= source.length) {
        throw `unbalanced quotes`;
      }
      const value = source.substring(start, index);
      tokens.push({ tag: "string", value });
      index++;
    } else if (/\s/.test(source[index])) {
      while (/\s/.test(source[index])) {
        index++;
      }
    } else {
      const start = index++;
      while (
        index < source.length &&
        !/\s/.test(source[index]) &&
        source[index] !== "(" &&
        source[index] !== ")" &&
        source[index] !== '"'
      ) {
        index++;
      }
      const content = source.substring(start, index);
      if (content.startsWith("#<")) {
        throw `unreadable token: ${content}`;
      } else if (content.startsWith("#")) {
        tokens.push({ tag: "constant", name: content.substring(1) });
      } else {
        const maybe_number = Number.parseFloat(content);
        if (!Number.isNaN(maybe_number) && Number.isFinite(maybe_number)) {
          tokens.push({ tag: "number", value: maybe_number });
        } else {
          tokens.push({ tag: "symbol", name: content });
        }
      }
    }
  }
  return tokens;
}

export function read<T>(source: string): ob.Object<T>[] {
  let build_stack: ob.Object<T>[][] = [];
  let dot_stack: boolean[] = [];
  let build: ob.Object<T>[] = [];
  let dot = false;
  for (const token of tokenize(source)) {
    switch (token.tag) {
      case "open": {
        build_stack.push(build);
        build = [];
        dot_stack.push(dot);
        dot = false;
        break;
      }
      case "close": {
        if (build_stack.length === 0) {
          throw `unbalanced parentheses`;
        }
        const value = ob.list<T>(build, { dot });
        build = build_stack.pop()!;
        build.push(value);
        dot = dot_stack.pop()!;
        break;
      }
      case "dot": {
        if (dot === false) {
          dot = true;
        } else {
          throw `too many dots: ${source}`;
        }
        break;
      }
      case "number": {
        const value = new ob.Num<T>(token.value);
        build.push(value);
        break;
      }
      case "string": {
        const value = new ob.Str<T>(token.value);
        build.push(value);
        break;
      }
      case "symbol": {
        const value = new ob.Sym<T>(token.name);
        build.push(value);
        break;
      }
      case "constant": {
        switch (token.name) {
          case "t": {
            const value = new ob.Bool<T>(true);
            build.push(value);
            break;
          }
          case "f": {
            const value = new ob.Bool<T>(false);
            build.push(value);
            break;
          }
          default:
            throw `unknown constant: ${token.name}`;
        }
        break;
      }
    }
  }
  if (build_stack.length !== 0 || dot_stack.length !== 0) {
    throw `unbalanced parentheses`;
  }
  return build;
}
