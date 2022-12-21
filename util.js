function avg(xs) {
  return sum(xs) / xs.length;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function chance(val) {
  return Math.random() <= val;
}

// Given a list of items that may contain duplicates,
// return an updated copy of the list without any duplicates.
function distinct(items){
  return items.filter((val, idx) => items.indexOf(val) === idx);
}

// Generalized implementation of ChoiceScript's "fairmath":
// a variant of additive arithmetic that bounds the outputs to a specific range
// and reduces the impact of additions proportional to the starting value's closeness
// to the edge of the range you're moving toward. ChoiceScript's fairmath implementation
// uses 0-100 as the hardcoded range for values; this implementation allows you to
// specify your own range, but will default to 0-100 if none is provided.
//
// Example usage:
// `fairmath({to: 10, add: 20, min: 0, max: 100}) // => 28`
//
// For more information:
// - https://choicescriptdev.fandom.com/wiki/Arithmetic_operators#Fairmath
// - https://videlais.com/2018/08/24/learning-choicescript-part-6-fairmath/
// - https://github.com/ChapelR/fairmath
function fairmath(params) {
  const min = params.min || 0;
  const max = params.max || 100;
  const range = max - min;
  const initVal = params.to;
  const baseDelta = params.add;
  const goingUp = baseDelta >= 0;
  const distanceFromEdge = goingUp ? max - initVal : initVal - min;
  const realDelta = (baseDelta / range) * distanceFromEdge;
  const uncappedResult = initVal + realDelta;
  return Math.max(min, Math.min(max, uncappedResult));
}

// Given a classifier function `f` and a list of `xs` to classify,
// return an object keyed by `f(x)` containing the resulting groups.
function groupBy(f, xs) {
  const groups = {};
  for (const x of xs) {
    const k = f(x);
    groups[k] = groups[k] || [];
    groups[k].push(x);
  }
  return groups;
}

// Return a random item from a list.
function randNth(items){
  return items[Math.floor(Math.random()*items.length)];
}

// Return a shuffled copy of a list, leaving the original list unmodified.
function shuffle(items) {
  const newItems = [];
  for (let i = 0; i < items.length; i++) {
    newItems.push(items[i]);
  }
  for (let i = newItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
  }
  return newItems;
}

function sum(xs) {
  return xs.reduce((a, b) => a + b);
}
