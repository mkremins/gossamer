/**
High-level design:
- Every character has their own DB of events/knowledge/etc.
*/

const allChars = {};
const allHomes = [];
const allBusinesses = [];
const allShips = {};
const allActions = {};

const allSiftingPatterns = [
  {
    name: "rudeness unto rudeness",
    find: `[?e1 "type" action] [?e1 "actionType" chat]
           [?e1 "actor" ?rudeChar] [?e1 "target" $ME] [?e1 "tag" "rude"]
           [?e2 "type" "action"] [?e2 "actionType" "chat"]
           [?e2 "actor" ?rudeChar] [?e2 "target" $ME] [?e2 "tag" "rude"]
           [?e3 "type" "action"] [?e3 "actionType" "chat"]
           [?e3 "actor" ?otherChar] [?e3 "target" ?rudeChar] [?e3 "tag" "rude"]`
  }
];

let nextTick = 0;
function doTicks(n) {
  const finalTick = nextTick + n;
  for (; nextTick < finalTick; nextTick++) {
    tick(nextTick);
  }
}

let lastID = -1;
function genID(prefix) {
  lastID += 1;
  return prefix + lastID;
}

function getOrCreateShip(c1, c2) {
  if (typeof c1 !== "string") throw Error("bad char ID " + c1);
  if (typeof c2 !== "string") throw Error("bad char ID " + c2);
  if (!allShips[c1]) allShips[c1] = {};
  if (!allShips[c1][c2]) allShips[c1][c2] = {
    type: "ship", src: c1, dst: c2, directInteractions: 0,
    charge: 0, spark: 0,
    chargeDelta: randNth([-28, -14, -7, -7, 7, 7, 7, 14, 14, 28]),
    sparkDelta: randNth([-28, -14, -14, -7, -7, -7, 7, 7, 14, 28])
  };
  return allShips[c1][c2];
}

function includesAttraction(ship) {
  return ship.spark >= 20;
}

function includesLiking(ship) {
  return ship.charge >= 20;
}

function includesAnimosity(ship) {
  return ship.charge <= -20;
}

function loveInterest(c) {
  return Object.values(allShips[c]).sort((a,b) => { return b.spark - a.spark; })[0];
}

function bestFriend(c) {
  return Object.values(allShips[c]).sort((a,b) => { return b.charge - a.charge; })[0];
}

function worstEnemy(c) {
  return Object.values(allShips[c]).sort((a,b) => { return a.charge - b.charge; })[0];
}

function wouldInviteToHangOut(c1, c2) {
  const ship = getOrCreateShip(c1, c2);
  return includesAttraction(ship) || includesLiking(ship);
}

function directInteractionHistory(c1, c2) {
  return Object.values(allActions).filter(action => {
    return (action.actor === c1 && action.target === c2) ||
           (action.actor === c2 && action.target === c1);
  });
}

function startup(castSize) {
  // Generate some homes. For simplicity we'll assume everyone lives with random housemates,
  // so the assignment of people to homes doesn't have to consider interpersonal relationships.
  for (let i = 0; i < castSize / 3; i++) {
    allHomes.push(genID("H"));
  }

  // Generate some businesses.
  for (let i = 0; i < castSize / 10; i++) {
    allBusinesses.push(genID("B"));
  }

  // Generate two day indices for majority and minority religious observances.
  // If these happen to be the same day it's fine, we'll just treat it as a monoreligious town.
  const majoritySabbath = randNth([5, 6]); // always a weekend day
  const minoritySabbath = randNth([0, 1, 2, 3, 4, 5, 6]); // could be anywhen

  // Generate a cast of characters.
  for (let i = 0; i < castSize; i++) {
    const id = genID("C");
    const char = {type: "char", id: id, home: randNth(allHomes), memories: []};
    allChars[id] = char;

    // Give the character one or two favorite places to hang out.
    const businessA = randNth(allBusinesses);
    const businessB = randNth(allBusinesses);
    char.favHangouts = randNth([
      [char.home], [businessA], [char.home, businessA], [businessA, businessB]
    ]);

    // Generate a schedule that tells the character when to do which things.
    const isStudent = chance(0.5);
    const isWorker = chance(0.75);
    const isReligious = chance(0.25);
    // ...weekday portion of schedule
    const weekdayActivities = ["leisure"];
    if (isStudent) {
      weekdayActivities.push("school");
      weekdayActivities.push("school");
    }
    if (isWorker) {
      weekdayActivities.push("work");
      weekdayActivities.push("work");
    }
    const schedule = [];
    for (let j = 0; j < 5; j++) {
      schedule.push(randNth(weekdayActivities));
    }
    // ...weekend portion of schedule
    const weekendActivities = ["leisure"];
    if (isWorker) weekendActivities.push("work");
    for (let j = 0; j < 2; j++) {
      schedule.push(randNth(weekendActivities));
    }
    // ...religion portion of schedule
    if (isReligious) {
      const sabbath = chance(0.75) ? majoritySabbath : minoritySabbath;
      schedule[sabbath] = "church";
    }
    // ...assign final schedule to char
    char.schedule = schedule;

    // If this character is a worker, assign them a workplace.
    if (isWorker) char.workplace = randNth(allBusinesses);
  }
}

function tick(day) {
  const weekday = day % 7;
  console.log("DAY", day, "WEEKDAY", weekday);

  // PHASE 1: PLACEMENT
  // Generate a whereabouts entry for every character, based on their schedule
  // and on some other stuff in the case of leisure activities.
  // Every item in `whereabouts` is an object with at least:
  // – A `who` key: the ID of the char whose whereabouts this entry describes
  // - A `where` key: the place where this char is located
  const placementPhaseStartTime = performance.now();
  const whereabouts = [];
  for (const char of Object.values(allChars)) {
    const basicActivity = char.schedule[weekday];
    if (basicActivity === "school" || basicActivity === "church") {
      whereabouts.push({who: char.id, where: basicActivity});
    }
    else if (basicActivity === "work") {
      // FIXME Maybe put workers in their workplaces *first*,
      // so that we can check which businesses are staffed later when picking leisure activities?
      whereabouts.push({who: char.id, where: char.workplace, role: "worker"});
    }
    else if (basicActivity === "leisure") {
      // Generate possible invites to hang out:
      // any previously locked-in char who is doing leisure and considers this char a friend.
      // FIXME This is probably slow, maybe remove it if it's causing problems?
      const possibleInvites = whereabouts.filter(wa => {
        return wa.where !== "school" && wa.where !== "church" && wa.role !== "worker"
               && wouldInviteToHangOut(wa.who, char.id);
      });
      // Randomly pick a possible leisure activity to do.
      // FIXME This logic could be made a lot more sophisticated, especially if we introduce
      // character personality traits like extroversion.
      if (possibleInvites.length > 0 && chance(0.5)) {
        // Accept an invitation to hang out.
        // FIXME Stochastically pick one of the top N instead of always going with the strongest?
        const invite = possibleInvites.sort((a, b) => {
          const shipA = getOrCreateShip(char.id, a.who);
          const shipB = getOrCreateShip(char.id, b.who);
          const scoreA = Math.max(shipA.charge, 0) + Math.max(shipA.spark, 0);
          const scoreB = Math.max(shipB.charge, 0) + Math.max(shipB.spark, 0);
          return scoreB - scoreA;
        })[0];
        whereabouts.push({who: char.id, where: invite.where, invitedBy: invite.who});
      }
      else {
        // Head to either a public hangout spot or home.
        // FIXME Personality should probably play a role here too. Some characters will already
        // end up looking like homebodies because they have home as one of their fav places,
        // but ideally there should also be chars that almost *never* stay home.
        let place = char.home; // stay home by default
        if (chance(0.33)) place = randNth(char.favHangouts); // maybe pick one of char's fav places
        else if (chance(0.33)) place = randNth(allBusinesses); // or a random non-home public place
        whereabouts.push({who: char.id, where: place});
      }
    }
    else {
      console.error("bad schedule entry", basicActivity, char, weekday);
    }
  }
  const whereaboutsByPlace = groupBy(wa => wa.where, whereabouts);
  console.log("placement phase took", performance.now() - placementPhaseStartTime, "ms");
  console.log("whereabouts", whereabouts);
  console.log("whereaboutsByPlace", whereaboutsByPlace);

  // PHASE 2: ACTION
  // For every location:
  // - Gather the characters who are there.
  // - Generate actions between them. For now, every character gets to act once.
  const actionPhaseStartTime = performance.now();
  const newActions = [];
  for (const [place, localCast] of Object.entries(whereaboutsByPlace)) {
    const isAlone = localCast.length === 1;
    for (const charInfo of localCast) {
      const char = allChars[charInfo.who];
      const otherCharInfos = localCast.filter(ci => ci.who !== charInfo.who);
      // Things that a character might do:
      if (!isAlone && chance(0.1)) {
        // BROADCAST ACTIONS
        // - Hold forth (tell a story to *everyone*?)
        // - Perform music, if in a performance-compatible venue?
        // TODO
      }
      else if (!isAlone && chance(0.75)) {
        // DYADIC ACTIONS
        // - Make small talk with someone present
        // - Talk with someone present (swap stories?)
        // - Ask someone present a question (receive a story?)
        // - Ramble at someone present (tell a story?)
        // - Flirt with someone present they're attracted to
        // - Implicit: introduction, if this is the first time they've met?
        // - Implicit: invite to hang out, if that's how we got here?
        const ships = otherCharInfos.map(otherCI => getOrCreateShip(char.id, otherCI.who));
        const targetShip = randNth(ships); // FIXME target people we already know more often?
        const action = {
          type: "action", id: genID("A"),
          actionType: "chat", actor: char.id, target: targetShip.dst, place: place, day: day,
          bystanders: otherCharInfos.filter(ci => ci.who !== targetShip.dst).map(ci => ci.who)
        };
        // Figure out the actor's *intended* tone.
        // FIXME Maybe every char should also have a *default tone* that's always added?
        const possibleTones = ["neutral"];
        if (includesAttraction(targetShip)) possibleTones.push("flirty");
        if (includesLiking(targetShip)) possibleTones.push("friendly");
        if (includesAnimosity(targetShip)) possibleTones.push("rude");
        const intendedTones = shuffle(possibleTones).slice(0, chance(0.75) ? 1 : 2);
        action.tags = intendedTones;
        // If this is the first direct interaction between these chars, mark it as an introduction.
        if (targetShip.directInteractions === 0) action.tags.push("introduction");
        // Increment direct interactions counter in both directions,
        // and mark both ships as having just been "refreshed" so we don't decay them this turn.
        targetShip.directInteractions += 1;
        targetShip.wasJustRefreshed = true;
        const reverseShip = getOrCreateShip(targetShip.dst, targetShip.src);
        reverseShip.directInteractions += 1;
        reverseShip.wasJustRefreshed = true;
        // Add this char's action to the list of new actions to process...
        newActions.push(action);
        // ...and to the table of every action ever.
        allActions[action.id] = action;
      }
      else {
        // SOLO ACTIONS
        // - Work diligently if they're in a worker role
        // - Slack off (implicitly, by doing something else?) if they're in a worker role
        // - Laze around if they're at home
        // - Ruminate on memory or story?
        // - Perform the... location-default solo leisure activity???
        // TODO
      }
    }
  }
  console.log("action phase took", performance.now() - actionPhaseStartTime, "ms");
  console.log("newActions", newActions);

  // PHASE 3: OBSERVATION
  // For every action, add memories to present characters.
  // For dyadic actions, also perform default  
  // FIXME This should probably be adjusted to use some sort of salience computation
  // to set the initial strength of each memory, and maybe also as part of deciding
  // which bystanders form a memory of the action in the first place.
  const observationPhaseStartTime = performance.now();
  for (const action of newActions) {
    // Add memory to actor.
    const actorMemory = {
      type: "memory", action: action.id, provenance: "involved", strength: 20,
      actionType: action.actionType, tags: action.tags,
      actor: action.actor, bystanders: action.bystanders,
      place: action.place, day: action.day,
    };
    if (action.target) actorMemory.target = action.target;
    allChars[action.actor].memories.push(actorMemory);
    // Add memory to target, if any.
    if (action.target) {
      const targetMemory = {
        type: "memory", action: action.id, provenance: "involved", strength: 20,
        actionType: action.actionType, actor: action.actor,
        target: action.target, bystanders: action.bystanders,
        place: action.place, day: action.day,
      };
      targetMemory.tags = action.tags; // TODO Maybe mutate tags lightly
      allChars[action.target].memories.push(targetMemory);
    }
    // Stochastically add memory to bystanders, if any.
    for (const bystander of action.bystanders) {
      if (chance(0.5)) continue; // FIXME Use salience to determine chance of witnessing?
      const bystanderMemory = {
        type: "memory", action: action.id, provenance: "bystander",
        strength: 5, // FIXME Use salience to determine initial strength?
        actionType: action.actionType, actor: action.actor,
        target: action.target, bystanders: action.bystanders,
        place: action.place, day: action.day,
      };
      bystanderMemory.tags = action.tags; // TODO Maybe mutate tags lightly
      // FIXME Also maybe swap actor and target rarely?
      allChars[bystander].memories.push(bystanderMemory);
    }
  }
  console.log("observation phase took", performance.now() - observationPhaseStartTime, "ms");

  // PHASE 4: REFLECTION
  // For every character:
  // - Run sifting patterns to update stories.
  // - Update relationship scores based on active memories(/stories)?
  // - Decay charge values, spark values, and memories(/stories).
  const reflectionPhaseStartTime = performance.now();
  for (const char of Object.values(allChars)) {
    // Run sifting patterns to update stories.
    for (const pattern of allSiftingPatterns) { // FIXME Use only this char's patterns?
      // TODO
    }
    // Update relationships.
    for (const ship of Object.values(allShips[char.id] || {})) {
      if (ship.wasJustRefreshed) {
        // If this ship was just refreshed by a direct interaction,
        // adjust charge and spark upward by appropriate amounts.
        ship.charge = fairmath({to: ship.charge, add: ship.chargeDelta, min: -100, max: 100});
        ship.spark = fairmath({to: ship.spark, add: ship.sparkDelta, min: -100, max: 100});
        // Remove the just-refreshed marker for the next timestep.
        delete ship.wasJustRefreshed;
      }
      else {
        // Decay charge toward zero by a constant decay factor, just like Talk of the Town.
        // Technically we're using fairmath, so the decay is proportional to the amount of charge.
        const chargeDecaySign = ship.charge > 0 ? -1 : +1;
        const chargeDecayAmount = 1 * chargeDecaySign;
        ship.charge = fairmath({to: ship.charge, add: chargeDecayAmount, min: -100, max: 100});
        // Decay spark toward zero in the same way.
        // Talk of the Town decays spark *increment* (our `sparkDelta`) rather than spark itself,
        // in order to make romantic feelings emerge quickly and then gradually settle
        // at a persistent level rather than decaying – but IDK if I like this,
        // so I'm making charge and spark decay identically for now.
        const sparkDecaySign = ship.spark > 0 ? -1 : +1;
        const sparkDecayAmount = 1 * sparkDecaySign;
        ship.spark = fairmath({to: ship.spark, add: sparkDecayAmount, min: -100, max: 100});
      }
    }
    // Decay memories. FIXME Stories too?
    char.memories.forEach(mem => mem.strength -= 1);
    char.memories = char.memories.filter(mem => mem.strength > 1);
  }
  console.log("reflection phase took", performance.now() - reflectionPhaseStartTime, "ms");
}