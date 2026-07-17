"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { ActionConfirmationDialog } from "@/components/admin/action-confirmation-dialog";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { propertyImages } from "@/data/property-images";
import { formatCurrency } from "@/lib/utils/format";
import { resolvePublicImage } from "@/lib/utils/images";
import type { AdminAdultPriceRate, AdminUnit } from "@/types/admin";

async function uploadAdminFiles({
  files,
  scope,
  entityId
}: {
  files: File[];
  scope: string;
  entityId?: string;
}) {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  formData.set("scope", scope);

  if (entityId) {
    formData.set("entityId", entityId);
  }

  files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/admin/media", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("upload_failed");
  }

  const data = await response.json();
  return data.uploads as Array<{ url: string; path: string; fileName: string }>;
}

function createRateRow(adults = 1, pricePerNight = 0): AdminAdultPriceRate {
  return {
    id: crypto.randomUUID(),
    adults,
    pricePerNight,
    active: true
  };
}

function parseTextList(value: FormDataEntryValue | null) {
  return (value?.toString() ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatTextList(items: string[]) {
  return items.join("\n");
}

function parseDetailList(value: FormDataEntryValue | null) {
  return (value?.toString() ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return {
        label: label?.trim() ?? "",
        value: rest.join(":").trim()
      };
    })
    .filter((item) => item.label && item.value);
}

function formatDetailList(items: Array<{ label: string; value: string }>) {
  return items.map((item) => `${item.label}: ${item.value}`).join("\n");
}

function StatusBadge({ value }: { value: AdminUnit["status"] }) {
  const tones: Record<AdminUnit["status"], string> = {
    active: "bg-[#ebf8ee] text-[#2f8b4b]",
    maintenance: "bg-[#fff3e8] text-[#a35f2b]",
    draft: "bg-[#f2efe9] text-[#7b695d]"
  };

  const labels: Record<AdminUnit["status"], string> = {
    active: "Activo",
    maintenance: "Mantenimiento",
    draft: "Borrador"
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[value]}`}>
      {labels[value]}
    </span>
  );
}

function Field({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#5f4f43]">{label}</span>
      {children}
    </label>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-12 w-full rounded-xl border border-[#e7d8ca] bg-white px-4 text-sm text-[#241b16]"
    />
  );
}

function Modal({
  children,
  onClose,
  open,
  title
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241b16]/45 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(52,31,18,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[#241b16]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eadccf] text-[#7d4d27]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RowActions({
  onDelete,
  onEdit
}: {
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadccf] text-[#7d4d27]"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#f0d8ce] text-[#b14f3d]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ConfirmationConfig {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  intent?: "default" | "danger";
  onConfirm: () => void;
  title: string;
}

export function UnitsSectionRich() {
  const { runBlockingAction } = useAppFeedback();
  const { state, updateUnit, deleteUnit } = useAdmin();
  const [editing, setEditing] = useState<AdminUnit | null>(null);
  const [open, setOpen] = useState(false);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [adultPriceRates, setAdultPriceRates] = useState<AdminAdultPriceRate[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationConfig | null>(null);

  const visibleEditingImages = useMemo(
    () => (editing?.images ?? []).filter((image) => !removedImageIds.includes(image.id)),
    [editing?.images, removedImageIds]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setAdultPriceRates(editing?.adultPriceRates?.length ? editing.adultPriceRates : [createRateRow()]);
    setFormError(null);
  }, [editing, open]);

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setRemovedImageIds([]);
    setAdultPriceRates([]);
    setFormError(null);
  }

  function askForConfirmation(config: ConfirmationConfig) {
    setConfirmation(config);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const capacity = Number(formData.get("capacity")?.toString() ?? 1);
    const duplicatedAdults = adultPriceRates
      .filter((rate) => rate.active)
      .map((rate) => rate.adults)
      .find((adults, index, list) => list.indexOf(adults) !== index);

    if (!adultPriceRates.length) {
      setFormError("Debes agregar al menos una tarifa por adultos.");
      return;
    }

    if (duplicatedAdults) {
      setFormError("No puede haber dos tarifas activas para la misma cantidad de adultos.");
      return;
    }

    if (adultPriceRates.some((rate) => rate.adults < 1 || rate.adults > capacity)) {
      setFormError("Cada tarifa debe tener una cantidad de adultos valida dentro de la capacidad maxima.");
      return;
    }

    const files = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const uploads = await runBlockingAction(
      () =>
        uploadAdminFiles({
          files,
          scope: "units",
          entityId: editing?.id
        }),
      {
        loadingMessage: "Estamos subiendo las imagenes del alojamiento.",
        successMessage: files.length
          ? "Las imagenes del alojamiento se subieron correctamente."
          : undefined
      }
    );

    await updateUnit({
      ...(editing?.id ? { id: editing.id } : {}),
      name: formData.get("name")?.toString() ?? "",
      capacity,
      bedrooms: Number(formData.get("bedrooms")?.toString() ?? 1),
      beds: formData.get("beds")?.toString() ?? "",
      bathrooms: Number(formData.get("bathrooms")?.toString() ?? 1),
      cleaningFee: Number(formData.get("cleaningFee")?.toString() ?? 0),
      image: editing?.image ?? uploads[0]?.url ?? "",
      images: visibleEditingImages,
      uploads,
      removedImageIds,
      status: (formData.get("status")?.toString() ?? "active") as AdminUnit["status"],
      shortDescription: formData.get("shortDescription")?.toString() ?? "",
      description: formData.get("description")?.toString() ?? "",
      amenities: parseTextList(formData.get("amenities")),
      highlights: parseTextList(formData.get("highlights")),
      details: parseDetailList(formData.get("details")),
      adultPriceRates
    });

    closeModal();
  }

  return (
    <AdminShell title="Alojamientos" description="Gestiona tus unidades y habitaciones." sectionNumber="05">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={() =>
              askForConfirmation({
                title: "Crear alojamiento",
                description: "Vas a abrir el formulario para crear un nuevo alojamiento.",
                confirmLabel: "Continuar",
                onConfirm: () => {
                  setEditing(null);
                  setRemovedImageIds([]);
                  setAdultPriceRates([createRateRow()]);
                  setOpen(true);
                }
              })
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Nuevo alojamiento
          </button>
        </div>

        <div className="space-y-4">
          {state.units.map((unit) => (
            <div
              key={unit.id}
              className="grid gap-4 rounded-[24px] border border-[#eadccf] bg-white p-4 shadow-[0_18px_50px_rgba(71,45,24,0.06)] lg:grid-cols-[120px_1fr_auto] lg:items-center"
            >
              <div className="relative aspect-[4/3] h-24 overflow-hidden rounded-2xl bg-[#f6efe8]">
                <Image alt={unit.name} fill src={resolvePublicImage(unit.image, propertyImages.roomDouble)} className="object-cover" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-[#241b16]">{unit.name}</h3>
                  <StatusBadge value={unit.status} />
                </div>
                <p className="mt-2 text-sm text-[#7b695d]">
                  {unit.capacity} huespedes · {unit.beds} · {unit.bedrooms} dorm. · {unit.bathrooms} bano(s)
                </p>
                <p className="mt-3 text-sm text-[#5f4f43]">{unit.shortDescription}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#241b16]">Desde {formatCurrency(unit.fromPricePerNight, "ARS")}</p>
                  <p className="text-xs text-[#7b695d]">Precio segun cantidad de adultos</p>
                </div>
                <RowActions
                  onEdit={() =>
                    askForConfirmation({
                      title: "Editar alojamiento",
                      description: `Vas a editar el alojamiento ${unit.name}.`,
                      confirmLabel: "Editar",
                      onConfirm: () => {
                        setEditing(unit);
                        setRemovedImageIds([]);
                        setAdultPriceRates(unit.adultPriceRates);
                        setOpen(true);
                      }
                    })
                  }
                  onDelete={() =>
                    askForConfirmation({
                      title: "Eliminar alojamiento",
                      description: `Esta accion eliminara el alojamiento ${unit.name}.`,
                      confirmLabel: "Eliminar",
                      intent: "danger",
                      onConfirm: () => void deleteUnit(unit.id)
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} title={editing ? "Editar alojamiento" : "Nuevo alojamiento"} onClose={closeModal}>
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre"><Input name="name" defaultValue={editing?.name} required /></Field>
          <Field label="Capacidad"><Input name="capacity" type="number" min={1} defaultValue={editing?.capacity ?? 2} required /></Field>
          <Field label="Dormitorios"><Input name="bedrooms" type="number" min={1} defaultValue={editing?.bedrooms ?? 1} required /></Field>
          <Field label="Camas"><Input name="beds" defaultValue={editing?.beds} required /></Field>
          <Field label="Banos"><Input name="bathrooms" type="number" min={1} step="0.5" defaultValue={editing?.bathrooms ?? 1} required /></Field>
          <Field label="Limpieza"><Input name="cleaningFee" type="number" min={0} defaultValue={editing?.cleaningFee ?? 0} required /></Field>
          <Field label="Estado">
            <Select name="status" defaultValue={editing?.status ?? "active"}>
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="draft">Borrador</option>
            </Select>
          </Field>
          <div className="md:col-span-2 rounded-2xl border border-[#eadccf] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#241b16]">Tarifas por cantidad de adultos</p>
                <p className="mt-1 text-xs text-[#7b695d]">Cada cantidad de adultos tiene su precio por noche independiente.</p>
              </div>
              <button
                type="button"
                onClick={() => setAdultPriceRates((current) => [...current, createRateRow()])}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cfae92] px-4 text-sm font-semibold text-[#7d4d27]"
              >
                <Plus className="h-4 w-4" />
                Agregar tarifa
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#eadccf]">
              <table className="min-w-full text-sm">
                <thead className="bg-[#faf4ed] text-left text-[#5f4f43]">
                  <tr>
                    <th className="px-4 py-3">Cantidad de adultos</th>
                    <th className="px-4 py-3">Precio por noche</th>
                    <th className="px-4 py-3">Activa</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {adultPriceRates.map((rate, index) => (
                    <tr key={rate.id} className="border-t border-[#f0e5db]">
                      <td className="px-4 py-3">
                        <Input
                          min={1}
                          type="number"
                          value={rate.adults}
                          onChange={(event) =>
                            setAdultPriceRates((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? { ...item, adults: Number(event.target.value || 1) }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          min={0}
                          type="number"
                          value={rate.pricePerNight}
                          onChange={(event) =>
                            setAdultPriceRates((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? { ...item, pricePerNight: Number(event.target.value || 0) }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={rate.active}
                          onChange={(event) =>
                            setAdultPriceRates((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? { ...item, active: event.target.checked }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            askForConfirmation({
                              title: "Eliminar tarifa",
                              description: `Esta accion eliminara la tarifa para ${rate.adults} adulto(s).`,
                              confirmLabel: "Eliminar",
                              intent: "danger",
                              onConfirm: () =>
                                setAdultPriceRates((current) =>
                                  current.filter((_, currentIndex) => currentIndex !== index)
                                )
                            })
                          }
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#f0d8ce] text-[#b14f3d]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:col-span-2">
            <Field label="Descripcion corta"><Textarea name="shortDescription" defaultValue={editing?.shortDescription} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Descripcion completa"><Textarea name="description" defaultValue={editing?.description} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Amenities (uno por linea)">
              <Textarea name="amenities" defaultValue={formatTextList(editing?.amenities ?? [])} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Highlights (uno por linea)">
              <Textarea name="highlights" defaultValue={formatTextList(editing?.highlights ?? [])} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Detalles (Etiqueta: valor)">
              <Textarea name="details" defaultValue={formatDetailList(editing?.details ?? [])} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Imagenes">
              <input
                name="images"
                type="file"
                accept="image/*"
                multiple
                className="block w-full rounded-xl border border-[#e7d8ca] px-4 py-3 text-sm text-[#241b16]"
              />
            </Field>
            <p className="mt-2 text-xs text-[#7b695d]">
              Sube nuevas fotos y elimina las existentes desde la grilla.
            </p>
            {visibleEditingImages.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {visibleEditingImages.map((image) => (
                  <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#eadccf]">
                    <Image
                      alt={image.altText || editing?.name || "Alojamiento"}
                      fill
                      src={resolvePublicImage(image.url, propertyImages.gallery)}
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        askForConfirmation({
                          title: "Quitar imagen",
                          description: "Esta accion quitara la imagen del alojamiento cuando guardes los cambios.",
                          confirmLabel: "Quitar",
                          intent: "danger",
                          onConfirm: () => setRemovedImageIds((current) => [...current, image.id])
                        })
                      }
                      className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#7d4d27] shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {formError ? <p className="md:col-span-2 text-sm text-[#b14f3d]">{formError}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar alojamiento
            </button>
          </div>
        </form>
      </Modal>
      <ActionConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ""}
        description={confirmation?.description ?? ""}
        confirmLabel={confirmation?.confirmLabel}
        cancelLabel={confirmation?.cancelLabel}
        intent={confirmation?.intent}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          confirmation?.onConfirm();
          setConfirmation(null);
        }}
      />
    </AdminShell>
  );
}
