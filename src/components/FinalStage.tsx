import { useCallback, useMemo } from "react";
import { EditableScore } from "@/components/EditableScore";
import type { Division, Player } from "@/data/tournament";
import { makeMatchDocId } from "@/data/tournament";
import type { MatchRecord, PlayerStanding } from "@/lib/standings";
import { computeStandings, formatScore } from "@/lib/standings";
import { normalizeScoreForStorage, parseScoreInput } from "@/lib/scores";
import { deleteMatch, saveMatch } from "@/hooks/useMatches";
import { cn } from "@/lib/utils";

interface FinalStageProps {
	division: Division;
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
}

type Participant = {
	slot: string;
	player: Player | null;
	placeholder: string;
};

type ResolvedResult = {
	winner: Participant;
	loser: Participant;
} | null;

const FINAL_DIVISIONS = new Set(["masters", "mastersLight", "mastersPrincess"]);

function makeFinalDocId(divisionId: string, slotId: string): string {
	return `${divisionId}_final_${slotId}`;
}

function hasResult(record: MatchRecord | undefined): record is MatchRecord {
	return (
		!!record && (record.player1Games.length > 0 || record.winnerId === "draw")
	);
}

function allGroupMatchesComplete(
	division: Division,
	matches: Map<string, MatchRecord>,
): boolean {
	for (const [groupName, players] of Object.entries(division.groups)) {
		for (let i = 0; i < players.length; i++) {
			for (let j = i + 1; j < players.length; j++) {
				const docId = makeMatchDocId(
					division.id,
					groupName,
					players[i].id,
					players[j].id,
				);
				if (!hasResult(matches.get(docId))) return false;
			}
		}
	}

	return true;
}

function getGroupStandings(
	division: Division,
	matches: Map<string, MatchRecord>,
	groupName: string,
): PlayerStanding[] {
	const players = division.groups[groupName] ?? [];
	const playerIds = players.map((p) => p.id);
	const matchResults: Array<{
		player1Id: string;
		player2Id: string;
		record: MatchRecord;
	}> = [];

	for (let i = 0; i < players.length; i++) {
		for (let j = i + 1; j < players.length; j++) {
			const p1 = players[i];
			const p2 = players[j];
			const [player1Id, player2Id] = [p1.id, p2.id].sort();
			const docId = makeMatchDocId(division.id, groupName, p1.id, p2.id);
			const record = matches.get(docId);
			if (hasResult(record)) {
				matchResults.push({ player1Id, player2Id, record });
			}
		}
	}

	return computeStandings(playerIds, matchResults);
}

function makeGroupSlot(
	label: string,
	complete: boolean,
	groupPlayersByPosition: Map<string, Player[]>,
): Participant {
	if (!complete) return { slot: label, player: null, placeholder: label };

	const groupName = label[0];
	const position = Number(label.slice(1));
	const player = groupPlayersByPosition.get(groupName)?.[position - 1] ?? null;

	return { slot: label, player, placeholder: label };
}

function participantName(participant: Participant): string {
	return participant.player?.name ?? participant.placeholder;
}

function getValidFinalRecord(
	matches: Map<string, MatchRecord>,
	docId: string,
	p1: Player | null,
	p2: Player | null,
): MatchRecord | undefined {
	if (!p1 || !p2) return undefined;

	const record = matches.get(docId);
	if (!hasResult(record)) return undefined;

	const [player1Id, player2Id] = [p1.id, p2.id].sort();
	if (record.player1Id !== player1Id || record.player2Id !== player2Id) {
		return undefined;
	}

	return record;
}

function getScoreForDisplay(
	record: MatchRecord | undefined,
	displayPlayer1: Player | null,
): string | null {
	if (!record || !displayPlayer1) return null;

	if (record.winnerId === "draw") return "0:0";

	const rowIsStoredP1 = displayPlayer1.id === record.player1Id;
	const [left, right] = rowIsStoredP1
		? [record.player1Games, record.player2Games]
		: [record.player2Games, record.player1Games];

	return formatScore(left, right);
}

function getMatchResult(
	record: MatchRecord | undefined,
	p1: Participant,
	p2: Participant,
	sourceLabel: string,
): ResolvedResult {
	if (!record || !p1.player || !p2.player || record.winnerId === "draw") {
		return null;
	}

	const winner = record.winnerId === p1.player.id ? p1 : p2;
	const loser = record.winnerId === p1.player.id ? p2 : p1;

	return {
		winner: {
			...winner,
			placeholder: `Winner ${sourceLabel}`,
		},
		loser: {
			...loser,
			placeholder: `Loser ${sourceLabel}`,
		},
	};
}

function derivedParticipant(
	result: ResolvedResult,
	kind: "winner" | "loser",
	sourceLabel: string,
): Participant {
	if (result) return result[kind];

	const prefix = kind === "winner" ? "Winner" : "Loser";
	return {
		slot: `${prefix} ${sourceLabel}`,
		player: null,
		placeholder: `${prefix} ${sourceLabel}`,
	};
}

interface MatchCardProps {
	divisionId: string;
	slotId: string;
	label: string;
	player1: Participant;
	player2: Participant;
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
	finalPlaces?: [number, number];
}

function MatchCard({
	divisionId,
	slotId,
	label,
	player1,
	player2,
	matches,
	isAdmin,
	finalPlaces,
}: MatchCardProps) {
	const docId = makeFinalDocId(divisionId, slotId);
	const record = getValidFinalRecord(
		matches,
		docId,
		player1.player,
		player2.player,
	);
	const score = getScoreForDisplay(record, player1.player);
	const canEdit = !!player1.player && !!player2.player;
	const isDraw = record?.winnerId === "draw";
	const winner =
		!isDraw && record?.winnerId === player1.player?.id ? player1 : player2;
	const loser =
		!isDraw && record?.winnerId === player1.player?.id ? player2 : player1;

	const handleSave = useCallback(
		async (scoreInput: string) => {
			if (!player1.player || !player2.player) return;

			const parsed = parseScoreInput(scoreInput);
			if (!parsed) return;

			const normalized = normalizeScoreForStorage(
				player1.player.id,
				player2.player.id,
				parsed.games1,
				parsed.games2,
			);
			if (!normalized) return;

			await saveMatch(
				docId,
				normalized.player1Games,
				normalized.player2Games,
				normalized.winnerId,
				{
					player1Id: normalized.player1Id,
					player2Id: normalized.player2Id,
					stage: "final",
					label,
				},
			);
		},
		[docId, label, player1.player, player2.player],
	);

	const handleDelete = useCallback(async () => {
		await deleteMatch(docId);
	}, [docId]);

	return (
		<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
			<div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
				{label}
			</div>
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
				<PlayerName participant={player1} />
				<span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
					vs
				</span>
				<PlayerName participant={player2} alignRight />
			</div>
			<div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
				<EditableScore
					score={score}
					isAdmin={isAdmin}
					disabled={!canEdit}
					onSave={handleSave}
					onDelete={handleDelete}
				/>
			</div>
			{record && !isDraw && finalPlaces && winner.player && loser.player && (
				<div className="mt-3 grid gap-1 text-xs text-[var(--color-muted-foreground)]">
					<div>
						<span className="font-extrabold text-[var(--color-foreground)]">
							{finalPlaces[0]} vieta:
						</span>{" "}
						{winner.player.name}
					</div>
					<div>
						<span className="font-semibold text-[var(--color-foreground)]">
							{finalPlaces[1]} vieta:
						</span>{" "}
						{loser.player.name}
					</div>
				</div>
			)}
		</div>
	);
}

function PlayerName({
	participant,
	alignRight = false,
}: {
	participant: Participant;
	alignRight?: boolean;
}) {
	return (
		<div
			className={cn(
				"truncate font-medium",
				alignRight && "text-right",
				participant.player
					? "text-[var(--color-foreground)]"
					: "text-[var(--color-muted-foreground)] italic",
			)}
			title={participantName(participant)}
		>
			{participantName(participant)}
		</div>
	);
}

function PlacementBracket({
	title,
	divisionId,
	matches,
	isAdmin,
	first,
	second,
	placeFinal,
	consolationFinal,
}: {
	title: string;
	divisionId: string;
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
	first: {
		p1: Participant;
		p2: Participant;
		slotId: string;
		label: string;
		source: string;
	};
	second: {
		p1: Participant;
		p2: Participant;
		slotId: string;
		label: string;
		source: string;
	};
	placeFinal: { slotId: string; label: string; places: [number, number] };
	consolationFinal: { slotId: string; label: string; places: [number, number] };
}) {
	const firstDocId = makeFinalDocId(divisionId, first.slotId);
	const secondDocId = makeFinalDocId(divisionId, second.slotId);
	const firstRecord = getValidFinalRecord(
		matches,
		firstDocId,
		first.p1.player,
		first.p2.player,
	);
	const secondRecord = getValidFinalRecord(
		matches,
		secondDocId,
		second.p1.player,
		second.p2.player,
	);
	const firstResult = getMatchResult(
		firstRecord,
		first.p1,
		first.p2,
		first.source,
	);
	const secondResult = getMatchResult(
		secondRecord,
		second.p1,
		second.p2,
		second.source,
	);

	return (
		<section className="space-y-3">
			<h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
				{title}
			</h3>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<MatchCard
					divisionId={divisionId}
					slotId={first.slotId}
					label={first.label}
					player1={first.p1}
					player2={first.p2}
					matches={matches}
					isAdmin={isAdmin}
				/>
				<MatchCard
					divisionId={divisionId}
					slotId={second.slotId}
					label={second.label}
					player1={second.p1}
					player2={second.p2}
					matches={matches}
					isAdmin={isAdmin}
				/>
				<MatchCard
					divisionId={divisionId}
					slotId={placeFinal.slotId}
					label={placeFinal.label}
					player1={derivedParticipant(firstResult, "winner", first.source)}
					player2={derivedParticipant(secondResult, "winner", second.source)}
					matches={matches}
					isAdmin={isAdmin}
					finalPlaces={placeFinal.places}
				/>
				<MatchCard
					divisionId={divisionId}
					slotId={consolationFinal.slotId}
					label={consolationFinal.label}
					player1={derivedParticipant(firstResult, "loser", first.source)}
					player2={derivedParticipant(secondResult, "loser", second.source)}
					matches={matches}
					isAdmin={isAdmin}
					finalPlaces={consolationFinal.places}
				/>
			</div>
		</section>
	);
}

function DirectPlacementMatch({
	divisionId,
	matches,
	isAdmin,
	player1,
	player2,
}: {
	divisionId: string;
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
	player1: Participant;
	player2: Participant;
}) {
	return (
		<section className="space-y-3">
			<h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
				Vietos 9–10
			</h3>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<MatchCard
					divisionId={divisionId}
					slotId="place_9"
					label="Dėl 9 vietos"
					player1={player1}
					player2={player2}
					matches={matches}
					isAdmin={isAdmin}
					finalPlaces={[9, 10]}
				/>
			</div>
		</section>
	);
}

function PrincessPlacementGroup({
	divisionId,
	participants,
	matches,
	isAdmin,
}: {
	divisionId: string;
	participants: Participant[];
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
}) {
	const allResolved = participants.every((p) => p.player);

	const standings = useMemo(() => {
		if (!allResolved) return [];

		const resolvedParticipants = participants.filter(
			(p): p is Participant & { player: Player } => !!p.player,
		);
		if (resolvedParticipants.length !== participants.length) return [];

		const playerIds = resolvedParticipants.map((p) => p.player.id);
		const matchResults: Array<{
			player1Id: string;
			player2Id: string;
			record: MatchRecord;
		}> = [];

		for (let i = 0; i < participants.length; i++) {
			for (let j = i + 1; j < participants.length; j++) {
				const p1 = participants[i];
				const p2 = participants[j];
				if (!p1 || !p2) continue;

				const docId = makeFinalDocId(
					divisionId,
					`5_9_${[p1.slot, p2.slot].sort().join("_vs_")}`,
				);
				const record = getValidFinalRecord(
					matches,
					docId,
					p1.player,
					p2.player,
				);
				if (record?.player1Id && record.player2Id) {
					matchResults.push({
						player1Id: record.player1Id,
						player2Id: record.player2Id,
						record,
					});
				}
			}
		}

		return computeStandings(playerIds, matchResults);
	}, [allResolved, divisionId, matches, participants]);

	const standingMap = useMemo(() => {
		return new Map(standings.map((standing) => [standing.playerId, standing]));
	}, [standings]);

	const sortedParticipants = useMemo<Participant[]>(() => {
		if (!allResolved || standings.length === 0) return participants;

		const byId = new Map(
			participants
				.filter((p): p is Participant & { player: Player } => !!p.player)
				.map((p) => [p.player.id, p]),
		);
		const sorted: Participant[] = [];
		standings.forEach((standing) => {
			const participant = byId.get(standing.playerId);
			if (participant) sorted.push(participant);
		});
		return sorted;
	}, [allResolved, participants, standings]);

	const savePlacementScore = useCallback(
		async (row: Participant, col: Participant, scoreInput: string) => {
			if (!row.player || !col.player) return;

			const parsed = parseScoreInput(scoreInput);
			if (!parsed) return;

			const normalized = normalizeScoreForStorage(
				row.player.id,
				col.player.id,
				parsed.games1,
				parsed.games2,
			);
			if (!normalized) return;

			const docId = makeFinalDocId(
				divisionId,
				`5_9_${[row.slot, col.slot].sort().join("_vs_")}`,
			);

			await saveMatch(
				docId,
				normalized.player1Games,
				normalized.player2Games,
				normalized.winnerId,
				{
					player1Id: normalized.player1Id,
					player2Id: normalized.player2Id,
					stage: "final",
					label: "Masters Princess · Vietos 5–9",
				},
			);
		},
		[divisionId],
	);

	const deletePlacementScore = useCallback(
		async (row: Participant, col: Participant) => {
			const docId = makeFinalDocId(
				divisionId,
				`5_9_${[row.slot, col.slot].sort().join("_vs_")}`,
			);
			await deleteMatch(docId);
		},
		[divisionId],
	);

	return (
		<section className="space-y-3">
			<h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
				Masters Princess · Vietos 5–9
			</h3>
			<div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
				<table className="min-w-max border-separate border-spacing-0">
					<thead>
						<tr>
							<th className="sticky left-0 z-20 w-40 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
								Žaidėjas
							</th>
							{sortedParticipants.map((p) => (
								<th
									key={p.slot}
									className="w-28 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)]"
								>
									{participantName(p)}
								</th>
							))}
							<th className="w-16 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
								Taškai
							</th>
							<th className="w-16 border-b border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
								Vieta
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedParticipants.map((row) => {
							const rowStanding = row.player
								? standingMap.get(row.player.id)
								: null;

							return (
								<tr key={row.slot}>
									<td
										className={cn(
											"sticky left-0 z-10 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-3 text-xs font-semibold shadow-[8px_0_16px_-18px_var(--color-foreground)]",
											row.player
												? "text-[var(--color-foreground)]"
												: "text-[var(--color-muted-foreground)] italic",
										)}
									>
										{participantName(row)}
									</td>
									{sortedParticipants.map((col) => {
										const isDiagonal = row.slot === col.slot;
										if (isDiagonal) {
											return (
												<td
													key={col.slot}
													className="h-12 w-28 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)]/70"
												/>
											);
										}

										const docId = makeFinalDocId(
											divisionId,
											`5_9_${[row.slot, col.slot].sort().join("_vs_")}`,
										);
										const record = getValidFinalRecord(
											matches,
											docId,
											row.player,
											col.player,
										);
										const score = getScoreForDisplay(record, row.player);

										return (
											<td
												key={col.slot}
												className="h-12 w-28 border-b border-r border-[var(--color-border)] bg-[var(--color-card)] p-0"
											>
												<EditableScore
													score={score}
													isAdmin={isAdmin}
													disabled={!row.player || !col.player}
													className="h-12 rounded-none px-1 py-2"
													onSave={(newScore) =>
														savePlacementScore(row, col, newScore)
													}
													onDelete={() => deletePlacementScore(row, col)}
												/>
											</td>
										);
									})}
									<td className="border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] text-center text-sm font-extrabold text-[var(--color-foreground)]">
										{rowStanding?.points ?? 0}
									</td>
									<td className="border-b border-[var(--color-border)] bg-[var(--color-muted)] text-center text-sm font-extrabold text-[var(--color-foreground)]">
										{rowStanding ? rowStanding.position + 4 : "-"}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

export function FinalStage({ division, matches, isAdmin }: FinalStageProps) {
	const enabled = FINAL_DIVISIONS.has(division.id);
	const groupStageComplete = useMemo(
		() => allGroupMatchesComplete(division, matches),
		[division, matches],
	);

	const groupPlayersByPosition = useMemo(() => {
		const map = new Map<string, Player[]>();

		for (const groupName of Object.keys(division.groups)) {
			const standings = getGroupStandings(division, matches, groupName);
			const playersById = new Map(
				division.groups[groupName].map((player) => [player.id, player]),
			);
			map.set(
				groupName,
				standings
					.map((standing) => playersById.get(standing.playerId))
					.filter((player): player is Player => !!player),
			);
		}

		return map;
	}, [division, matches]);

	if (!enabled) return null;

	const slot = (label: string) =>
		makeGroupSlot(label, groupStageComplete, groupPlayersByPosition);

	return (
		<section className="mb-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm sm:p-6">
			<div className="mb-6">
				<h2 className="text-lg font-bold tracking-[-0.03em] text-[var(--color-foreground)]">
					Finalinis etapas
				</h2>
				{!groupStageComplete && (
					<p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
						Dalyviai bus parodyti po visų grupių etapo mačų. Iki tol rodomos
						pozicijos A1, B2 ir t. t.
					</p>
				)}
			</div>
			<div className="space-y-6">
				<PlacementBracket
					title="Vietos 1–4"
					divisionId={division.id}
					matches={matches}
					isAdmin={isAdmin}
					first={{
						p1: slot("A1"),
						p2: slot("B2"),
						slotId: "1_4_sf1",
						label: "Pusfinalis 1",
						source: "A1-B2",
					}}
					second={{
						p1: slot("A2"),
						p2: slot("B1"),
						slotId: "1_4_sf2",
						label: "Pusfinalis 2",
						source: "A2-B1",
					}}
					placeFinal={{
						slotId: "place_1",
						label: "Dėl 1 vietos",
						places: [1, 2],
					}}
					consolationFinal={{
						slotId: "place_3",
						label: "Dėl 3 vietos",
						places: [3, 4],
					}}
				/>

				{division.id !== "mastersPrincess" && (
					<PlacementBracket
						title="Vietos 5–8"
						divisionId={division.id}
						matches={matches}
						isAdmin={isAdmin}
						first={{
							p1: slot("A3"),
							p2: slot("B4"),
							slotId: "5_8_sf1",
							label: "Pusfinalis 1",
							source: "A3-B4",
						}}
						second={{
							p1: slot("A4"),
							p2: slot("B3"),
							slotId: "5_8_sf2",
							label: "Pusfinalis 2",
							source: "A4-B3",
						}}
						placeFinal={{
							slotId: "place_5",
							label: "Dėl 5 vietos",
							places: [5, 6],
						}}
						consolationFinal={{
							slotId: "place_7",
							label: "Dėl 7 vietos",
							places: [7, 8],
						}}
					/>
				)}

				{division.id === "masters" && (
					<DirectPlacementMatch
						divisionId={division.id}
						matches={matches}
						isAdmin={isAdmin}
						player1={slot("A5")}
						player2={slot("B5")}
					/>
				)}

				{division.id === "mastersPrincess" && (
					<PrincessPlacementGroup
						divisionId={division.id}
						matches={matches}
						isAdmin={isAdmin}
						participants={[
							slot("A3"),
							slot("A4"),
							slot("A5"),
							slot("B3"),
							slot("B4"),
						]}
					/>
				)}
			</div>
		</section>
	);
}
