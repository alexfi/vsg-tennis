import { useCallback, useMemo } from "react";
import { EditableScore } from "@/components/EditableScore";
import type { DoublesPair } from "@/data/doublesTournament";
import { getPairName, makeDoublesMatchDocId } from "@/data/doublesTournament";
import type { MatchRecord, PlayerStanding } from "@/lib/standings";
import { computeStandings, formatScore } from "@/lib/standings";
import { normalizeScoreForStorage, parseScoreInput } from "@/lib/scores";
import { deleteDoublesMatch, saveDoublesMatch } from "@/hooks/useDoubles";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DoublesFinalStageProps {
	divisionId: string;
	groups: Record<string, DoublesPair[]>;
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
}

type Participant = {
	slot: string;
	pair: DoublesPair | null;
	placeholder: string;
};

type ResolvedResult = {
	winner: Participant;
	loser: Participant;
} | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FINAL_DIVISIONS = new Set(["mix"]);

function makeFinalDocId(divisionId: string, slotId: string): string {
	return `${divisionId}_final_${slotId}`;
}

function hasResult(record: MatchRecord | undefined): record is MatchRecord {
	return (
		!!record && (record.player1Games.length > 0 || record.winnerId === "draw")
	);
}

function allGroupMatchesComplete(
	divisionId: string,
	groups: Record<string, DoublesPair[]>,
	matches: Map<string, MatchRecord>,
): boolean {
	for (const [groupName, pairs] of Object.entries(groups)) {
		for (let i = 0; i < pairs.length; i++) {
			for (let j = i + 1; j < pairs.length; j++) {
				const docId = makeDoublesMatchDocId(
					divisionId,
					groupName,
					pairs[i].id,
					pairs[j].id,
				);
				if (!hasResult(matches.get(docId))) return false;
			}
		}
	}

	return true;
}

function getGroupStandings(
	divisionId: string,
	groups: Record<string, DoublesPair[]>,
	matches: Map<string, MatchRecord>,
	groupName: string,
): PlayerStanding[] {
	const pairs = groups[groupName] ?? [];
	const pairIds = pairs.map((p) => p.id);
	const matchResults: Array<{
		player1Id: string;
		player2Id: string;
		record: MatchRecord;
	}> = [];

	for (let i = 0; i < pairs.length; i++) {
		for (let j = i + 1; j < pairs.length; j++) {
			const p1 = pairs[i];
			const p2 = pairs[j];
			const docId = makeDoublesMatchDocId(divisionId, groupName, p1.id, p2.id);
			const record = matches.get(docId);
			if (hasResult(record)) {
				const [player1Id, player2Id] = [p1.id, p2.id].sort();
				matchResults.push({ player1Id, player2Id, record });
			}
		}
	}

	return computeStandings(pairIds, matchResults);
}

function makeGroupSlot(
	label: string,
	complete: boolean,
	groupPairsByPosition: Map<string, DoublesPair[]>,
): Participant {
	if (!complete) return { slot: label, pair: null, placeholder: label };

	const groupName = label[0];
	const position = Number(label.slice(1));
	const pair = groupPairsByPosition.get(groupName)?.[position - 1] ?? null;

	return { slot: label, pair, placeholder: label };
}

function participantName(participant: Participant): string {
	return participant.pair
		? getPairName(participant.pair)
		: participant.placeholder;
}

function getValidFinalRecord(
	matches: Map<string, MatchRecord>,
	docId: string,
	p1: DoublesPair | null,
	p2: DoublesPair | null,
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
	displayPlayer1: DoublesPair | null,
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
	if (!record || !p1.pair || !p2.pair || record.winnerId === "draw") {
		return null;
	}

	const winner = record.winnerId === p1.pair.id ? p1 : p2;
	const loser = record.winnerId === p1.pair.id ? p2 : p1;

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
		pair: null,
		placeholder: `${prefix} ${sourceLabel}`,
	};
}

// ---------------------------------------------------------------------------
// MatchCard
// ---------------------------------------------------------------------------

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
		player1.pair,
		player2.pair,
	);
	const score = getScoreForDisplay(record, player1.pair);
	const canEdit = !!player1.pair && !!player2.pair;
	const isDraw = record?.winnerId === "draw";
	const winner =
		!isDraw && record?.winnerId === player1.pair?.id ? player1 : player2;
	const loser =
		!isDraw && record?.winnerId === player1.pair?.id ? player2 : player1;

	const handleSave = useCallback(
		async (scoreInput: string) => {
			if (!player1.pair || !player2.pair) return;

			const parsed = parseScoreInput(scoreInput);
			if (!parsed) return;

			const normalized = normalizeScoreForStorage(
				player1.pair.id,
				player2.pair.id,
				parsed.games1,
				parsed.games2,
			);
			if (!normalized) return;

			await saveDoublesMatch(
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
		[docId, label, player1.pair, player2.pair],
	);

	const handleDelete = useCallback(async () => {
		await deleteDoublesMatch(docId);
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
			{record && !isDraw && finalPlaces && winner.pair && loser.pair && (
				<div className="mt-3 grid gap-1 text-xs text-[var(--color-muted-foreground)]">
					<div>
						<span className="font-extrabold text-[var(--color-foreground)]">
							{finalPlaces[0]} vieta:
						</span>{" "}
						{getPairName(winner.pair)}
					</div>
					<div>
						<span className="font-semibold text-[var(--color-foreground)]">
							{finalPlaces[1]} vieta:
						</span>{" "}
						{getPairName(loser.pair)}
					</div>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// PlayerName
// ---------------------------------------------------------------------------

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
				participant.pair
					? "text-[var(--color-foreground)]"
					: "text-[var(--color-muted-foreground)] italic",
			)}
			title={participantName(participant)}
		>
			{participantName(participant)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// PlacementBracket
// ---------------------------------------------------------------------------

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
		first.p1.pair,
		first.p2.pair,
	);
	const secondRecord = getValidFinalRecord(
		matches,
		secondDocId,
		second.p1.pair,
		second.p2.pair,
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

// ---------------------------------------------------------------------------
// DirectPlacementMatch
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DoublesFinalStage
// ---------------------------------------------------------------------------

export function DoublesFinalStage({
	divisionId,
	groups,
	matches,
	isAdmin,
}: DoublesFinalStageProps) {
	const enabled = FINAL_DIVISIONS.has(divisionId);
	const groupStageComplete = useMemo(
		() => allGroupMatchesComplete(divisionId, groups, matches),
		[divisionId, groups, matches],
	);

	const groupPairsByPosition = useMemo(() => {
		const map = new Map<string, DoublesPair[]>();

		for (const groupName of Object.keys(groups)) {
			const standings = getGroupStandings(
				divisionId,
				groups,
				matches,
				groupName,
			);
			const pairsById = new Map(
				groups[groupName].map((pair) => [pair.id, pair]),
			);
			map.set(
				groupName,
				standings
					.map((standing) => pairsById.get(standing.playerId))
					.filter((pair): pair is DoublesPair => !!pair),
			);
		}

		return map;
	}, [divisionId, groups, matches]);

	if (!enabled) return null;

	const slot = (label: string) =>
		makeGroupSlot(label, groupStageComplete, groupPairsByPosition);

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
					divisionId={divisionId}
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

				<PlacementBracket
					title="Vietos 5–8"
					divisionId={divisionId}
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

				<DirectPlacementMatch
					divisionId={divisionId}
					matches={matches}
					isAdmin={isAdmin}
					player1={slot("A5")}
					player2={slot("B5")}
				/>
			</div>
		</section>
	);
}
