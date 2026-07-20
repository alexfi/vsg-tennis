import { useMemo, useState } from "react";
import { DoublesDrawCeremony } from "@/components/DoublesDrawCeremony";
import { DoublesGroupTable } from "@/components/DoublesGroupTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	DOUBLES_TOURNAMENT_DATA,
	buildGroupsFromDraw,
	getDoublesDivisions,
	getExpectedPairCount,
} from "@/data/doublesTournament";
import { useDoublesDraw, useDoublesMatches } from "@/hooks/useDoubles";

interface DoublesTournamentProps {
	isAdmin: boolean;
}

function groupsReady(
	divisionId: string,
	pairCount: number,
	groups: Record<string, unknown>,
): boolean {
	if (divisionId !== "mix") return pairCount > 0;
	const assignedCount = Object.values(groups).reduce<number>(
		(sum, pairIds) => sum + (Array.isArray(pairIds) ? pairIds.length : 0),
		0,
	);
	return assignedCount >= pairCount;
}

export function DoublesTournament({ isAdmin }: DoublesTournamentProps) {
	const divisions = useMemo(() => getDoublesDivisions(), []);
	const [activeDivision, setActiveDivision] = useState(divisions[0]?.id ?? "");
	const division = DOUBLES_TOURNAMENT_DATA.divisions[activeDivision];
	const {
		drawState,
		loading: drawLoading,
		createNextPair,
		assignNextMixGroup,
		resetDraw,
	} = useDoublesDraw(activeDivision);
	const {
		matches,
		loading: matchesLoading,
		hasResults,
	} = useDoublesMatches(activeDivision);

	if (!division) return null;

	const expectedPairCount = getExpectedPairCount(division);
	const allPairsComplete = (drawState.pairs ?? []).length >= expectedPairCount;
	const groups = buildGroupsFromDraw(division, drawState);
	const canShowTables =
		allPairsComplete &&
		groupsReady(division.id, expectedPairCount, drawState.groups ?? {});
	const loading = drawLoading || matchesLoading;

	return (
		<>
			<Tabs
				value={activeDivision}
				onValueChange={setActiveDivision}
				className="mb-6"
			>
				<TabsList className="h-auto flex-wrap justify-start">
					{divisions.map((div) => (
						<TabsTrigger key={div.id} value={div.id}>
							{div.name}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{loading && (
				<div className="flex items-center justify-center py-24">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
				</div>
			)}

			{!loading && (
				<>
					{canShowTables && (
						<div
							className={`grid gap-6 mb-6 ${
								Object.keys(groups).length > 1 ? "grid-cols-1" : "grid-cols-1"
							}`}
						>
							{Object.entries(groups).map(([groupName, pairs]) => (
								<DoublesGroupTable
									key={groupName}
									divisionId={division.id}
									groupName={groupName}
									pairs={pairs}
									matches={matches}
									isAdmin={isAdmin}
								/>
							))}
						</div>
					)}

					<DoublesDrawCeremony
						division={division}
						drawState={drawState}
						isAdmin={isAdmin}
						hasResults={hasResults}
						onCreateNextPair={(phase) => createNextPair(division, phase)}
						onAssignNextMixGroup={() => assignNextMixGroup(division)}
						onReset={resetDraw}
					/>
				</>
			)}
		</>
	);
}
