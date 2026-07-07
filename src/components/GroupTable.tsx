import { useMemo, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScoreCell } from "@/components/ScoreCell"
import type { Player } from "@/data/tournament"
import { makeMatchDocId } from "@/data/tournament"
import type { MatchRecord } from "@/lib/standings"
import { computeStandings } from "@/lib/standings"
import { saveMatch, deleteMatch, determineWinner } from "@/hooks/useMatches"

interface GroupTableProps {
  divisionId: string
  groupName: string
  players: Player[]
  matches: Map<string, MatchRecord>
  isAdmin: boolean
}

export function GroupTable({
  divisionId,
  groupName,
  players,
  matches,
  isAdmin,
}: GroupTableProps) {
  const n = players.length

  // Resolve standings
  const standings = useMemo(() => {
    const playerIds = players.map((p) => p.id)
    const matchResults: Array<{
      player1Id: string
      player2Id: string
      record: MatchRecord
    }> = []

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = players[i]
        const p2 = players[j]
        const [a, b] = [p1.id, p2.id].sort()
        const docId = makeMatchDocId(divisionId, groupName, p1.id, p2.id)
        const record = matches.get(docId)
        if (record && record.score && record.winnerId) {
          matchResults.push({ player1Id: a, player2Id: b, record })
        }
      }
    }

    return computeStandings(playerIds, matchResults)
  }, [players, matches, divisionId, groupName, n])

  const standingMap = useMemo(() => {
    const m = new Map<string, (typeof standings)[number]>()
    standings.forEach((s) => m.set(s.playerId, s))
    return m
  }, [standings])

  // Sort players by place (standings position)
  const sortedPlayers = useMemo(() => {
    const playerMap = new Map(players.map((p) => [p.id, p]))
    return [...standings]
      .map((s) => playerMap.get(s.playerId))
      .filter((p): p is Player => p !== undefined)
  }, [players, standings])

  const handleSave = useCallback(
    async (p1Id: string, p2Id: string, score: string) => {
      const sorted = [p1Id, p2Id].sort()
      const winnerId = determineWinner(score, sorted[0], sorted[1])
      if (!winnerId) return // Can't determine winner
      const docId = makeMatchDocId(divisionId, groupName, p1Id, p2Id)
      await saveMatch(docId, score, winnerId)
    },
    [divisionId, groupName]
  )

  const handleDelete = useCallback(
    async (p1Id: string, p2Id: string) => {
      const docId = makeMatchDocId(divisionId, groupName, p1Id, p2Id)
      await deleteMatch(docId)
    },
    [divisionId, groupName]
  )

  return (
    <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-x-auto">
      <CardHeader>
        <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
          Grupė {groupName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-2 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-28 text-left">
                Žaidėjas
              </th>
              {sortedPlayers.map((p) => (
                <th
                  key={p.id}
                  className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-1 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-24"
                >
                  {p.name}
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
            {sortedPlayers.map((rowPlayer, rowIdx) => {
              const st = standingMap.get(rowPlayer.id)
              return (
                <tr key={rowPlayer.id}>
                  <td className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 px-2 py-2 text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {rowPlayer.name}
                  </td>
                  {sortedPlayers.map((colPlayer, colIdx) => {
                    const docId = makeMatchDocId(
                      divisionId,
                      groupName,
                      rowPlayer.id,
                      colPlayer.id
                    )
                    const record = matches.get(docId)
                    const isDiagonal = rowIdx === colIdx
                    const isInverted = rowIdx > colIdx

                    // For the bottom-left (inverted), show the same score
                    let score: string | null = null
                    if (record && record.score) {
                      score = record.score
                    }

                    return (
                      <ScoreCell
                        key={colPlayer.id}
                        score={score}
                        isAdmin={isAdmin}
                        isDiagonal={isDiagonal}
                        isInverted={isInverted}
                        onSave={(newScore) =>
                          handleSave(rowPlayer.id, colPlayer.id, newScore)
                        }
                        onDelete={() =>
                          handleDelete(rowPlayer.id, colPlayer.id)
                        }
                      />
                    )
                  })}
                  <td className="border border-gray-300 dark:border-gray-700 text-center text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900">
                    {st?.points ?? 0}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 text-center text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-gray-100 dark:bg-gray-900">
                    {st?.position ?? "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
