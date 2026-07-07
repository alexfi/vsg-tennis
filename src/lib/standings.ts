export interface MatchRecord {
  score: string
  winnerId: string
}

export interface PlayerStanding {
  playerId: string
  points: number
  wins: number
  losses: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  position: number
}

/**
 * Parse a single set score like "6:4". Returns { left, right }.
 * By convention, "left" is always the alphabetically-first player's games.
 */
function parseSet(setStr: string): { left: number; right: number } | null {
  const parts = setStr.trim().split(":")
  if (parts.length !== 2) return null
  const left = parseInt(parts[0], 10)
  const right = parseInt(parts[1], 10)
  if (isNaN(left) || isNaN(right)) return null
  return { left, right }
}

export function computeStandings(
  playerIds: string[],
  matchResults: Array<{
    player1Id: string  // alphabetically first
    player2Id: string  // alphabetically second
    record: MatchRecord
  }>
): PlayerStanding[] {
  // Initialize
  const map = new Map<string, PlayerStanding>()
  const h2h = new Map<string, Set<string>>()

  for (const pid of playerIds) {
    map.set(pid, {
      playerId: pid,
      points: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      position: 0,
    })
    h2h.set(pid, new Set())
  }

  for (const { player1Id, player2Id, record } of matchResults) {
    const p1 = map.get(player1Id)
    const p2 = map.get(player2Id)
    if (!p1 || !p2) continue

    const winnerId = record.winnerId
    const loserId = winnerId === player1Id ? player2Id : player1Id
    const winner = map.get(winnerId)!
    const loser = map.get(loserId)!

    // Points
    winner.points += 1
    winner.wins += 1
    loser.losses += 1
    h2h.get(winnerId)!.add(loserId)

    // Parse sets. Left = player1's games, Right = player2's games
    const sets = record.score.split(",").map((s) => s.trim()).filter(Boolean)
    let p1SetsWon = 0
    let p2SetsWon = 0
    let p1Games = 0
    let p2Games = 0

    for (const setStr of sets) {
      const parsed = parseSet(setStr)
      if (!parsed) continue
      p1Games += parsed.left
      p2Games += parsed.right
      if (parsed.left > parsed.right) p1SetsWon++
      else if (parsed.right > parsed.left) p2SetsWon++
    }

    // Assign to winner/loser
    const winnerIsP1 = winnerId === player1Id
    winner.setsWon += winnerIsP1 ? p1SetsWon : p2SetsWon
    winner.setsLost += winnerIsP1 ? p2SetsWon : p1SetsWon
    winner.gamesWon += winnerIsP1 ? p1Games : p2Games
    winner.gamesLost += winnerIsP1 ? p2Games : p1Games

    loser.setsWon += winnerIsP1 ? p2SetsWon : p1SetsWon
    loser.setsLost += winnerIsP1 ? p1SetsWon : p2SetsWon
    loser.gamesWon += winnerIsP1 ? p2Games : p1Games
    loser.gamesLost += winnerIsP1 ? p1Games : p2Games
  }

  const standings = Array.from(map.values())

  // Sort: Points -> Head-to-Head -> Set Diff -> Game Diff
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const aBeatB = h2h.get(a.playerId)?.has(b.playerId) ?? false
    const bBeatA = h2h.get(b.playerId)?.has(a.playerId) ?? false
    if (aBeatB && !bBeatA) return -1
    if (bBeatA && !aBeatB) return 1
    const setDiffA = a.setsWon - a.setsLost
    const setDiffB = b.setsWon - b.setsLost
    if (setDiffB !== setDiffA) return setDiffB - setDiffA
    const gameDiffA = a.gamesWon - a.gamesLost
    const gameDiffB = b.gamesWon - b.gamesLost
    return gameDiffB - gameDiffA
  })

  standings.forEach((s, i) => {
    s.position = i + 1
  })

  return standings
}
