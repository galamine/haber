"use client";

import { OTPFieldPreview as InputOTPPrimitive } from "@base-ui/react/otp-field";
import { cn } from "@haber-final/ui/lib/utils";
import { MinusIcon } from "lucide-react";
import type * as React from "react";

function InputOTP({ className, ...props }: InputOTPPrimitive.Root.Props) {
	return (
		<InputOTPPrimitive.Root
			data-slot="input-otp"
			className={cn(
				"flex items-center gap-2 has-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="input-otp-group"
			className={cn("flex items-center", className)}
			{...props}
		/>
	);
}

function InputOTPSlot({ className, ...props }: InputOTPPrimitive.Input.Props) {
	return (
		<div
			data-slot="input-otp-slot"
			className={cn(
				"relative flex h-9 w-9 items-center justify-center border-input border-y border-r font-medium text-sm transition-all first:rounded-l-none first:border-l last:rounded-r-none",
				className,
			)}
		>
			<InputOTPPrimitive.Input
				className="absolute inset-0 h-full w-full cursor-default appearance-none bg-transparent text-center font-medium text-sm caret-transparent outline-none data-[focused]:z-10 data-[focused]:border-ring data-[focused]:ring-1 data-[focused]:ring-ring/50"
				{...props}
			/>
		</div>
	);
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="input-otp-separator" {...props}>
			<MinusIcon className="size-4 text-muted-foreground" />
		</div>
	);
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
