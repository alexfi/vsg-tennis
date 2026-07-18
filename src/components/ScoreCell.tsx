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
	// Diagonal cell (self-intersection)
	if (isDiagonal) {
		return (
			<td className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 w-24 h-12" />
		);
	}

	return (
		<td
			className={cn(
				"border border-gray-300 dark:border-gray-700 text-center text-xs p-0 w-24 h-12 select-none",
				isInverted && "text-gray-400 dark:text-gray-500",
			)}
		>
			<EditableScore
				score={score}
				isAdmin={isAdmin}
				muted={isInverted}
				className="h-12 rounded-none px-1 py-2"
				onSave={onSave}
				onDelete={onDelete}
			/>
		</td>
	);
}
