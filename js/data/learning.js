/**
 * Learning resources.
 *
 * body sections render as article copy. media is reserved for a later
 * video or audio embed and stays null until a file is attached.
 */

function article(partial) {
  return {
    media: { type: null, href: null, caption: "Media slot" },
    ...partial,
  };
}

export const articles = [
  article({
    id: "stable-position",
    title: "Building a stable shooting position",
    category: "Positions",
    level: "Essentials",
    minutes: 7,
    summary: "Bone support, a loaded bipod, a real rear bag, and a natural point of aim you can repeat between stages.",
    sections: [
      {
        heading: "Support the rifle with bone",
        paragraphs: [
          "A stable position is one you can hold without a fight. If your muscles are what keep the reticle on the target, the reticle will leave as soon as you breathe. Elbows, the bipod, and the bag should carry the gun. Your hands steer it.",
          "Start from the ground up. Where your hips and elbows sit decides where the rifle wants to point. Sliding your body an inch is usually faster than muscling the stock.",
        ],
      },
      {
        heading: "Load the bipod and the rear bag",
        paragraphs: [
          "An unloaded bipod is a pivot, not a rest. Lean into it enough that the legs stay planted and the rifle stops bouncing when you run the bolt. The same idea applies on a barricade: put weight into the bag, then into the prop.",
          "The rear bag is there to set elevation and to keep the toe of the stock from wandering. Pinching the bag should move the reticle in a small, predictable arc. If a tiny squeeze throws you off the plate, the bag is too tall, too soft, or you are not straight behind the rifle.",
        ],
      },
      {
        heading: "Natural point of aim",
        paragraphs: [
          "Close your eyes, settle, and open them. If the reticle walked off the target, that is your position talking. Move your body until the rifle rests on the target without you holding it there.",
          "Check it again after you reload or shift a knee. Most blown second shots on a stage are a position that was right for the first target and wrong for the next one.",
        ],
      },
      {
        heading: "A check you can run between stages",
        paragraphs: ["Use the walk to the next bay for this, not the par time."],
        list: [
          "Hips and elbows in the same place you used on the last stage that felt quiet.",
          "Bipod loaded, legs planted, no daylight under the feet if the ground allows it.",
          "Rear bag contacting the stock, not floating under it.",
          "Close your eyes, open them, and fix the body if the reticle moved.",
          "Bolt cycle once on an empty chamber, if the range is cold and the RO allows it, to see whether the rifle stays put.",
        ],
      },
    ],
  }),
  article({
    id: "personal-dope",
    title: "Establishing personal DOPE",
    category: "Data & DOPE",
    level: "Essentials",
    minutes: 8,
    summary: "A dope card you trust is a zero, a velocity, and a handful of confirmed impacts. The solver is the notebook, not the source.",
    sections: [
      {
        heading: "Zero is a reference",
        paragraphs: [
          "DOPE means data on previous engagement. It is a record of what this rifle, this ammo, and this shooter did at a known distance in known air. A 100-yard zero is the start of that record. It is not the record.",
          "Write the zero down with the date, the ammo lot, and the density altitude or at least the temperature and elevation. A zero without conditions is a number you cannot explain later.",
        ],
      },
      {
        heading: "Capture velocity before you trust a solver",
        paragraphs: [
          "A ballistic solver is only as honest as the muzzle velocity you feed it. Chronograph a sample from the lot you will shoot at the match, over a clean muzzle, and throw out the obvious fliers before you average.",
          "If you change lots, powder temperature, or a brake, assume the velocity moved until you measure it. A 20 foot-per-second surprise is a miss at the distances these matches ask for.",
        ],
      },
      {
        heading: "True the curve at distance",
        paragraphs: [
          "Take the solver to a known distance you can hit on demand, ideally past 600 yards if the match goes there. Shoot a small group, measure the actual drop against the prediction, and true the curve the way your solver expects. One confirmed distance is useful. Two are better.",
          "Do this on a day you can read, not in a switching wind you are guessing through. A bad wind call trued into the rifle will haunt every stage after it.",
        ],
      },
      {
        heading: "Write down what the solver cannot see",
        paragraphs: [
          "Your card should carry the corrections you always forget under a clock: the hold for a spinning plate, the difference between a cold bore and a warm one, and the click you need when you shoot from a tall prop instead of prone.",
          "Keep one card in the rifle and one in the pack. Update both the same day. A card that disagrees with itself is worse than no card.",
        ],
      },
      {
        heading: "Before the next match",
        list: [
          "Confirm zero on paper, not on steel.",
          "Check velocity if the ammo or the weather changed.",
          "Look at one distance you have already trued and make sure it still lands.",
          "Record density altitude at the range, not from memory of last month.",
          "Put the card where your support hand can find it without looking away from the stage.",
        ],
      },
    ],
  }),
  article({
    id: "etiquette-and-ro",
    title: "Match etiquette and RO responsibilities",
    category: "Matchcraft",
    level: "Essentials",
    minutes: 8,
    summary: "The range is cold until the RO says otherwise. The shooter runs the rifle. The RO runs the stage.",
    sections: [
      {
        heading: "The line stays cold",
        paragraphs: [
          "A cold range means magazines out, bolts open, and muzzle pointed at the ground or downrange as the stage requires. You do not close the bolt, insert a magazine, or handle ammunition because you are early and bored. You do it when the RO gives that instruction.",
          "If you are unsure whether the line is hot, it is cold. Ask. A question is cheaper than a disqualification.",
        ],
      },
      {
        heading: "What the shooter owns",
        paragraphs: [
          "You own your muzzle, your bolt, your ammunition, and your dope. Show clear when you leave a position. Point the muzzle at the berm while you move, not at the squad, the RO, or your own leg.",
          "Listen to the stage brief all the way through. Targets, no-shoots, starting position, and the round count are part of the course of fire. Missing them is not a scoring problem the RO is required to fix after the beep.",
        ],
      },
      {
        heading: "What the RO owns",
        paragraphs: [
          "The range officer runs the stage. They give the brief, start the shooter, watch the muzzle and the bolt, and make the safety calls. They are not a coach unless the match rules say coaching is allowed and the shooter asked for it.",
          "If you are asked to RO, your job is a safe, fair stage. Stand where you can see the muzzle and the shooter. Use the same commands for every person on the squad. Stop the stage the moment a muzzle gets unsafe. Score what happened, not what the shooter meant.",
        ],
      },
      {
        heading: "Squad behavior",
        paragraphs: [
          "Stay with your squad. Spot if the rules allow it and you were asked. Help paste and reset when it is your turn. Do not walk into the next squad's stage to look at the props while they are shooting.",
          "Keep stage talk useful. A loud postmortem on someone else's miss, in their ear, helps nobody. Save the film study for the parking lot.",
        ],
      },
      {
        heading: "Things that end a stage early",
        list: [
          "A muzzle that sweeps the squad, the RO, or yourself.",
          "A round fired after the cease-fire or before the start.",
          "A bolt that closes or a magazine that seats during a cold range.",
          "An argument with the RO instead of a question to the match director.",
          "Gear left where the next shooter will trip on it.",
        ],
      },
    ],
  }),
  article({
    id: "reading-wind",
    title: "Reading wind for a precision rifle match",
    category: "Fundamentals",
    level: "Mid Level",
    minutes: 7,
    summary: "Wind is a vector across the whole flight. Mirage, vegetation, and your last impact each tell a different part of it.",
    sections: [
      {
        heading: "One number is not the wind",
        paragraphs: [
          "A flag at the firing line tells you the wind at the firing line. The bullet spends the rest of its flight somewhere else. Full-value wind at 90 degrees pushes more than a headwind or a tailwind of the same speed. Direction and speed both belong in the call.",
          "Pick a method and finish it. A switch between mils and MOA, or between a hold and a dial, in the middle of a par time is how a good read becomes a miss.",
        ],
      },
      {
        heading: "Three sources",
        paragraphs: [
          "Mirage is the most honest source when you can see it. Watch it through the optic at the target, not at the horizon in general. Vegetation shows you gusts the mirage averages out. Your last impact is history, useful if the condition has not changed and misleading if it has.",
          "On stages with no mirage, use the nearest vegetation to the target and a flag you trust, then commit. Waiting for a perfect read is a zero on the clock.",
        ],
      },
      {
        heading: "Near wind and far wind",
        paragraphs: [
          "Wind near the muzzle moves the bullet for the rest of the flight, so it often matters more than the same wind at the target. A strong flag in your face and still grass at the plate usually means you should respect the near wind and not cancel it out.",
          "The reverse is also true. A sheltered firing point in front of an open valley will lie to you. Look downrange before you look at your sleeve.",
        ],
      },
      {
        heading: "Hold, dial, or bracket",
        paragraphs: [
          "Dial when you have time and the wind is steady enough to deserve a number. Hold when the stage is fast or the wind is moving inside a range you can see in the reticle. Bracket when you do not know: take the left edge of the plate and the right edge of your uncertainty, and put the first shot somewhere you can correct from.",
          "Write the call down if the stage lets you shoot it twice in practice. The point of practice wind is a record, not a feeling.",
        ],
      },
    ],
  }),
  article({
    id: "barricade-positions",
    title: "Barricades and awkward positions",
    category: "Positions",
    level: "Mid Level",
    minutes: 6,
    summary: "Build the position before you break the shot. Fill the gaps, load the prop, and accept a wobble zone you can live with.",
    sections: [
      {
        heading: "The position comes first",
        paragraphs: [
          "On a barricade, the points are in the setup. A shooter who spends half the clock getting stable and then fires clean beats a shooter who dumps a magazine from a hover. Get the rifle supported, get the natural point of aim, then speed up.",
          "Look at the prop during the walk-through. Decide where the bag goes and which foot you will stand on. Inventing that after the beep is how rifles fall off ladders.",
        ],
      },
      {
        heading: "Fill gaps, then load",
        paragraphs: [
          "A hard edge under the forend is a pivot. A bag that fills the gap between the rifle and the prop turns it into a rest. Squeeze the bag to steer small amounts. Do not steer by lifting the rifle off the prop.",
          "Load into the prop the way you load a bipod. If the rifle taps the barricade every time you cycle, you are not heavy enough on it, or the bag is stacked so high that the contact is a point instead of a patch.",
        ],
      },
      {
        heading: "Live with a wobble zone",
        paragraphs: [
          "Some props will not go still. Your job is to make the wobble small and rhythmic, and to break the shot inside it. Chasing a frozen reticle on a rope ladder costs the rest of the stage.",
          "If the wobble is larger than the target, change the position. A lower rung, a knee on the ground, or a different corner of the same prop is often enough.",
        ],
      },
      {
        heading: "Props you will see",
        list: [
          "Tank traps and ladders: pick the rung that lets your shoulders stay level.",
          "Rooftops: watch the muzzle. It is easy to point it short of the berm when you stand up.",
          "Windows: build for the shoulder you actually shoot from. The brief will not move the wall.",
          "Slings and poles: these are braces. They are not benches, and they punish a hard grip.",
        ],
      },
    ],
  }),
  article({
    id: "stage-planning",
    title: "Stage briefs and planning",
    category: "Matchcraft",
    level: "Essentials",
    minutes: 6,
    summary: "The brief is part of the stage. Count the targets, plan the movement, and decide where you will spend the time.",
    sections: [
      {
        heading: "Listen to the whole brief",
        paragraphs: [
          "The RO's brief tells you the start position, the round count, the target count, what happens on a miss, and which props you may use. Shooters lose points by shooting an extra round, skipping a required position, or engaging a no-shoot they would have seen if they had looked up.",
          "Ask the question before you step to the line. A clarification is normal. A debate after the stage is a scoring review, and it has a process.",
        ],
      },
      {
        heading: "Count three things",
        paragraphs: [
          "Count targets, positions, and movement. If the stage is ten shots and two positions, decide how many shots live in each place before you start. A plan of 'I will see how it goes' spends the first twenty seconds on admin.",
          "Pick the first shot on purpose. It should be a target you can hit cleanly, so the stage starts with information instead of a hole in the score. Pick the last position too, so you do not arrive there with one second and an empty plan.",
        ],
      },
      {
        heading: "Spend time on purpose",
        paragraphs: [
          "Par time is a budget. A stable long shot may deserve fifteen seconds. A close KYL plate may deserve two. Saying that out loud in practice, then checking it against the score, is how you stop rushing the shot that mattered and nursing the one that did not.",
          "If you fall behind, drop the target that costs the most time, not the one that is closest to your last miss. Leaving a single hard plate to make the rest of the stage is often the higher score.",
        ],
      },
      {
        heading: "After the stage",
        list: [
          "Clear and show clear before you tell the story of the stage.",
          "Write one note: the wind call, the zero that felt off, or the position you will actually practice.",
          "Reset props the way you found them.",
          "Save the video review for after the squad is done shooting.",
        ],
      },
    ],
  }),
  article({
    id: "confirming-zero",
    title: "Confirming zero before a match",
    category: "Data & DOPE",
    level: "Essentials",
    minutes: 5,
    summary: "Confirm on paper, note the cold bore, and do not let a 100-yard zero stand in for the distance you will actually shoot.",
    sections: [
      {
        heading: "When to confirm",
        paragraphs: [
          "Confirm zero when the rifle has traveled, when you switched ammo, when you removed the scope, and when the match is the first one of the season. A bump in a case is enough. A feeling that it is probably fine is not a confirmation.",
          "Paper tells you where the group is. Steel tells you that you hit steel. Use paper for the zero and steel for the dope check that follows.",
        ],
      },
      {
        heading: "Cold bore and settled zero",
        paragraphs: [
          "The first shot from a clean, cold bore is often not the center of the group you will shoot on stage three. If you care about that first shot, record it separately. Do not chase the turret to it and then wonder why the warm rifle prints somewhere else.",
          "Let the barrel cool if you are confirming a true zero. A string of ten, fired fast, at 100 yards, measures your hurry as much as it measures the rifle.",
        ],
      },
      {
        heading: "Do not stop at 100",
        paragraphs: [
          "A confirmed 100-yard zero can still be wrong at 600 if the velocity, the density altitude, or the truing distance is stale. If the match has a long bay, put at least a few shots on paper or on a known plate at a distance that resembles it.",
          "If you cannot get that distance before the match, say so in your notes and trust the card you trued last time, with the density altitude updated. Guessing a new number on the firing line is a different sport.",
        ],
      },
      {
        heading: "What to write down",
        list: [
          "Date, range, ammo lot, and the zero you confirmed.",
          "Cold-bore offset, if you measured one.",
          "Temperature, elevation, and density altitude.",
          "Anything you changed: torque, brake, cheek piece, or a new lot.",
          "The next distance you still owe this rifle.",
        ],
      },
    ],
  }),
];
