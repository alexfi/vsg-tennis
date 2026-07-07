import { useEffect, useState } from "react"
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { MatchRecord } from "@/lib/standings"

export interface MatchData {
  docId: string
  record: MatchRecord
}

export function useMatches(divisionId: string): {
  matches: Map<string, MatchRecord>
  loading: boolean
} {
  const [matches, setMatches] = useState<Map<string, MatchRecord>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const colRef = collection(db, "matches")
    const unsub = onSnapshot(colRef, (snapshot) => {
      const map = new Map<string, MatchRecord>()
      snapshot.forEach((doc) => {
        const docId = doc.id
        // Only include matches for this division
        if (!docId.startsWith(divisionId + "_")) return
        const data = doc.data()
        map.set(docId, {
          score: data.score || "",
          winnerId: data.winnerId || "",
        })
      })
      setMatches(map)
      setLoading(false)
    })

    return () => unsub()
  }, [divisionId])

  return { matches, loading }
}

export async function saveMatch(
  docId: string,
  score: string,
  winnerId: string
): Promise<void> {
  const ref = doc(db, "matches", docId)
  await setDoc(ref, {
    score,
    winnerId,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMatch(docId: string): Promise<void> {
  const ref = doc(db, "matches", docId)
  await deleteDoc(ref)
}

/**
 * Determine winner from a score string.
 * By convention, the alphabetically first player's score is the left number in each set.
 * Returns the winning player ID (either player1Id or player2Id).
 */
export function determineWinner(
  score: string,
  player1Id: string,
  player2Id: string
): string | null {
  const sets = score.split(",").map((s) => s.trim()).filter(Boolean)
  if (sets.length === 0) return null

  let p1Sets = 0
  let p2Sets = 0

  for (const setStr of sets) {
    const parts = setStr.split(":")
    if (parts.length !== 2) continue
    const left = parseInt(parts[0], 10)
    const right = parseInt(parts[1], 10)
    if (isNaN(left) || isNaN(right)) continue
    if (left > right) p1Sets++
    else if (right > left) p2Sets++
  }

  if (p1Sets > p2Sets) return player1Id
  if (p2Sets > p1Sets) return player2Id
  return null // tie — shouldn't happen in tennis
}
