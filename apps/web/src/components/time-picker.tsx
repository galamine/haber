import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import "./time-picker.css";

import RTTimePicker from "react-time-picker";

type TimePickerProps = {
	id?: string;
	/** 24-hour "HH:mm" value, e.g. "14:30" */
	value?: string;
	onChange: (value: string) => void;
};

export function TimePicker({ id, value, onChange }: TimePickerProps) {
	return (
		<div className="time-picker-field" data-vaul-no-drag>
			<RTTimePicker
				id={id}
				value={value || null}
				onChange={(v) => {
					if (typeof v === "string") onChange(v);
				}}
				format="hh:mm a"
				clearIcon={null}
				disableClock={false}
				className="w-full"
			/>
		</div>
	);
}
