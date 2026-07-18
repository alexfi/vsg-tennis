import { useEffect, useState } from "react";
import {
	collection,
	onSnapshot,
	doc,
	setDoc,
	deleteDoc,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MatchRecord } from "@/lib/standings";

/** Parse a legacy score string into games arrays. */
function parseLegacyScore(score: string): {
	p1Games: number[];
	p2Games: number[];
} {
	const p1: number[] = [];
	const p2: number[] = [];
	for (const s of score.split(",")) {
		const parts = s.trim().split(":");
		if (parts.length !== 2) continue;
		const a = parseInt(parts[0], 10);
		const b = parseInt(parts[1], 10);
		if (Number.isNaN(a) || Number.isNaN(b)) continue;
		p1.push(a);
		p2.push(b);
	}
	return { p1Games: p1, p2Games: p2 };
}

export interface MatchData {
	docId: string;
	record: MatchRecord;
}

export function useMatches(divisionId: string): {
	matches: Map<string, MatchRecord>;
	loading: boolean;
} {
	const [matches, setMatches] = useState<Map<string, MatchRecord>>(new Map());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const colRef = collection(db, "matches");
		const unsub = onSnapshot(colRef, (snapshot) => {
			const map = new Map<string, MatchRecord>();
			snapshot.forEach((doc) => {
				const docId = doc.id;
				// Only include matches for this division
				if (!docId.startsWith(divisionId + "_")) return;
				const data = doc.data();
				let p1Games: number[], p2Games: number[];
				if (data.player1Games && data.player2Games) {
					p1Games = data.player1Games;
					p2Games = data.player2Games;
				} else if (data.score) {
					// Legacy: parse old score string
					const parsed = parseLegacyScore(data.score);
					p1Games = parsed.p1Games;
					p2Games = parsed.p2Games;
				} else {
					p1Games = [];
					p2Games = [];
				}
				map.set(docId, {
					player1Games: p1Games,
					player2Games: p2Games,
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

	return { matches, loading };
}

export async function saveMatch(
	docId: string,
	player1Games: number[],
	player2Games: number[],
	winnerId: string,
	metadata: Partial<
		Pick<MatchRecord, "player1Id" | "player2Id" | "stage" | "label">
	> = {},
): Promise<void> {
	const ref = doc(db, "matches", docId);
	await setDoc(ref, {
		player1Games,
		player2Games,
		winnerId,
		...metadata,
		updatedAt: serverTimestamp(),
	});
}

export async function deleteMatch(docId: string): Promise<void> {
	const ref = doc(db, "matches", docId);
	await deleteDoc(ref);
}
