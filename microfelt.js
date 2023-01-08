/// Lightweight preprocessor for Felt-style sifting patterns.
/// Forked from https://github.com/ItsProbablyFine/WAWLT/blob/master/sim/felt.js.

// Within a string, find all substrings that look like Felt logic variables
// (i.e., alphanumeric identifiers prefixed by a ? character).
function findLvars(s) {
  return s.match(/\?[a-zA-Z_][a-zA-Z0-9_]*/g).map(lvar => lvar.substring(1));
}

// Given part of a sifting pattern, return it, wrapping it in quotes if necessary.
function quotewrapIfNeeded(part) {
  if (part[0] === "?") return part;
  if (["true","false","nil"].indexOf(part) > -1) return part;
  if (!Number.isNaN(parseFloat(part))) return part;
  if (part.length >= 2 && part[0] === '"' && part[part.length - 1] === '"') return part;
  return '"' + part + '"';
}

function parseSiftingPatternClause(line) {
  line = line.trim();
  let lvars = distinct(findLvars(line));
  const parts = line.split(/\s+/);
  let clauseStr = line;
  if (line[0] === "(") {
    // Handle complex clause: any of `(or ...)`, `(not ...)`, `(not-join ...)`,
    // `(pred arg*)`, `(rule arg*)`, `(function arg*) result`
    const clauseHead = parts[0].substring(1);
    if (["or", "not", "not-join"].indexOf(clauseHead) > -1) {
      // Don't export lvars from `or`, `not`, `not-join` clauses
      lvars = [];
    }
    /*
    else if (queryRuleNames.indexOf(clauseHead) > -1) {
      // Don't wrap in square brackets
    }
    */
    else {
      clauseStr = "[" + line + "]";
    }
  }
  else {
    // Handle simple clause: `eid attr? value?`
    if (parts.length < 1 || parts.length > 3) {
      console.warn("Invalid query line: " + line);
    }
    clauseStr = "[" + parts.map(quotewrapIfNeeded).join(" ") + "]";
  }
  return {clauseStr: clauseStr, lvars: lvars, original: line};
}

function parseSiftingPattern(lines) {
  const clauses = lines.map(parseSiftingPatternClause);
  let lvars = [];
  for (let clause of clauses) {
    lvars = lvars.concat(clause.lvars);
  }
  lvars = distinct(lvars);
  const findPart = lvars.map(lvar => "?" + lvar).join(" ");
  const wherePart = clauses.map(clause => clause.clauseStr).join();
  const query = `[:find ${findPart} :in $ :where ${wherePart}]`;
  return {lvars, clauses, query, findPart, wherePart};
}
