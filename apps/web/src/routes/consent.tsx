import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/consent")({
	component: ConsentPage,
});

type ConsentType = "TREATMENT" | "DATA_PROCESSING" | "IMAGE_VIDEO_CAPTURE";

const CONSENT_LABELS: Record<
	ConsentType,
	{ label: string; description: string }
> = {
	TREATMENT: {
		label: "Treatment Consent",
		description:
			"I consent to my child receiving therapeutic assessment and treatment services.",
	},
	DATA_PROCESSING: {
		label: "Data Processing",
		description:
			"I consent to my child's personal and clinical data being collected and processed.",
	},
	IMAGE_VIDEO_CAPTURE: {
		label: "Image & Video Capture",
		description:
			"I consent to photos or videos being taken of my child for clinical or educational purposes.",
	},
};

type FormState = {
	typedName: string;
	TREATMENT: boolean;
	DATA_PROCESSING: boolean;
	IMAGE_VIDEO_CAPTURE: boolean;
};

function ConsentPage() {
	const { token } = Route.useSearch();
	const [form, setForm] = useState<FormState>({
		typedName: "",
		TREATMENT: false,
		DATA_PROCESSING: false,
		IMAGE_VIDEO_CAPTURE: false,
	});
	const [submitted, setSubmitted] = useState(false);

	const { data: validation, isLoading: isValidating } = useQuery({
		...trpc.consentInvitation.validate.queryOptions({ token }),
		enabled: !!token,
		retry: false,
	});

	const submitMutation = useMutation(
		trpc.consentInvitation.submit.mutationOptions({
			onSuccess: () => {
				setSubmitted(true);
			},
			onError: (err) => {
				toast.error(err.message);
			},
		}),
	);

	function updateForm(patch: Partial<FormState>) {
		setForm((prev) => ({ ...prev, ...patch }));
	}

	if (!token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-brown-50 p-4">
				<div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
					<XCircle className="mx-auto h-12 w-12 text-red-400" />
					<h1 className="mt-4 font-semibold text-on-surface text-xl">
						Invalid Link
					</h1>
					<p className="mt-2 text-on-surface-variant text-sm">
						No consent token was provided. Please contact the clinic for a new
						link.
					</p>
				</div>
			</div>
		);
	}

	if (isValidating) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-brown-50 p-4">
				<div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
					<div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brown-600 border-t-transparent" />
					<p className="mt-4 text-on-surface-variant text-sm">
						Validating link…
					</p>
				</div>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-brown-50 p-4">
				<div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
					<CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
					<h1 className="mt-4 font-semibold text-on-surface text-xl">
						Consent Recorded
					</h1>
					<p className="mt-2 text-on-surface-variant text-sm">
						Your consent for{" "}
						<span className="font-medium text-on-surface">
							{validation?.childName}
						</span>{" "}
						has been successfully recorded. A confirmation has been sent to your
						email.
					</p>
					<p className="mt-4 text-on-surface-variant text-xs">
						You may now close this window.
					</p>
				</div>
			</div>
		);
	}

	if (!validation) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-brown-50 p-4">
				<div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
					<XCircle className="mx-auto h-12 w-12 text-red-400" />
					<h1 className="mt-4 font-semibold text-on-surface text-xl">
						Invalid or Expired Link
					</h1>
					<p className="mt-2 text-on-surface-variant text-sm">
						This consent link is invalid, has already been used, or has expired.
						Please contact the clinic for a new link.
					</p>
				</div>
			</div>
		);
	}

	const daysLeft = Math.ceil(
		(new Date(validation.expiresAt).getTime() - Date.now()) /
			(1000 * 60 * 60 * 24),
	);

	return (
		<div className="flex min-h-screen flex-col bg-brown-50">
			<header className="flex items-center justify-center border-outline-variant border-b bg-surface-container-lowest px-6 py-4">
				<div className="flex items-center gap-2">
					<Shield className="h-6 w-6 text-brown-600" />
					<span className="font-semibold text-lg text-on-surface">Haber</span>
				</div>
			</header>

			<main className="flex flex-1 items-center justify-center p-4">
				<div className="w-full max-w-lg">
					<div className="mb-6 text-center">
						<h1 className="font-semibold text-2xl text-on-surface">
							Consent for {validation.childName}
						</h1>
						{validation.guardianName && (
							<p className="mt-1 text-on-surface-variant text-sm">
								Signed by{" "}
								<span className="font-medium text-on-surface">
									{validation.guardianName}
								</span>
							</p>
						)}
					</div>

					<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
						<div className="border-outline-variant border-b bg-surface px-6 py-4">
							<h2 className="font-semibold text-on-surface">Consent Types</h2>
							<p className="mt-1 text-on-surface-variant text-xs">
								Please review and check each box to provide your consent
							</p>
						</div>

						<div className="space-y-1 p-6">
							{(
								[
									"TREATMENT",
									"DATA_PROCESSING",
									"IMAGE_VIDEO_CAPTURE",
								] as ConsentType[]
							).map((type) => (
								<label
									key={type}
									className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant p-4 transition-colors hover:bg-surface-container"
								>
									<input
										type="checkbox"
										checked={form[type]}
										onChange={(e) => updateForm({ [type]: e.target.checked })}
										className="mt-0.5 h-4 w-4 rounded border-outline-variant text-brown-600 focus:ring-brown-600"
									/>
									<div>
										<p className="font-medium text-on-surface text-sm">
											{CONSENT_LABELS[type].label}
										</p>
										<p className="text-on-surface-variant text-xs">
											{CONSENT_LABELS[type].description}
										</p>
									</div>
								</label>
							))}
						</div>

						<div className="border-outline-variant border-t p-6">
							<div className="mb-4 flex flex-col gap-1.5">
								<Label>
									Typed Signature <span className="text-red-500">*</span>
								</Label>
								<Input
									placeholder="Type your full name as your digital signature"
									value={form.typedName}
									onChange={(e) => updateForm({ typedName: e.target.value })}
									className="font-serif text-lg italic"
								/>
								<p className="text-on-surface-variant text-xs">
									By typing your name above, you confirm you have read and agree
									to each consent type checked above.
								</p>
							</div>

							<Button
								className="w-full"
								onClick={() =>
									submitMutation.mutate({ token, typedName: form.typedName })
								}
								disabled={
									submitMutation.isPending ||
									!form.typedName.trim() ||
									![
										form.TREATMENT,
										form.DATA_PROCESSING,
										form.IMAGE_VIDEO_CAPTURE,
									].some(Boolean)
								}
							>
								{submitMutation.isPending ? "Submitting…" : "Submit Consent"}
							</Button>

							<p className="mt-3 text-center text-on-surface-variant text-xs">
								{daysLeft > 1
									? `This link expires in ${daysLeft} days`
									: daysLeft === 1
										? "This link expires tomorrow"
										: "This link expires today"}
							</p>
						</div>
					</div>

					<p className="mt-4 text-center text-on-surface-variant text-xs">
						If you did not expect this email, please ignore it or contact the
						clinic directly.
					</p>
				</div>
			</main>
		</div>
	);
}
