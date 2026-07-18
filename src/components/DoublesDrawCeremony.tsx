import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type {
	DoublesDivision,
	DoublesPair,
	DrawState,
	PairingPhaseConfig,
} from "@/data/doublesTournament";
import {
	getDoublesPlayerName,
	getExpectedPairCount,
	getPairName,
} from "@/data/doublesTournament";

interface DoublesDrawCeremonyProps {
	division: DoublesDivision;
	drawState: DrawState;
	isAdmin: boolean;
	hasResults: boolean;
	onCreateNextPair: (phase: PairingPhaseConfig) => Promise<void>;
	onAssignNextMixGroup: () => Promise<void>;
	onReset: () => Promise<void>;
}

function getPhaseStartOrder(
	division: DoublesDivision,
	phaseId: string,
): number {
	let order = 1;
	for (const phase of division.phases) {
		if (phase.id === phaseId) return order;
		order += phase.seeded.length;
	}
	return order;
}

function getPhasePairs(
	division: DoublesDivision,
	phase: PairingPhaseConfig,
	pairs: DoublesPair[],
): DoublesPair[] {
	const start = getPhaseStartOrder(division, phase.id);
	const end = start + phase.seeded.length - 1;
	return pairs
		.filter((pair) => pair.drawOrder >= start && pair.drawOrder <= end)
		.sort((a, b) => a.drawOrder - b.drawOrder);
}

function BucketList({
	title,
	playerIds,
	usedPlayerIds = new Set<string>(),
}: {
	title: string;
	playerIds: string[];
	usedPlayerIds?: Set<string>;
}) {
	return (
		<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
			<h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
				{title}
			</h4>
			<ol className="space-y-1 text-sm">
				{playerIds.map((playerId, index) => {
					const used = usedPlayerIds.has(playerId);
					return (
						<li
							key={playerId}
							className={
								used
									? "text-gray-400 dark:text-gray-600 line-through"
									: "text-gray-800 dark:text-gray-200"
							}
						>
							<span className="mr-2 text-xs text-gray-400 dark:text-gray-600">
								{index + 1}.
							</span>
							{getDoublesPlayerName(playerId)}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

function PhaseDrawCard({
	division,
	phase,
	pairs,
	isAdmin,
	canDraw,
	onCreateNextPair,
}: {
	division: DoublesDivision;
	phase: PairingPhaseConfig;
	pairs: DoublesPair[];
	isAdmin: boolean;
	canDraw: boolean;
	onCreateNextPair: (phase: PairingPhaseConfig) => Promise<void>;
}) {
	const phasePairs = getPhasePairs(division, phase, pairs);
	const drawnPartnerIds = new Set(phasePairs.map((pair) => pair.player2Id));
	const complete = phasePairs.length >= phase.seeded.length;
	const nextSeededPlayerId = phase.seeded[phasePairs.length];

	return (
		<section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 className="text-base font-semibold text-gray-900 dark:text-white">
						{phase.name}
					</h3>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
						{complete
							? "Visos šio etapo poros sukurtos."
							: nextSeededPlayerId
								? `Kita pora: ${getDoublesPlayerName(nextSeededPlayerId)} + burtai`
								: "Laukiama ankstesnio etapo."}
					</p>
				</div>
				{isAdmin && (
					<Button
						type="button"
						size="sm"
						disabled={!canDraw || complete}
						onClick={() => onCreateNextPair(phase)}
					>
						Sukurti naują porą
					</Button>
				)}
			</div>

			<div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
				<BucketList title={phase.seededLabel} playerIds={phase.seeded} />
				<BucketList
					title={phase.drawLabel}
					playerIds={phase.draw}
					usedPlayerIds={drawnPartnerIds}
				/>
				<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
					<h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
						Sukurtos poros
					</h4>
					{phasePairs.length === 0 ? (
						<p className="text-sm text-gray-400 dark:text-gray-600">
							Porų dar nėra.
						</p>
					) : (
						<ol className="space-y-2 text-sm">
							{phasePairs.map((pair) => (
								<li
									key={pair.id}
									className="rounded-md bg-blue-50 dark:bg-blue-950/30 px-2 py-1.5 text-gray-900 dark:text-gray-100"
								>
									<span className="mr-2 font-bold text-blue-600 dark:text-blue-400">
										#{pair.drawOrder}
									</span>
									{getPairName(pair)}
								</li>
							))}
						</ol>
					)}
				</div>
			</div>
		</section>
	);
}

function MixGroupAssignment({
	pairs,
	groups,
	isAdmin,
	onAssignNextMixGroup,
}: {
	pairs: DoublesPair[];
	groups: Record<string, string[]> | undefined;
	isAdmin: boolean;
	onAssignNextMixGroup: () => Promise<void>;
}) {
	const sortedPairs = [...pairs].sort((a, b) => a.drawOrder - b.drawOrder);
	const assigned = new Set(
		Object.values(groups ?? {}).flatMap((pairIds) => pairIds),
	);
	const assignmentComplete =
		sortedPairs.length > 0 && assigned.size >= sortedPairs.length;
	const pairMap = new Map(sortedPairs.map((pair) => [pair.id, pair]));

	return (
		<section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 className="text-base font-semibold text-gray-900 dark:text-white">
						Mix · paskirstymas į grupes
					</h3>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
						Pirmos 5 poros skirstomos A/B/A/B/A, kitos 5 – B/A/B/A/B.
					</p>
				</div>
				{isAdmin && (
					<Button
						type="button"
						size="sm"
						disabled={assignmentComplete}
						onClick={onAssignNextMixGroup}
					>
						Paskirstyti porą į grupę
					</Button>
				)}
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				{["A", "B"].map((groupName) => (
					<div
						key={groupName}
						className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3"
					>
						<h4 className="mb-2 text-sm font-bold text-gray-800 dark:text-gray-200">
							Grupė {groupName}
						</h4>
						{(groups?.[groupName] ?? []).length === 0 ? (
							<p className="text-sm text-gray-400 dark:text-gray-600">
								Dar nėra porų.
							</p>
						) : (
							<ol className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
								{(groups?.[groupName] ?? []).map((pairId) => {
									const pair = pairMap.get(pairId);
									return pair ? (
										<li key={pairId}>{getPairName(pair)}</li>
									) : null;
								})}
							</ol>
						)}
					</div>
				))}
			</div>
		</section>
	);
}

export function DoublesDrawCeremony({
	division,
	drawState,
	isAdmin,
	hasResults,
	onCreateNextPair,
	onAssignNextMixGroup,
	onReset,
}: DoublesDrawCeremonyProps) {
	const pairs = useMemo(
		() =>
			[...(drawState.pairs ?? [])].sort((a, b) => a.drawOrder - b.drawOrder),
		[drawState.pairs],
	);
	const expectedPairCount = getExpectedPairCount(division);
	const allPairsComplete = pairs.length >= expectedPairCount;

	const reset = async () => {
		if (hasResults) {
			window.alert("Negalima atstatyti burtų, nes jau yra įvestų rezultatų.");
			return;
		}
		const confirmed = window.confirm(
			"Ar tikrai norite ištrinti visas sukurtas poras ir pradėti burtus iš naujo?",
		);
		if (confirmed) await onReset();
	};

	let previousPhasesComplete = true;

	return (
		<section className="mb-6 space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
						Burtų ceremonija
					</h2>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
						Sukurta {pairs.length} iš {expectedPairCount} porų. Žiūrovai mato
						eigą, valdyti gali tik adminas.
					</p>
				</div>
				{isAdmin && pairs.length > 0 && (
					<Button type="button" variant="outline" size="sm" onClick={reset}>
						Atstatyti burtus
					</Button>
				)}
			</div>

			{division.phases.map((phase) => {
				const phasePairs = getPhasePairs(division, phase, pairs);
				const canDraw = previousPhasesComplete;
				previousPhasesComplete =
					previousPhasesComplete && phasePairs.length >= phase.seeded.length;

				return (
					<PhaseDrawCard
						key={phase.id}
						division={division}
						phase={phase}
						pairs={pairs}
						isAdmin={isAdmin}
						canDraw={canDraw}
						onCreateNextPair={onCreateNextPair}
					/>
				);
			})}

			{division.groupMode === "mixAlternating" && allPairsComplete && (
				<MixGroupAssignment
					pairs={pairs}
					groups={drawState.groups}
					isAdmin={isAdmin}
					onAssignNextMixGroup={onAssignNextMixGroup}
				/>
			)}
		</section>
	);
}
