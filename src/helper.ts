import { Participant } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns mapping array where each element has {from, to}
export function generateValidMapping(
  participants: Participant[]
): { from: Participant; to: Participant }[] | null {
  const n = participants.length;
  // Simple approach: shuffle until no one maps to themselves. With small n this is fine.
  // For larger n this still fast; we cap attempts.
  const MAX_ATTEMPTS = 2000;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffled = shuffle(participants);
    let valid = true;
    for (let i = 0; i < n; i++) {
      if (participants[i].id === shuffled[i].id) {
        valid = false;
        break;
      }
    }
    if (valid) {
      const mapping: { from: Participant; to: Participant }[] = [];
      for (let i = 0; i < n; i++)
        mapping.push({ from: participants[i], to: shuffled[i] });
      return mapping;
    }
  }
  return null;
}
