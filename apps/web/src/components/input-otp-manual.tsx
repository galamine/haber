interface InputOTPProps {
	maxLength: number;
	value: string;
	onChange: (value: string) => void;
	children?: React.ReactNode;
}

export function InputOTP({ maxLength, value, onChange }: InputOTPProps) {
	function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
		const newValue = value.split("");
		newValue[index] = e.target.value.slice(-1);
		onChange(newValue.join(""));
	}

	function handleKeyDown(
		e: React.KeyboardEvent<HTMLInputElement>,
		index: number,
	) {
		if (e.key === "Backspace" && !value[index] && index > 0) {
			const inputs =
				document.querySelectorAll<HTMLInputElement>("[data-otp-input]");
			inputs[index - 1]?.focus();
		}
	}

	return (
		<div className="flex items-center gap-2">
			{Array.from({ length: maxLength }).map((_, i) => (
				<input
					key={i}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={value[i] ?? ""}
					onChange={(e) => handleChange(e, i)}
					onKeyDown={(e) => handleKeyDown(e, i)}
					className="h-9 w-9 rounded-lg border border-brown-300 bg-white text-center font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brown-700"
					data-otp-input
				/>
			))}
		</div>
	);
}

export function InputOTPGroup({ children }: { children: React.ReactNode }) {
	return <div className="flex items-center">{children}</div>;
}

export function InputOTPSlot(_: { index: number }) {
	return null;
}
