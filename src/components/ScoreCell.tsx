import { cn } from "@/lib/utils";
import { EditableScore } from "@/components/EditableScore";

interface ScoreCellProps {
	score: string | null;
	isAdmin: boolean;
	isDiagonal: boolean;
	isInverted: boolean;
	onSave: (newScore: string) => void;
	onDelete: () => void;
}

export function ScoreCell({
	score,
	isAdmin,
	isDiagonal,
	isInverted,
	onSave,
	onDelete,
}: ScoreCellProps) {
	if (isDiagonal) {
		return (
			<td className="h-12 w-24 border-b border-r border-[var(--color-border)] bg-[var(--color-muted)]/70" />
		);
	}

	return (
		<td
			className={cn(
				"h-12 w-24 border-b border-r border-[var(--color-border)] bg-[var(--color-card)] p-0 text-center text-xs select-none",
				isInverted && "text-[var(--color-muted-foreground)]",
			)}
		>
			<EditableScore
				score={score}
				isAdmin={isAdmin}
				muted={isInverted}
				className="h-12 px-1 py-2"
				onSave={onSave}
				onDelete={onDelete}
			/>
		</td>
	);
}
