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
	placeholder = "6:4, 6:2",
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
					"h-full min-h-9 w-full border-0 rounded-none text-center text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
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
				"flex min-h-9 w-full items-center justify-center rounded text-center text-xs select-none",
				isAdmin &&
					!disabled &&
					"cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:ring-1 hover:ring-blue-500 hover:ring-inset",
				!score && "text-gray-300 dark:text-gray-600",
				score && "text-gray-700 dark:text-gray-200 font-medium",
				muted && "text-gray-400 dark:text-gray-500",
				disabled && "cursor-default opacity-70",
				className,
			)}
			onDoubleClick={handleDoubleClick}
			title={isAdmin && !disabled ? "Double-click to edit" : undefined}
		>
			{score || "—"}
		</button>
	);
}
