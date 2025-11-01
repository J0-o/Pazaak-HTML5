// ============================================================
// KOTOR II – Dealer Deck Presets for Pazaak AI
// ============================================================
// Each entry corresponds to the canonical 10-card side deck
// used by the in-game Pazaak dealers in KOTOR II
// (based on Kotor2_Deck_*.2da definitions).
//
// Legend:
//   +X / -X        = Static numeric cards
//   [+/-]X         = Dual cards (choose + or − when played)
//   [flip 2&4]     = Flips all 2s and 4s on own board
//   [flip 3&6]     = Flips all 3s and 6s on own board
//   [tiebreaker]   = Adds ±1, resolves ties
//   [+/-][1/2]     = Variable ±1 or ±2 card
//   [double]       = Doubles the last card played
// ============================================================

const DealerDecks = {
  Veryeasy: [
    -3, +3, -4, +4, -5, +5, -3, +4, -5, +3,
  ],

  Easy: [
    +1, +2, +3, +4, +5, -6, -4, -3, -2, -1,
  ],

  Average: [
    "[+/-]1", "[+/-]2", +3, +4, +5, "[+/-]5", -6, "[+/-]3", -6, +5,
  ],

  Hard: [
    "[flip 2&4]", "[+/-]2", "[flip 3&6]", +6,
    "[tiebreaker]", "[tiebreaker]",
    "[double]", "[+/-]3", +6, "[flip 2&4]",
  ],

  Veryhard: [
    "[double]", "[double]",
    "[flip 2&4]", "[flip 3&6]",
    "[+/-][1/2]", "[+/-][1/2]",
    "[flip 2&4]", "[tiebreaker]", "[tiebreaker]", "[+/-]1",
  ],
};

// ============================================================
// Helper Function
// ============================================================
// Returns a copy of the dealer deck for the specified difficulty.
// If the difficulty is invalid, defaults to the Average deck.
// ============================================================

function getDealerDeck(difficulty = "Average") {
  const key = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  if (!DealerDecks[key]) {
    console.warn(`Unknown dealer difficulty: ${difficulty}. Defaulting to Average.`);
    return [...DealerDecks.Average];
  }
  return [...DealerDecks[key]];
}
