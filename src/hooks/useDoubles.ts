import { useCallback, useEffect, useState } from "react";
import {
	Timestamp,
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
	DoublesDivision,
	DoublesPair,
	DrawEvent,
	DrawState,
	PairingPhaseConfig,
} from "@/data/doublesTournament";
import { DOUBLES_TOURNAMENT_DATA } from "@/data/doublesTournament";
import type { MatchRecord } from "@/lib/standings";

const EMPTY_DRAW_STATE: DrawState = { status: "draft", pairs: [], events: [] };

function drawDocRef(divisionId: string) {
	return doc(
		db,
		"tournaments",
		DOUBLES_TOURNAMENT_DATA.id,
		"draws",
		divisionId,
	);
}

function matchesCollectionRef() {
	return collection(db, "tournaments", DOUBLES_TOURNAMENT_DATA.id, "matches");
}

function matchDocRef(docId: string) {
	return doc(db, "tournaments", DOUBLES_TOURNAMENT_DATA.id, "matches", docId);
}

function parseDrawState(data: Record<string, unknown> | undefined): DrawState {
	if (!data) return EMPTY_DRAW_STATE;
	return {
		status: data.status as DrawState["status"],
		pairs: Array.isArray(data.pairs) ? (data.pairs as DoublesPair[]) : [],
		groups:
			typeof data.groups === "object" && data.groups !== null
				? (data.groups as Record<string, string[]>)
				: undefined,
		events: Array.isArray(data.events) ? (data.events as DrawEvent[]) : [],
	};
}

function pairCountBeforePhase(
	division: DoublesDivision,
	phaseId: string,
): number {
	let count = 0;
	for (const phase of division.phases) {
		if (phase.id === phaseId) return count;
		count += phase.seeded.length;
	}
	return count;
}

function getPairsForPhase(
	division: DoublesDivision,
	phase: PairingPhaseConfig,
	pairs: DoublesPair[],
): DoublesPair[] {
	const start = pairCountBeforePhase(division, phase.id) + 1;
	const end = start + phase.seeded.length - 1;
	return pairs.filter(
		(pair) => pair.drawOrder >= start && pair.drawOrder <= end,
	);
}

function randomItem<T>(items: T[]): T | undefined {
	if (items.length === 0) return undefined;
	return items[Math.floor(Math.random() * items.length)];
}

function makePairId(phase: PairingPhaseConfig, drawOrder: number): string {
	return `${phase.pairIdPrefix}_${drawOrder}`;
}

function makeEventBase(type: DrawEvent["type"], order: number): DrawEvent {
	return { type, order, createdAt: Timestamp.now() };
}

export function useDoublesDraw(divisionId: string): {
	drawState: DrawState;
	loading: boolean;
	createNextPair: (
		division: DoublesDivision,
		phase: PairingPhaseConfig,
	) => Promise<void>;
	assignNextMixGroup: (division: DoublesDivision) => Promise<void>;
	resetDraw: () => Promise<void>;
} {
	const [drawState, setDrawState] = useState<DrawState>(EMPTY_DRAW_STATE);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		const unsub = onSnapshot(drawDocRef(divisionId), (snapshot) => {
			setDrawState(parseDrawState(snapshot.data()));
			setLoading(false);
		});

		return () => unsub();
	}, [divisionId]);

	const createNextPair = useCallback(
		async (division: DoublesDivision, phase: PairingPhaseConfig) => {
			const existingPairs = drawState.pairs ?? [];
			const phasePairs = getPairsForPhase(division, phase, existingPairs);
			const seededPlayerId = phase.seeded[phasePairs.length];
			if (!seededPlayerId) return;

			const alreadyDrawn = new Set(phasePairs.map((pair) => pair.player2Id));
			const fixedDrawPlayerId = phase.fixedDraws?.[seededPlayerId];
			const fixedDrawPlayerIds = new Set(Object.values(phase.fixedDraws ?? {}));
			const remainingDrawPlayers = phase.draw.filter(
				(playerId) =>
					!alreadyDrawn.has(playerId) &&
					(fixedDrawPlayerId === playerId || !fixedDrawPlayerIds.has(playerId)),
			);
			const drawnPlayerId = fixedDrawPlayerId
				? remainingDrawPlayers.find(
						(playerId) => playerId === fixedDrawPlayerId,
					)
				: randomItem(remainingDrawPlayers);
			if (!drawnPlayerId) return;

			const drawOrder =
				pairCountBeforePhase(division, phase.id) + phasePairs.length + 1;
			const pair: DoublesPair = {
				id: makePairId(phase, drawOrder),
				player1Id: seededPlayerId,
				player2Id: drawnPlayerId,
				drawOrder,
			};
			const events: DrawEvent[] = [
				...(drawState.events ?? []),
				{
					...makeEventBase("pair_created", drawOrder),
					phaseId: phase.id,
					pairId: pair.id,
					seededPlayerId,
					drawnPlayerId,
				},
			];
			const expectedPairs = division.phases.reduce(
				(sum, phaseConfig) => sum + phaseConfig.seeded.length,
				0,
			);
			const nextPairs = [...existingPairs, pair].sort(
				(a, b) => a.drawOrder - b.drawOrder,
			);
			const status = nextPairs.length >= expectedPairs ? "complete" : "drawing";

			await setDoc(
				drawDocRef(division.id),
				{
					status,
					pairs: nextPairs,
					groups: drawState.groups ?? null,
					events,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);
		},
		[drawState],
	);

	const assignNextMixGroup = useCallback(
		async (division: DoublesDivision) => {
			const pairs = [...(drawState.pairs ?? [])].sort(
				(a, b) => a.drawOrder - b.drawOrder,
			);
			const assignedPairIds = new Set(
				Object.values(drawState.groups ?? {}).flatMap((pairIds) => pairIds),
			);
			const nextPair = pairs.find((pair) => !assignedPairIds.has(pair.id));
			if (!nextPair) return;

			const order = nextPair.drawOrder;
			const groupName =
				order <= 5
					? order % 2 === 1
						? "A"
						: "B"
					: order % 2 === 1
						? "A"
						: "B";
			const nextGroups = {
				A: [...(drawState.groups?.A ?? [])],
				B: [...(drawState.groups?.B ?? [])],
			};
			nextGroups[groupName].push(nextPair.id);

			const events: DrawEvent[] = [
				...(drawState.events ?? []),
				{
					...makeEventBase("pair_assigned_to_group", order),
					pairId: nextPair.id,
					groupName,
				},
			];

			await setDoc(
				drawDocRef(division.id),
				{
					status: "complete",
					pairs,
					groups: nextGroups,
					events,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);
		},
		[drawState],
	);

	const resetDraw = useCallback(async () => {
		await deleteDoc(drawDocRef(divisionId));
	}, [divisionId]);

	return { drawState, loading, createNextPair, assignNextMixGroup, resetDraw };
}

export function useDoublesMatches(divisionId: string): {
	matches: Map<string, MatchRecord>;
	loading: boolean;
	hasResults: boolean;
} {
	const [matches, setMatches] = useState<Map<string, MatchRecord>>(new Map());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		const unsub = onSnapshot(matchesCollectionRef(), (snapshot) => {
			const map = new Map<string, MatchRecord>();
			snapshot.forEach((matchDoc) => {
				const docId = matchDoc.id;
				if (!docId.startsWith(`${divisionId}_`)) return;
				const data = matchDoc.data();
				map.set(docId, {
					player1Games: Array.isArray(data.player1Games)
						? data.player1Games
						: [],
					player2Games: Array.isArray(data.player2Games)
						? data.player2Games
						: [],
					winnerId: data.winnerId || "",
					player1Id: data.player1Id,
					player2Id: data.player2Id,
					stage: data.stage,
					label: data.label,
				});
			});
			setMatches(map);
			setLoading(false);
		});

		return () => unsub();
	}, [divisionId]);

	const hasResults = Array.from(matches.values()).some(
		(match) => match.player1Games.length > 0 && !!match.winnerId,
	);

	return { matches, loading, hasResults };
}

export async function saveDoublesMatch(
	docId: string,
	player1Games: number[],
	player2Games: number[],
	winnerId: string,
	metadata: Partial<
		Pick<MatchRecord, "player1Id" | "player2Id" | "stage" | "label">
	> = {},
): Promise<void> {
	await setDoc(matchDocRef(docId), {
		player1Games,
		player2Games,
		winnerId,
		...metadata,
		updatedAt: serverTimestamp(),
	});
}

export async function deleteDoublesMatch(docId: string): Promise<void> {
	await deleteDoc(matchDocRef(docId));
}
