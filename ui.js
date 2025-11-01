// =======================
// Pazaak UI Controller (Incremental Refactor)
// =======================

const ui = {
  debugLog: true,
  console: document.getElementById("console"),
  logPane: document.getElementById("logPane"),
  input: document.getElementById("cmd"),

  // =======================
  // Logging
  // =======================
  log(msg) {
    if (!this.debugLog) return;

    const entry = document.createElement("div");
    entry.style.whiteSpace = "pre-wrap";

    if (msg.startsWith("Dealer") || msg.startsWith("DEALER") || msg.startsWith("=== Dealer")) {
      entry.style.color = "#0af"; // dealer messages
    } else if (msg.startsWith("Player") || msg.startsWith("PLAYER")) {
      entry.style.color = "#0f0"; // player messages
    } else if (msg.startsWith("⚠️")) {
      entry.style.color = "#ff0"; // warnings
    } else {
      entry.style.color = "#ccc"; // default
    }

    entry.textContent = msg;
    this.logPane.appendChild(entry);
    this.logPane.scrollTop = this.logPane.scrollHeight;
  },

  logClear() {
    this.logPane.textContent = "";
  },

  clear() {
    this.console.textContent = "";
    this.logClear();
  },

  mainAdd(msg) {
    this.console.textContent += msg + "\n";
  },

  // =======================
  // Deck Builder Display
  // =======================
  drawDeckBuilder() {
    const pool = [...game.availableCards];

    const normals = pool
      .filter(v => typeof v === "number" && v > 0)
      .sort((a, b) => a - b)
      .map(v => `+${v}`).join(" ");

    const negatives = pool
      .filter(v => typeof v === "number" && v < 0)
      .sort((a, b) => a - b)
      .join(" ");

    const plusMinus = pool
      .filter(v => typeof v === "string" && v.startsWith("[+/-]") && !v.includes("[1/2]"))
      .sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))
      .join(" ");

    const pm12 = pool
      .filter(v => typeof v === "string" && v === "[+/-][1/2]")
      .join(" ");

    const flips = pool
      .filter(v => typeof v === "string" && v.startsWith("[flip"))
      .join(" ");

    const doubles = pool
      .filter(v => typeof v === "string" && v === "[double]")
      .join(" ");

    const tiebreakers = pool
      .filter(v => typeof v === "string" && v === "[tiebreaker]")
      .join(" ");

    const deckDisplay = game.playerSideDeck
      .map(v => (typeof v === "number" ? (v > 0 ? `+${v}` : `${v}`) : v))
      .join(", ");

    this.console.textContent =
`=== SIDE DECK BUILDER ===
Deck (${game.playerSideDeck.length}/10): [${deckDisplay}]

Available cards:
${normals} ${negatives}
${plusMinus}
${pm12}
${flips}
${doubles}
${tiebreakers}

Commands:
  add X           -> add +X card or special card (e.g. add [flip 3&6])
  sub X           -> remove card from your deck
  confirm         -> finalize your 10-card deck
  clear           -> clear your deck and restart
  list / showpool -> show this again
`;
  },

  // =======================
  // Match Display
  // =======================
  drawScreen() {
    const p = sum(game.playerBoard);
    const d = sum(game.dealerBoard);

    this.console.textContent =
`=== Pazaak Match ===
Turn: ${game.turn.toUpperCase()}
Deck: ${game.deck.length} cards left
Score: Player ${game.score.player} - Dealer ${game.score.dealer}

PLAYER:
  Board: [${game.playerBoard.join(", ")}] (${p})
  Hand:  [${game.playerHand.join(", ")}]
  ${game.standing.player ? "STOOD" : ""}

DEALER:
  Board: [${game.dealerBoard.join(", ")}] (${d})
  Hand:  [${game.dealerHand.join(", ")}]
  ${game.standing.dealer ? "STOOD" : ""}

Commands:
  play X          -> play a card (e.g. play [+]3, play [flip 2&4])
  stand           -> stand
  end             -> end turn
  reset           -> restart match
  togglelog       -> toggle debug log visibility
`;

    this.logPane.classList.toggle("hidden", !this.debugLog);
  }
};

// =======================
// Input Command Handler
// =======================
ui.input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const cmdRaw = ui.input.value.trim();
  ui.input.value = "";
  if (!cmdRaw) return;

  // Toggle Debug Log
  if (cmdRaw.toLowerCase() === "togglelog") {
    ui.debugLog = !ui.debugLog;
    ui.drawScreen();
    return;
  }

  const [action, ...rest] = cmdRaw.split(" ");
  const value = rest.join(" ").trim();

  // Difficulty Selection Phase
  if (game.phase === "chooseDifficulty") {
    handleCommand(cmdRaw);
    return;
  }

  // Reset Command
  if (action === "reset") {
    handleCommand("reset");
    return;
  }

  // Deck Builder Phase
  if (game.status === "setup" && game.phase === "deckBuilding") {
    if (action === "add") {
      const val = value.startsWith("[") ? value : parseInt(value);
      if (!val && typeof val !== "string") return ui.log("Invalid card.");
      const idx = game.availableCards.indexOf(val);
      if (idx === -1) return ui.log("That card is not available in the pool.");
      if (game.playerSideDeck.length >= 10) return ui.log("Deck full (10 cards).");
      game.playerSideDeck.push(val);
      game.availableCards.splice(idx, 1);
    }
    else if (action === "sub") {
      const val = value.startsWith("[") ? value : parseInt(value);
      if (!val && typeof val !== "string") return ui.log("Invalid card.");
      const idx = game.playerSideDeck.indexOf(val);
      if (idx === -1) return ui.log("That card isn't in your deck.");
      game.playerSideDeck.splice(idx, 1);
      game.availableCards.push(val);
    }
    else if (action === "confirm") {
      confirmDeck();
      return;
    }
    else if (action === "clear") {
      clearDeck();
      return;
    }
    else if (action === "list" || action === "showpool") {
      // redraw pool
    } 
    else {
      ui.log("Commands: add X | sub X | confirm | clear | list");
    }

    ui.console.textContent = "";
    ui.drawDeckBuilder();
    return;
  }

  // Match Over
  if (game.status === "match over") {
    ui.log("Match over. Type 'reset' to play again.");
    return;
  }

  // Round Over
  if (game.status !== "playing") {
    ui.log("Round over...");
    return;
  }

  // Gameplay Commands
  if (action === "play") playCard(value);
  else if (action === "stand") stand();
  else if (action === "end") endTurn();

  ui.drawScreen();
});

// =======================
// Startup Sequence
// =======================
startGame();

EventBus?.on?.("stateChange", renderGUI);
setInterval(renderGUI, 300);
