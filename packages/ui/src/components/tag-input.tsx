import { X } from "lucide-react";
import type * as React from "react";
import { useState } from "react";

import { cn } from "../lib/utils";
import { Badge } from "./badge";
import { Input } from "./input";

type TagInputProps = {
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
};

export function TagInput({
	value,
	onChange,
	placeholder = "Type and press Enter…",
	disabled = false,
	className,
}: TagInputProps) {
	const [inputValue, setInputValue] = useState("");

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && inputValue.trim()) {
			e.preventDefault();
			addTag(inputValue.trim());
		} else if (e.key === "Backspace" && !inputValue && value.length > 0) {
			removeTag(value.length - 1);
		}
	}

	function addTag(tag: string) {
		const trimmed = tag.trim();
		if (trimmed && !value.includes(trimmed)) {
			onChange([...value, trimmed]);
		}
		setInputValue("");
	}

	function removeTag(index: number) {
		onChange(value.filter((_, i) => i !== index));
	}

	return (
		<div
			className={cn(
				"flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-brown-300 bg-input-background px-3 py-2",
				"focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
		>
			{value.map((tag, index) => (
				<Badge
					key={`${tag}-${index}`}
					variant="secondary"
					className="gap-1.5 whitespace-normal break-words border-brown-200 bg-brown-100 text-brown-700 text-sm"
				>
					{tag}
					<button
						type="button"
						disabled={disabled}
						onClick={() => removeTag(index)}
						className="ml-0.5 rounded-full hover:bg-brown-200 focus:outline-none focus:ring-1 focus:ring-brown-400"
					>
						<X className="h-3 w-3" />
					</button>
				</Badge>
			))}
			<Input
				type="text"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={value.length === 0 ? placeholder : ""}
				disabled={disabled}
				className="min-w-[150px] flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
			/>
		</div>
	);
}
