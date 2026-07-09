"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inquirySchema } from "@/lib/validations/reservation";

type FormValues = z.infer<typeof inquirySchema>;

export function InquiryForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(inquirySchema)
  });

  async function onSubmit(values: FormValues) {
    console.info("Inquiry payload", values);
    form.reset();
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
      <Button type="submit" variant="secondary">
        Enviar consulta
      </Button>
    </form>
  );
}
