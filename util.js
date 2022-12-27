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

// Given the DB and an EID, retrieve the corresponding entity as an object.
// This is what `datascript.entity(db, eid)` SHOULD do, but for some reason doesn't.
function getEntity(db, eid) {
  const attrValuePairs = datascript.q("[:find ?a ?v :in $ ?e :where [?e ?a ?v]]", db, eid);
  if (attrValuePairs.length === 0) return null;
  const entity = {":db/id": eid};
  for (const [attr, val] of attrValuePairs) {
    // FIXME This is a little rough because we're trying to infer cardinality
    // without looking at the schema. By default, if we see a single attr
    // multiple times in the same result set, we assume it's cardinality-many
    // and bundle all its values into an array. This is flawed though:
    // for one thing, if a cardinality-many attr happens to have only one
    // value for this entity, we won't correctly wrap that single value
    // in an array, which could break assumptions in calling code.
    // Might be worth investigating whether there's some clean way to retrieve
    // the schema from an arbitrary DataScript DB that still works even if
    // we're using a minified version of DataScript.
    if (entity[attr] && Array.isArray(entity[attr])) {
      entity[attr].push(val);
    }
    else if (entity[attr]) {
      entity[attr] = [entity[attr], val];
    }
    else {
      entity[attr] = val;
    }
  }
  return entity;
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

// Like `randNth`, but biased toward earlier items in the list.
// Higher values of `bias` (default = 1) produce a stronger biasing effect;
// `bias` of 0 behaves identically to `randNth`.
function biasedRandNth(items, bias) {
  bias = bias || 1;
  const r = Math.random();
  let rBiased = r;
  for (let i = 0; i < bias; i++) {
    rBiased *= r; // repeatedly multiply r by itself to bias toward the low end
  }
  return items[Math.floor(rBiased * items.length)];
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

// Given a map like `{outcome: weight}`, returns a randomly chosen `outcome`.
// The likelihood that a particular `outcome` will be chosen is proportional to
// its assigned `weight`.
function weightedChoice(options) {
  const sumOfWeights = sum(Object.values(options));
  const r = Math.random();
  let cumulativeSum = 0;
  for (const [outcome, weight] of Object.entries(options)) {
    cumulativeSum += weight / sumOfWeights;
    if (r <= cumulativeSum) return outcome;
  }
  // Fallback case. Kinda ugly, but should only get here if all weights are zero.
  return randNth(Object.keys(options));
}
