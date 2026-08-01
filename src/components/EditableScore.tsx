import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableScoreProps {
	score: string | null;
	isAdmin: boolean;
	disabled?: boolean;
	muted?: boolean;
	className?: string;
	placeholder?: string;
	onSave: (newScore: string) => void;
	onDelete: () => void;
}

export function EditableScore({
	score,
	isAdmin,
	disabled = false,
	muted = false,
	className,
	placeholder = "6:4, 6:2 (arba 0:0 lygiosioms)",
	onSave,
	onDelete,
}: EditableScoreProps) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(score || "");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editing]);

	const handleDoubleClick = useCallback(() => {
		if (!isAdmin || disabled) return;
		setValue(score || "");
		setEditing(true);
	}, [isAdmin, disabled, score]);

	const commit = useCallback(() => {
		setEditing(false);
		const trimmed = value.trim();
		if (!trimmed) {
			if (score) onDelete();
		} else if (trimmed !== score) {
			onSave(trimmed);
		}
	}, [value, score, onSave, onDelete]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				commit();
			} else if (e.key === "Escape") {
				setEditing(false);
				setValue(score || "");
			}
		},
		[commit, score],
	);

	if (editing) {
		return (
			<Input
				ref={inputRef}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onKeyDown={handleKeyDown}
				className={cn(
					"h-full min-h-10 w-full rounded-none border-0 bg-[var(--color-card)] text-center text-xs font-medium text-[var(--color-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-inset",
					className,
				)}
				placeholder={placeholder}
			/>
		);
	}

	return (
		<button
			type="button"
			disabled={!isAdmin || disabled}
			className={cn(
				"flex min-h-10 w-full items-center justify-center rounded-none text-center text-xs select-none transition-colors duration-200",
				isAdmin &&
					!disabled &&
					"cursor-pointer hover:bg-[var(--color-accent)] hover:ring-1 hover:ring-[var(--color-ring)] hover:ring-inset",
				!score && "text-[var(--color-muted-foreground)]/45",
				score && "font-semibold text-[var(--color-foreground)]",
				muted && "text-[var(--color-muted-foreground)]",
				disabled && "cursor-default opacity-65",
				className,
			)}
			onDoubleClick={handleDoubleClick}
			title={isAdmin && !disabled ? "Double-click redagavimui" : undefined}
		>
			{score || "—"}
		</button>
	);
}
