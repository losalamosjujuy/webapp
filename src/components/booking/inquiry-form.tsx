"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inquirySchema } from "@/lib/validations/reservation";
import type { Inquiry } from "@/types/domain";

type FormValues = z.infer<typeof inquirySchema>;

export function InquiryForm() {
  const { runBlockingAction } = useAppFeedback();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(inquirySchema)
  });

  async function onSubmit(values: FormValues) {
    setRequestError(null);
    setSubmittedId(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/inquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });

          const payload = (await response.json().catch(() => null)) as
            | { inquiryId?: string; inquiry?: Inquiry; error?: string }
            | null;

          if (!response.ok || !payload?.inquiryId) {
            throw new Error(payload?.error ?? "No pudimos enviar tu consulta.");
          }

          return { inquiryId: payload.inquiryId };
        },
        {
          loadingMessage: "Estamos enviando tu consulta.",
          successMessage: "La consulta se envio correctamente."
        }
      );

      setSubmittedId(data.inquiryId);
      form.reset();
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "No pudimos enviar tu consulta."
      );
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="text-sm text-sand-700">
        Nombre
        <Input {...form.register("fullName")} />
      </label>
      <label className="text-sm text-sand-700">
        WhatsApp
        <Input {...form.register("phone")} />
      </label>
      <label className="text-sm text-sand-700">
        Email
        <Input type="email" {...form.register("email")} />
      </label>
      <label className="text-sm text-sand-700">
        Consulta
        <Textarea {...form.register("message")} />
      </label>
      {requestError ? <p className="text-sm text-destructive">{requestError}</p> : null}
      {submittedId ? (
        <p className="rounded-2xl bg-agave/10 p-4 text-sm text-agave">
          Consulta enviada correctamente. ID: {submittedId}
        </p>
      ) : null}
      <Button type="submit" variant="secondary">
        Enviar consulta
      </Button>
    </form>
  );
}
