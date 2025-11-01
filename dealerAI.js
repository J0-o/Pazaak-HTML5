// ===========================================
// Dealer AI for Pazaak (Command-based)
// ===========================================
// The dealer uses the same command system as
// the player: "play X", "stand", or "end".
// ===========================================

function dealerTakeTurn() {
  if (game.status !== "playing" || game.turn !== "dealer") return;

  const total = sum(game.dealerBoard);
  const playerTotal = sum(game.playerBoard);
  const playerStood = game.standing.player;

  if (game.standing.dealer) {
    ui.log("Dealer already standing.");
    endRoundIfNeeded();
    return;
  }

  // -------------------------------------------
  // Handle Bust
  // -------------------------------------------
  if (total > 20) {
    const hand = game.dealerHand;
    const board = game.dealerBoard;
    let playable = null;
    let bestNewTotal = Infinity;

    for (const card of hand) {
      let newTotal = Infinity;
      let command = null;

      // Negative numeric cards
      if (typeof card === "number" && card < 0) {
        newTotal = total + card;
        command = card;
      }

      // Dual [+/-]X cards (try negative)
      else if (typeof card === "string" && card.startsWith("[+/-]")) {
        const val = parseInt(card.match(/\d+/)[0]);
        newTotal = total - val;
        command = `[-]${val}`;
      }

      // Flip cards
      else if (typeof card === "string" && card.startsWith("[flip")) {
        const flipType = card.includes("2&4") ? [2, 4] : [3, 6];
        const simulated = board.map(v =>
          v > 0 && flipType.includes(Math.abs(v)) ? -v : v
        );
        newTotal = sum(simulated);
        command = card;
      }

      if (newTotal <= 20 && newTotal > 0 && newTotal < bestNewTotal) {
        playable = command;
        bestNewTotal = newTotal;
      }
    }

    // Play best recovery card
    if (playable !== null) {
      ui.log(`Dealer plays ${playable} to recover from bust (new total ${bestNewTotal}).`);
      simulateDealerCommand(`play ${playable}`);

      setTimeout(() => {
        if (bestNewTotal === 20) {
          ui.log("Dealer hits 20 and stands.");
          simulateDealerCommand("stand");
        } else {
          ui.log("Dealer ends turn after recovering from bust.");
          simulateDealerCommand("end");
        }
      }, 600);

      return;
    }

    // No recovery card available
    ui.log(`Dealer ends turn at ${total} (cannot recover from bust).`);
    simulateDealerCommand("end");
    return;
  }

  // -------------------------------------------
  // Handle Exact 20
  // -------------------------------------------
  if (total === 20) {
    simulateDealerCommand("stand");
    return;
  }

  // -------------------------------------------
  // Check for exact 20 from hand
  // -------------------------------------------
  const hit20 = dealerFindCardToHit20(total);
  if (hit20) {
    ui.log(`Dealer plays ${hit20} to reach 20.`);
    simulateDealerCommand(`play ${hit20}`);
    return;
  }

  // -------------------------------------------
  // Player has stood
  // -------------------------------------------
  if (playerStood) {
    // Dealer already winning
    if (total > playerTotal && total <= 20) {
      ui.log(`Dealer stands at ${total} (already higher than player ${playerTotal}).`);
      simulateDealerCommand("stand");
      return;
    }

    // Dealer behind – attempt to beat player
    const beatCard = dealerFindCardToBeatPlayer(total, playerTotal);
    if (beatCard) {
      ui.log(`Dealer plays ${beatCard} to beat player (${playerTotal}).`);
      simulateDealerCommand(`play ${beatCard}`);

      setTimeout(() => {
        const newTotal = sum(game.dealerBoard);
        if (newTotal > playerTotal && newTotal <= 20) {
          ui.log(`Dealer stands at ${newTotal} (beats player ${playerTotal}).`);
          simulateDealerCommand("stand");
        }
      }, 400);
      return;
    }

    // Cannot beat player
    ui.log(`Dealer ends turn at ${total} (cannot safely beat player ${playerTotal}).`);
    simulateDealerCommand("end");
    return;
  }

  // -------------------------------------------
  // Player not yet stood
  // -------------------------------------------
  if (total >= 18 && total < 20) {
    ui.log(`Dealer stands at ${total}.`);
    simulateDealerCommand("stand");
    return;
  }

  if (total >= 14 && total < 18) {
    const play = dealerFindCardToHit20(total);
    if (play) {
      ui.log(`Dealer plays ${play} to reach 20.`);
      simulateDealerCommand(`play ${play}`);
      return;
    }
    ui.log(`Dealer ends turn at ${total} (no card can hit 20).`);
    simulateDealerCommand("end");
    return;
  }

  // Low totals – always end
  if (total <= 13) {
    ui.log(`Dealer ends turn at ${total} (too far to hit 20).`);
    simulateDealerCommand("end");
    return;
  }
}

// ----------------------------------------------------
// Helper Functions
// ----------------------------------------------------

function dealerFindBestCardToUnbust() {
  const hand = game.dealerHand;
  const total = sum(game.dealerBoard);
  const diff = total - 20;

  const neg = hand.find(c => typeof c === "number" && c < 0 && Math.abs(c) <= diff);
  if (neg) return neg;

  const plusMinus = hand.find(c => typeof c === "string" && c.startsWith("[+/-]"));
  if (plusMinus) {
    const val = parseInt(plusMinus.match(/\d+/)[0]);
    if (val <= diff) return `[-]${val}`;
  }

  const flip = hand.find(c => typeof c === "string" && c.startsWith("[flip"));
  if (flip && game.dealerBoard.some(v => [2,3,4,6].includes(Math.abs(v)))) return flip;

  return null;
}

function dealerFindBestPositiveCard(total) {
  const hand = game.dealerHand;
  const diff = 20 - total;

  const pos = hand.filter(c => typeof c === "number" && c > 0 && c <= diff)
                  .sort((a,b)=>a-b)[0];
  if (pos) return pos;

  const plusMinus = hand.find(c => typeof c === "string" && c.startsWith("[+/-]"));
  if (plusMinus) {
    const val = parseInt(plusMinus.match(/\d+/)[0]);
    if (val <= diff) return `[+]${val}`;
  }

  if (hand.includes("[double]")) {
    const last = game.dealerBoard[game.dealerBoard.length - 1];
    if (total - last + last * 2 <= 20) return "[double]";
  }

  return null;
}

function dealerFindCardToHit20(total) {
  const hand = game.dealerHand;
  const diff = 20 - total;

  const pos = hand.find(c => typeof c === "number" && c === diff);
  if (pos) return pos;

  const plusMinus = hand.find(c => typeof c === "string" && c.startsWith("[+/-]"));
  if (plusMinus) {
    const val = parseInt(plusMinus.match(/\d+/)[0]);
    if (val === diff) return `[+]${val}`;
  }

  if (hand.includes("[+/-][1/2]")) {
    if (diff === 1) return "[+][1]";
    if (diff === 2) return "[+][2]";
  }

  return null;
}

function dealerFindCardToBeatPlayer(total, playerTotal) {
  const hand = game.dealerHand;
  const diff = playerTotal - total + 1;

  const pos = hand.find(c => typeof c === "number" && c > 0 && total + c <= 20 && total + c > playerTotal);
  if (pos) return pos;

  const plusMinus = hand.find(c => typeof c === "string" && c.startsWith("[+/-]"));
  if (plusMinus) {
    const val = parseInt(plusMinus.match(/\d+/)[0]);
    if (total + val <= 20 && total + val > playerTotal) return `[+]${val}`;
  }

  if (hand.includes("[+/-][1/2]")) {
    if (total + 1 <= 20 && total + 1 > playerTotal) return "[+][1]";
    if (total + 2 <= 20 && total + 2 > playerTotal) return "[+][2]";
  }

  if (hand.includes("[double]")) {
    const last = game.dealerBoard[game.dealerBoard.length - 1];
    const newTotal = total - last + last * 2;
    if (newTotal <= 20 && newTotal > playerTotal) return "[double]";
  }

  return null;
}

function getCardNumericValue(card, defaultSign = 1) {
  if (typeof card === "number") return card;

  const match = card.match(/\d+/);
  if (!match) return 0;
  const value = parseInt(match[0]);

  if (card.startsWith("[-]")) return -value;
  if (card.startsWith("[+]")) return +value;
  if (card.startsWith("[+/-]")) return defaultSign * value;

  return 0; // non-numeric cards
}

// ----------------------------------------------------
// Command Simulation
// ----------------------------------------------------

function simulateDealerCommand(cmdText) {
  ui.log(`Dealer command: ${cmdText}`);
  processDealerCommand(cmdText);
}

function processDealerCommand(cmdRaw) {
  const [action, ...rest] = cmdRaw.trim().split(" ");
  const value = rest.join(" ").trim();

  if (action === "play") playCard(value);
  else if (action === "stand") stand();
  else if (action === "end") endTurn();
}
