export interface MatchRecord {
	/** Alphabetically-first player's games per set (e.g., [6, 6]) */
	player1Games: number[];
	/** Alphabetically-second player's games per set (e.g., [4, 1]) */
	player2Games: number[];
	winnerId: string;
	/** Stored player IDs for slot-based final-stage documents. */
	player1Id?: string;
	player2Id?: string;
	stage?: "group" | "final";
	label?: string;
}

/** Format games arrays into a score string (e.g., [6,6],[4,1] → "6:4, 6:1") */
export function formatScore(games1: number[], games2: number[]): string {
	if (games1.length === 0 && games2.length === 0) return "0:0";
	return games1.map((g, i) => `${g}:${games2[i]}`).join(", ");
}

export interface PlayerStanding {
	playerId: string;
	points: number;
	wins: number;
	losses: number;
	setsWon: number;
	setsLost: number;
	gamesWon: number;
	gamesLost: number;
	position: number;
}

export function computeStandings(
	playerIds: string[],
	matchResults: Array<{
		player1Id: string; // alphabetically first
		player2Id: string; // alphabetically second
		record: MatchRecord;
	}>,
): PlayerStanding[] {
	// Initialize
	const map = new Map<string, PlayerStanding>();
	const h2h = new Map<string, Set<string>>();

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
		});
		h2h.set(pid, new Set());
	}

	for (const { player1Id, player2Id, record } of matchResults) {
		const p1 = map.get(player1Id);
		const p2 = map.get(player2Id);
		if (!p1 || !p2) continue;

		const winnerId = record.winnerId;

		// Draw: both players/pairs get 1 point each, no wins/losses
		if (winnerId === "draw") {
			p1.points += 1;
			p2.points += 1;
			continue;
		}

		const loserId = winnerId === player1Id ? player2Id : player1Id;
		const winner = map.get(winnerId)!;
		const loser = map.get(loserId)!;

		// Points: 2 for win, 1 for loss
		winner.points += 2;
		loser.points += 1;
		winner.wins += 1;
		loser.losses += 1;
		h2h.get(winnerId)!.add(loserId);

		// Use structured arrays directly
		const p1gm = record.player1Games;
		const p2gm = record.player2Games;
		let p1SetsWon = 0;
		let p2SetsWon = 0;
		let p1Games = 0;
		let p2Games = 0;

		for (let i = 0; i < p1gm.length; i++) {
			p1Games += p1gm[i];
			p2Games += p2gm[i];
			if (p1gm[i] > p2gm[i]) p1SetsWon++;
			else if (p2gm[i] > p1gm[i]) p2SetsWon++;
		}

		// Assign to winner/loser
		const winnerIsP1 = winnerId === player1Id;
		winner.setsWon += winnerIsP1 ? p1SetsWon : p2SetsWon;
		winner.setsLost += winnerIsP1 ? p2SetsWon : p1SetsWon;
		winner.gamesWon += winnerIsP1 ? p1Games : p2Games;
		winner.gamesLost += winnerIsP1 ? p2Games : p1Games;

		loser.setsWon += winnerIsP1 ? p2SetsWon : p1SetsWon;
		loser.setsLost += winnerIsP1 ? p1SetsWon : p2SetsWon;
		loser.gamesWon += winnerIsP1 ? p2Games : p1Games;
		loser.gamesLost += winnerIsP1 ? p1Games : p2Games;
	}

	const standings = Array.from(map.values());

	// Sort: Points -> Head-to-Head -> Set Diff -> Game Diff
	standings.sort((a, b) => {
		if (b.points !== a.points) return b.points - a.points;
		const aBeatB = h2h.get(a.playerId)?.has(b.playerId) ?? false;
		const bBeatA = h2h.get(b.playerId)?.has(a.playerId) ?? false;
		if (aBeatB && !bBeatA) return -1;
		if (bBeatA && !aBeatB) return 1;
		const setDiffA = a.setsWon - a.setsLost;
		const setDiffB = b.setsWon - b.setsLost;
		if (setDiffB !== setDiffA) return setDiffB - setDiffA;
		const gameDiffA = a.gamesWon - a.gamesLost;
		const gameDiffB = b.gamesWon - b.gamesLost;
		return gameDiffB - gameDiffA;
	});

	standings.forEach((s, i) => {
		s.position = i + 1;
	});

	return standings;
}
