import type { GameState, Side, ThrowEvent } from './types';

export function createGame(): GameState {
  return {
    glasses: [true, true, true, true, true],
    losses: { player: 0, opponent: 0 },
    thrower: 'player',
    duelActive: false,
    starter: 'player',
    gameOver: false,
    winner: null,
  };
}

export function other(side: Side): Side {
  return side === 'player' ? 'opponent' : 'player';
}

/**
 * The glass each side aims at: the remaining glass closest to the opponent.
 * - Player aims at the highest remaining index.
 * - Opponent aims at the lowest remaining index.
 */
export function targetIndexFor(state: GameState, side: Side): number | null {
  if (side === 'player') {
    for (let i = state.glasses.length - 1; i >= 0; i--) if (state.glasses[i]) return i;
  } else {
    for (let i = 0; i < state.glasses.length; i++) if (state.glasses[i]) return i;
  }
  return null;
}

/**
 * The glass closest to a given side (used to find which glass disappears
 * after that side loses a round — the loser's own nearest glass).
 */
function nearestGlassToSide(state: GameState, side: Side): number {
  if (side === 'player') {
    for (let i = 0; i < state.glasses.length; i++) if (state.glasses[i]) return i;
  } else {
    for (let i = state.glasses.length - 1; i >= 0; i--) if (state.glasses[i]) return i;
  }
  return -1;
}

export function resolveThrow(state: GameState, hit: boolean): ThrowEvent {
  if (state.gameOver) throw new Error('game already over');
  const thrower = state.thrower;
  const targetIndex = targetIndexFor(state, thrower)!;

  if (hit) {
    const duelStarted = !state.duelActive;
    state.duelActive = true;
    state.thrower = other(thrower);
    return {
      kind: 'hit',
      thrower,
      targetIndex,
      nextThrower: state.thrower,
      duelStarted,
    };
  }

  // miss
  if (!state.duelActive) {
    state.thrower = other(thrower);
    return { kind: 'turnPass', missedBy: thrower, nextThrower: state.thrower };
  }

  // miss during duel — thrower loses the round
  const loser = thrower;
  const winner = other(loser);
  const removedGlassIndex = nearestGlassToSide(state, loser);
  state.glasses[removedGlassIndex] = false;
  state.losses[loser] += 1;

  if (state.losses[loser] >= 3) {
    state.gameOver = true;
    state.winner = winner;
    return { kind: 'gameOver', loser, winner, removedGlassIndex };
  }

  state.duelActive = false;
  state.starter = loser;
  state.thrower = loser;
  return { kind: 'roundLost', loser, winner, removedGlassIndex, nextStarter: loser };
}
