import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

interface SimpleDropdownProps {
	trigger: React.ReactNode;
	children: React.ReactNode;
	align?: "start" | "end";
	className?: string;
}

interface SimpleDropdownItemProps {
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
	destructive?: boolean;
}

interface SimpleDropdownSeparatorProps {
	className?: string;
}

export function SimpleDropdown({
	trigger,
	children,
	align = "start",
	className,
}: SimpleDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen]);

	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [isOpen]);

	const handleTriggerClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsOpen(!isOpen);
	};

	const handleContentKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			setIsOpen(false);
		}
	};

	return (
		<div className="relative inline-block">
			<button
				ref={triggerRef}
				type="button"
				onClick={handleTriggerClick}
				className="cursor-pointer"
			>
				{trigger}
			</button>

			{isOpen && (
				<div
					ref={dropdownRef}
					className={cn(
						"absolute top-full z-[99999] mt-1 min-w-[160px] rounded-lg border border-brown-200 bg-white py-1 shadow-lg",
						align === "end" ? "right-0" : "left-0",
						className,
					)}
					style={{
						position: "absolute",
						zIndex: 99999,
					}}
				>
					<div
						role="menu"
						onClick={() => setIsOpen(false)}
						onKeyDown={handleContentKeyDown}
					>
						{children}
					</div>
				</div>
			)}
		</div>
	);
}

export function SimpleDropdownItem({
	children,
	onClick,
	className,
	destructive,
}: SimpleDropdownItemProps) {
	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (onClick) {
			onClick();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (onClick) {
				onClick();
			}
		}
	};

	return (
		<div
			role="menuitem"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={cn(
				"flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-brown-50",
				destructive && "text-red-600 hover:bg-red-50",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function SimpleDropdownSeparator({
	className,
}: SimpleDropdownSeparatorProps) {
	return <div className={cn("mx-1 my-1 h-px bg-brown-200", className)} />;
}
