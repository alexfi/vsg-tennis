export function parseScoreInput(
	input: string,
): { games1: number[]; games2: number[] } | null {
	// "-" means a draw — each player/pair gets 1 point
	if (input.trim() === "-") {
		return { games1: [], games2: [] };
	}

	const g1: number[] = [];
	const g2: number[] = [];

	for (const s of input.split(",")) {
		const parts = s.trim().split(":");
		if (parts.length !== 2) return null;

		const a = parseInt(parts[0], 10);
		const b = parseInt(parts[1], 10);
		if (Number.isNaN(a) || Number.isNaN(b)) return null;

		g1.push(a);
		g2.push(b);
	}

	return g1.length > 0 ? { games1: g1, games2: g2 } : null;
}

export function getWinnerIdFromGames(
	player1Id: string,
	player2Id: string,
	player1Games: number[],
	player2Games: number[],
): string | null {
	let p1Sets = 0;
	let p2Sets = 0;

	for (let i = 0; i < player1Games.length; i++) {
		if (player1Games[i] > player2Games[i]) p1Sets++;
		else if (player2Games[i] > player1Games[i]) p2Sets++;
	}

	if (p1Sets === p2Sets) return null;
	return p1Sets > p2Sets ? player1Id : player2Id;
}

export function normalizeScoreForStorage(
	displayPlayer1Id: string,
	displayPlayer2Id: string,
	displayPlayer1Games: number[],
	displayPlayer2Games: number[],
): {
	player1Id: string;
	player2Id: string;
	player1Games: number[];
	player2Games: number[];
	winnerId: string;
} | null {
	const [player1Id, player2Id] = [displayPlayer1Id, displayPlayer2Id].sort();
	const displayP1IsStoredP1 = displayPlayer1Id === player1Id;
	const player1Games = displayP1IsStoredP1
		? displayPlayer1Games
		: displayPlayer2Games;
	const player2Games = displayP1IsStoredP1
		? displayPlayer2Games
		: displayPlayer1Games;
	// Draw: empty games arrays → each player/pair gets 1 point
	if (player1Games.length === 0 && player2Games.length === 0) {
		return {
			player1Id,
			player2Id,
			player1Games: [],
			player2Games: [],
			winnerId: "draw",
		};
	}

	const winnerId = getWinnerIdFromGames(
		player1Id,
		player2Id,
		player1Games,
		player2Games,
	);

	if (!winnerId) return null;

	return { player1Id, player2Id, player1Games, player2Games, winnerId };
}
