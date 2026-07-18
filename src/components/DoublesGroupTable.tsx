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
		<section className="space-y-3">
			<div className="flex items-end justify-between gap-3">
				<h2 className="text-lg font-bold tracking-[-0.03em] text-[var(--color-foreground)]">
					Grupė {groupName}
				</h2>
				{isAdmin && (
					<p className="hidden text-xs text-[var(--color-muted-foreground)] sm:block">
						Double-click rezultatą redagavimui
					</p>
				)}
			</div>
			<div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
				<table className="min-w-max border-separate border-spacing-0">
					<thead>
						<tr>
							<th className="sticky left-0 z-20 w-56 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
								Pora
							</th>
							{sortedPairs.map((pair) => (
								<th
									key={pair.id}
									className="w-36 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)]"
									title={getPairName(pair)}
								>
									{getPairName(pair)}
								</th>
							))}
							<th className="w-16 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
								Taškai
							</th>
							<th className="w-14 border-b border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
								Vieta
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedPairs.map((rowPair, rowIdx) => {
							const st = standingMap.get(rowPair.id);
							return (
								<tr key={rowPair.id}>
									<td className="sticky left-0 z-10 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-3 text-xs font-semibold text-[var(--color-foreground)] shadow-[8px_0_16px_-18px_var(--color-foreground)]">
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
									<td className="border-b border-r border-[var(--color-border)] bg-[var(--color-muted)] text-center text-sm font-extrabold text-[var(--color-foreground)]">
										{st?.points ?? 0}
									</td>
									<td className="border-b border-[var(--color-border)] bg-[var(--color-muted)] text-center text-sm font-extrabold text-[var(--color-foreground)]">
										{st?.position ?? "-"}
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
