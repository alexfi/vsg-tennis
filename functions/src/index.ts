import * as admin from "firebase-admin"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
admin.initializeApp()

// ── Telegram config ──────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = "8477960085:AAFECuaic9HA3mtkd0FlhPLAdfJS7Fq2bb8"
const TELEGRAM_CHAT_ID = "5253055307"

// ── Tournament data (mirrors src/data/tournament.ts) ─────────────
interface Player {
  id: string
  name: string
}

interface Group {
  [groupName: string]: Player[]
}

interface Division {
  id: string
  name: string
  groups: Group
}

const DIVISIONS: Record<string, Division> = {
  power: {
    id: "power",
    name: "Power",
    groups: {
      A: [
        { id: "pow_1", name: "Artem Staščiuk" },
        { id: "pow_2", name: "Ivan Gorbun" },
        { id: "pow_3", name: "Artur Margiavičius" },
        { id: "pow_4", name: "Ksenija Klimova" },
      ],
    },
  },
  masters: {
    id: "masters",
    name: "Masters",
    groups: {
      A: [
        { id: "mas_a1", name: "Ksenija Klimova" },
        { id: "mas_a2", name: "Maksim Babachin" },
        { id: "mas_a3", name: "Sergej Maliavskij" },
        { id: "mas_a4", name: "Viačeslav Rumiancev" },
        { id: "mas_a5", name: "Aleksej Osincev" },
      ],
      B: [
        { id: "mas_b1", name: "Sergej Obožin" },
        { id: "mas_b2", name: "Sergej Presniakov" },
        { id: "mas_b3", name: "Deimantas Bartaškas" },
        { id: "mas_b4", name: "Pavel Blinov" },
        { id: "mas_b5", name: "Eduard Dim" },
      ],
    },
  },
  mastersLight: {
    id: "mastersLight",
    name: "Masters Light",
    groups: {
      A: [
        { id: "msl_a1", name: "Vitalij Kiselev" },
        { id: "msl_a2", name: "Artem Zarovkin" },
        { id: "msl_a3", name: "Tomas Grudzinskas" },
        { id: "msl_a4", name: "Igor Naguj" },
      ],
      B: [
        { id: "msl_b1", name: "Kazimiras" },
        { id: "msl_b2", name: "Dmitrij Dudov" },
        { id: "msl_b3", name: "Aleksandr Fiodorov" },
        { id: "msl_b4", name: "Andrej Dydenko" },
      ],
    },
  },
  mastersPrincess: {
    id: "mastersPrincess",
    name: "Masters Princess",
    groups: {
      A: [
        { id: "mpr_a1", name: "Nina Staščiuk" },
        { id: "mpr_a2", name: "Ana Tiuneva" },
        { id: "mpr_a3", name: "Ana Kostenko" },
        { id: "mpr_a4", name: "Anastasija Lykosova" },
        { id: "mpr_a5", name: "Jelizaveta" },
      ],
      B: [
        { id: "mpr_b1", name: "Aliona Šugajeva" },
        { id: "mpr_b2", name: "Darija Osipova" },
        { id: "mpr_b3", name: "Ilona Čebatorionaitė" },
        { id: "mpr_b4", name: "Ksenija Tomm" },
      ],
    },
  },
}

const ALL_PLAYERS = new Map<string, Player>()
for (const division of Object.values(DIVISIONS)) {
  for (const players of Object.values(division.groups)) {
    for (const p of players) {
      ALL_PLAYERS.set(p.id, p)
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────
/**
 * Parse docId: "{div}_{group}_{pid1}_vs_{pid2}"
 * Returns { division, groupName, player1Id, player2Id } or null
 */
function parseDocId(
  docId: string
): {
  division: Division
  groupName: string
  player1: Player
  player2: Player
} | null {
  // docId format: power_A_pow_1_vs_pow_2
  const idxGroupEnd = docId.indexOf("_")
  if (idxGroupEnd === -1) return null

  const divisionId = docId.slice(0, idxGroupEnd)
  const rest = docId.slice(idxGroupEnd + 1)

  // The group is single-letter (A, B) — find the second underscore
  const idxGroup = rest.indexOf("_")
  if (idxGroup === -1) return null

  const groupName = rest.slice(0, idxGroup)
  const afterGroup = rest.slice(idxGroup + 1)

  // afterGroup: "pow_1_vs_pow_2"
  const vsIdx = afterGroup.indexOf("_vs_")
  if (vsIdx === -1) return null

  const p1Id = afterGroup.slice(0, vsIdx)
  const p2Id = afterGroup.slice(vsIdx + 4)

  const division = DIVISIONS[divisionId]
  if (!division) return null

  const p1 = ALL_PLAYERS.get(p1Id)
  const p2 = ALL_PLAYERS.get(p2Id)
  if (!p1 || !p2) return null

  return { division, groupName, player1: p1, player2: p2 }
}

/**
 * Build a human-readable score summary from games arrays or legacy string.
 * Example: [6,6],[4,1] → "6-4, 6-5"
 */
function formatScoreStr(afterData: any): string {
  if (afterData.player1Games && afterData.player2Games) {
    return (afterData.player1Games as number[])
      .map((g: number, i: number) => `${g}-${afterData.player2Games[i]}`)
      .join(", ")
  }
  // Legacy score string
  if (afterData.score) {
    return (afterData.score as string).replace(/:/g, "-")
  }
  return "?"
}

async function sendTelegramMessage(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  })

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`Telegram API error ${res.status}: ${errText}`)
    throw new Error(`Telegram API error ${res.status}`)
  }
}

// ── Cloud Function ───────────────────────────────────────────────
export const onMatchUpdate = onDocumentWritten(
  "matches/{docId}",
  async (event) => {
    const docId = event.params.docId

    const parsed = parseDocId(docId)
    if (!parsed) {
      console.log(`Skipping docId=${docId} — could not parse`)
      return
    }

    const { division, groupName, player1, player2 } = parsed

    // Handle deletion
    if (!event.data?.after.exists) {
      const msg = [
        "🗑️ <b>Rezultatas ištrintas</b>",
        "",
        `🏟️ ${division.name} | Grupė ${groupName}`,
        `🎾 ${player1.name} vs ${player2.name}`,
      ].join("\n")

      await sendTelegramMessage(msg)
      console.log(`Sent delete notification for ${docId}`)
      return
    }

    const afterData = event.data.after.data()
    if (!afterData) return

    const score = afterData.score as string | undefined
    const winnerId = afterData.winnerId as string | undefined

    if (!winnerId) {
      console.log(`Skipping docId=${docId} — incomplete data`)
      return
    }
    // Must have either new arrays or legacy score string
    const hasGames =
      afterData.player1Games && afterData.player2Games
    if (!hasGames && !score) {
      console.log(`Skipping docId=${docId} — no score data`)
      return
    }

    const winner = ALL_PLAYERS.get(winnerId)
    const winnerName = winner?.name ?? winnerId

    const isNew = !event.data?.before.exists

    const msg = [
      isNew ? "🆕 <b>Naujas rezultatas!</b>" : "✏️ <b>Rezultatas atnaujintas</b>",
      "",
      `🏟️ ${division.name} | Grupė ${groupName}`,
      `🎾 ${player1.name} vs ${player2.name}`,
      `📊 Rezultatas: <code>${formatScoreStr(afterData)}</code>`,
      `🏆 Laimėtojas: <b>${winnerName}</b>`,
    ].join("\n")

    await sendTelegramMessage(msg)
    console.log(`Sent update notification for ${docId}`)
  }
)
