// Screens call go('home') and so on. main.js supplies the real function, which
// keeps the screens from having to import each other.

let router = () => {};

export function setRouter(fn) {
  router = fn;
}

export function go(name, params = {}) {
  router(name, params);
}
