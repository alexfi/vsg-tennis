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
				<TabsList className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 h-auto flex-wrap">
					{divisions.map((div) => (
						<TabsTrigger
							key={div.id}
							value={div.id}
							className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-gray-500 dark:text-gray-400 px-4 py-2 text-sm"
						>
							{div.name}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{loading && (
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
				</div>
			)}

			{!loading && (
				<>
					<DoublesDrawCeremony
						division={division}
						drawState={drawState}
						isAdmin={isAdmin}
						hasResults={hasResults}
						onCreateNextPair={(phase) => createNextPair(division, phase)}
						onAssignNextMixGroup={() => assignNextMixGroup(division)}
						onReset={resetDraw}
					/>

					{canShowTables ? (
						<div
							className={`grid gap-6 ${
								Object.keys(groups).length > 1
									? "grid-cols-1 xl:grid-cols-2"
									: "grid-cols-1"
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
					) : (
						<div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-500">
							Grupių lentelės bus parodytos, kai bus užbaigti burtai
							{division.id === "mix" ? " ir paskirstymas į grupes" : ""}.
						</div>
					)}
				</>
			)}
		</>
	);
}
