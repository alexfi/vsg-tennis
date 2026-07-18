import { useCallback, useMemo } from "react";
import { ScoreCell } from "@/components/ScoreCell";
import type { DoublesPair } from "@/data/doublesTournament";
import { getPairName, makeDoublesMatchDocId } from "@/data/doublesTournament";
import { deleteDoublesMatch, saveDoublesMatch } from "@/hooks/useDoubles";
import { normalizeScoreForStorage, parseScoreInput } from "@/lib/scores";
import type { MatchRecord } from "@/lib/standings";
import { computeStandings, formatScore } from "@/lib/standings";

function displayScore(record: MatchRecord, rowIsP1: boolean): string | null {
	const p1 = record.player1Games;
	const p2 = record.player2Games;
	if (!p1 || !p2 || p1.length === 0) return null;
	const [left, right] = rowIsP1 ? [p1, p2] : [p2, p1];
	return formatScore(left, right);
}

interface DoublesGroupTableProps {
	divisionId: string;
	groupName: string;
	pairs: DoublesPair[];
	matches: Map<string, MatchRecord>;
	isAdmin: boolean;
}

export function DoublesGroupTable({
	divisionId,
	groupName,
	pairs,
	matches,
	isAdmin,
}: DoublesGroupTableProps) {
	const sortedInputPairs = useMemo(
		() => [...pairs].sort((a, b) => a.drawOrder - b.drawOrder),
		[pairs],
	);
	const n = sortedInputPairs.length;

	const standings = useMemo(() => {
		const pairIds = sortedInputPairs.map((pair) => pair.id);
		const matchResults: Array<{
			player1Id: string;
			player2Id: string;
			record: MatchRecord;
		}> = [];

		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const p1 = sortedInputPairs[i];
				const p2 = sortedInputPairs[j];
				const [player1Id, player2Id] = [p1.id, p2.id].sort();
				const docId = makeDoublesMatchDocId(
					divisionId,
					groupName,
					p1.id,
					p2.id,
				);
				const record = matches.get(docId);
				if (record && record.player1Games.length > 0 && record.winnerId) {
					matchResults.push({ player1Id, player2Id, record });
				}
			}
		}

		return computeStandings(pairIds, matchResults);
	}, [divisionId, groupName, matches, n, sortedInputPairs]);

	const standingMap = useMemo(
		() => new Map(standings.map((standing) => [standing.playerId, standing])),
		[standings],
	);

	const sortedPairs = useMemo(() => {
		const pairMap = new Map(sortedInputPairs.map((pair) => [pair.id, pair]));
		return standings
			.map((standing) => pairMap.get(standing.playerId))
			.filter((pair): pair is DoublesPair => !!pair);
	}, [sortedInputPairs, standings]);

	const handleSave = useCallback(
		async (p1Id: string, p2Id: string, score: string) => {
			const parsed = parseScoreInput(score);
			if (!parsed) return;
			const normalized = normalizeScoreForStorage(
				p1Id,
				p2Id,
				parsed.games1,
				parsed.games2,
			);
			if (!normalized) return;

			const docId = makeDoublesMatchDocId(divisionId, groupName, p1Id, p2Id);
			await saveDoublesMatch(
				docId,
				normalized.player1Games,
				normalized.player2Games,
				normalized.winnerId,
				{
					player1Id: normalized.player1Id,
					player2Id: normalized.player2Id,
					stage: "group",
					label: `Grupė ${groupName}`,
				},
			);
		},
		[divisionId, groupName],
	);

	const handleDelete = useCallback(
		async (p1Id: string, p2Id: string) => {
			const docId = makeDoublesMatchDocId(divisionId, groupName, p1Id, p2Id);
			await deleteDoublesMatch(docId);
		},
		[divisionId, groupName],
	);

	return (
		<section className="overflow-x-auto">
			<h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
				Grupė {groupName}
			</h2>
			<table className="border-collapse">
				<thead>
					<tr>
						<th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-2 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-52 text-left">
							Pora
						</th>
						{sortedPairs.map((pair) => (
							<th
								key={pair.id}
								className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-1 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-32"
								title={getPairName(pair)}
							>
								{getPairName(pair)}
							</th>
						))}
						<th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-2 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-16 text-center">
							Taškai
						</th>
						<th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-2 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-14 text-center">
							Vieta
						</th>
					</tr>
				</thead>
				<tbody>
					{sortedPairs.map((rowPair, rowIdx) => {
						const st = standingMap.get(rowPair.id);
						return (
							<tr key={rowPair.id}>
								<td className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-2 py-2 text-xs text-gray-700 dark:text-gray-300 font-medium">
									{getPairName(rowPair)}
								</td>
								{sortedPairs.map((colPair, colIdx) => {
									const docId = makeDoublesMatchDocId(
										divisionId,
										groupName,
										rowPair.id,
										colPair.id,
									);
									const record = matches.get(docId);
									const isDiagonal = rowIdx === colIdx;
									const isInverted = rowIdx > colIdx;
									const rowIsP1 =
										rowPair.id === [rowPair.id, colPair.id].sort()[0];
									const score = record?.player1Games.length
										? displayScore(record, rowIsP1)
										: null;

									return (
										<ScoreCell
											key={colPair.id}
											score={score}
											isAdmin={isAdmin}
											isDiagonal={isDiagonal}
											isInverted={isInverted}
											onSave={(newScore) =>
												handleSave(rowPair.id, colPair.id, newScore)
											}
											onDelete={() => handleDelete(rowPair.id, colPair.id)}
										/>
									);
								})}
								<td className="border border-gray-300 dark:border-gray-700 text-center text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900">
									{st?.points ?? 0}
								</td>
								<td className="border border-gray-300 dark:border-gray-700 text-center text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-gray-100 dark:bg-gray-900">
									{st?.position ?? "-"}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</section>
	);
}
