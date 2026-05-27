"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import { cn } from "@habe-final/ui/lib/utils";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

const Form = FormProvider;

function FormField<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
}

function useFormField() {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState } = useFormContext();
	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField must be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
}

function FormItem({ className, ...props }: FieldPrimitive.Root.Props) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<FieldPrimitive.Root
				data-slot="form-item"
				className={cn("flex flex-col gap-1.5", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

function FormLabel({ className, ...props }: FieldPrimitive.Label.Props) {
	const { error, formItemId } = useFormField();

	return (
		<FieldPrimitive.Label
			data-slot="form-label"
			htmlFor={formItemId}
			className={cn(
				"font-medium text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
				error && "text-destructive",
				className,
			)}
			{...props}
		/>
	);
}

function FormControl({ ...props }: React.ComponentProps<"div">) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return (
		<div
			data-slot="form-control"
			id={formItemId}
			aria-describedby={
				!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-muted-foreground text-xs", className)}
			{...props}
		/>
	);
}

function FormMessage({
	className,
	children,
	...props
}: React.ComponentProps<"p">) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message ?? "") : children;

	if (!body) return null;

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			className={cn("font-medium text-destructive text-xs", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useFormField,
};
