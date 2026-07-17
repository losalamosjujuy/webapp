"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { adminSeedState } from "@/data/admin-seed";
import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import type {
  AdminAdultPriceRate,
  AdminAvailabilityBlock,
  AdminGalleryItem,
  AdminGuest,
  AdminInquiry,
  AdminPriceSeason,
  AdminReservation,
  AdminSettings,
  AdminSiteContent,
  AdminState,
  AdminUnit,
  AdminUser
} from "@/types/admin";

interface AdminContextValue {
  state: AdminState;
  ready: boolean;
  updateReservation: (item: AdminReservation) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  updateGuest: (
    item: Omit<AdminGuest, "id" | "reservationsCount" | "status"> & {
      id?: string;
      reservationsCount: number;
      status: AdminGuest["status"];
    }
  ) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  updateInquiry: (item: Omit<AdminInquiry, "id"> & { id?: string }) => Promise<void>;
  deleteInquiry: (id: string) => Promise<void>;
      updateUnit: (
    item: Partial<AdminUnit> & {
        name: string;
        capacity: number;
        beds: string;
        status: AdminUnit["status"];
        description: string;
        adultPriceRates: AdminAdultPriceRate[];
        uploads?: Array<{ url: string; path: string; fileName: string }>;
        removedImageIds?: string[];
      }
  ) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  updateAvailabilityBlock: (item: Omit<AdminAvailabilityBlock, "id"> & { id?: string }) => Promise<void>;
  deleteAvailabilityBlock: (id: string) => Promise<void>;
  updatePriceSeason: (item: Omit<AdminPriceSeason, "id"> & { id?: string }) => Promise<void>;
  deletePriceSeason: (id: string) => Promise<void>;
  createGalleryItems: (payload: {
    title: string;
    category: AdminGalleryItem["category"];
    uploads: Array<{ url: string; path: string; fileName: string }>;
  }) => Promise<void>;
  updateGalleryItem: (item: AdminGalleryItem) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
  updateUser: (item: Omit<AdminUser, "id"> & { id?: string; password?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateSiteContent: (item: AdminSiteContent) => Promise<void>;
  updateSettings: (item: AdminSettings) => Promise<void>;
  resetState: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((entry) => entry.id === item.id);

  if (index === -1) {
    return [item, ...items];
  }

  return items.map((entry) => (entry.id === item.id ? item : entry));
}

function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((entry) => entry.id !== id);
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "No pudimos completar la accion en el panel.");
  }

  if (!data) {
    throw new Error("La respuesta del panel llego vacia.");
  }

  return data;
}

export function AdminProvider({
  children,
  initialState = adminSeedState
}: {
  children: React.ReactNode;
  initialState?: AdminState;
}) {
  const [state, setState] = useState<AdminState>(initialState);
  const [ready] = useState(true);
  const { notify, runBlockingAction } = useAppFeedback();

  const value = useMemo<AdminContextValue>(
    () => ({
      state,
      ready,
      updateReservation: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/reservations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ reservation: AdminReservation }>(response);
            setState((current) => ({
              ...current,
              reservations: upsertById(current.reservations, data.reservation)
            }));
          },
          {
            loadingMessage: "Estamos guardando la reserva en el panel.",
            successMessage: "La reserva se guardó correctamente."
          }
        );
      },
      deleteReservation: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/reservations?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              reservations: removeById(current.reservations, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando la reserva seleccionada.",
            successMessage: "La reserva se eliminó correctamente."
          }
        );
      },
      updateGuest: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/guests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ guest: AdminGuest }>(response);
            setState((current) => ({
              ...current,
              guests: upsertById(current.guests, data.guest)
            }));
          },
          {
            loadingMessage: "Estamos guardando el huésped.",
            successMessage: "El huésped se guardó correctamente."
          }
        );
      },
      deleteGuest: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/guests?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              guests: removeById(current.guests, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando el huésped.",
            successMessage: "El huésped se eliminó correctamente."
          }
        );
      },
      updateInquiry: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/inquiries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ inquiry: AdminInquiry }>(response);
            setState((current) => ({
              ...current,
              inquiries: upsertById(current.inquiries, data.inquiry)
            }));
          },
          {
            loadingMessage: "Estamos guardando la consulta.",
            successMessage: "La consulta se guardó correctamente."
          }
        );
      },
      deleteInquiry: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/inquiries?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              inquiries: removeById(current.inquiries, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando la consulta.",
            successMessage: "La consulta se eliminó correctamente."
          }
        );
      },
      updateUnit: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/units", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ unit: AdminUnit }>(response);
            setState((current) => ({
              ...current,
              units: upsertById(current.units, data.unit)
            }));
          },
          {
            loadingMessage: "Estamos guardando el alojamiento y sus tarifas.",
            successMessage: "El alojamiento se guardó correctamente."
          }
        );
      },
      deleteUnit: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/units?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              units: removeById(current.units, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando el alojamiento seleccionado.",
            successMessage: "El alojamiento se eliminó correctamente."
          }
        );
      },
      updateAvailabilityBlock: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/availability-blocks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ block: AdminAvailabilityBlock }>(response);
            setState((current) => ({
              ...current,
              availabilityBlocks: upsertById(current.availabilityBlocks, data.block)
            }));
          },
          {
            loadingMessage: "Estamos guardando el bloqueo de disponibilidad.",
            successMessage: "El bloqueo se guardó correctamente."
          }
        );
      },
      deleteAvailabilityBlock: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/availability-blocks?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              availabilityBlocks: removeById(current.availabilityBlocks, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando el bloqueo de disponibilidad.",
            successMessage: "El bloqueo se eliminó correctamente."
          }
        );
      },
      updatePriceSeason: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/pricing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ season: AdminPriceSeason }>(response);
            setState((current) => ({
              ...current,
              priceSeasons: upsertById(current.priceSeasons, data.season)
            }));
          },
          {
            loadingMessage: "Estamos guardando la temporada de precios.",
            successMessage: "La temporada se guardó correctamente."
          }
        );
      },
      deletePriceSeason: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/pricing?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              priceSeasons: removeById(current.priceSeasons, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando la temporada de precios.",
            successMessage: "La temporada se eliminó correctamente."
          }
        );
      },
      createGalleryItems: async (payload) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/gallery", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            const data = await readJsonOrThrow<{ items: AdminGalleryItem[] }>(response);
            setState((current) => ({
              ...current,
              gallery: [...data.items, ...current.gallery]
            }));
          },
          {
            loadingMessage: "Estamos subiendo la imagen a la galería.",
            successMessage: "La imagen se agregó correctamente."
          }
        );
      },
      updateGalleryItem: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/gallery", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ item: AdminGalleryItem }>(response);
            setState((current) => ({
              ...current,
              gallery: upsertById(current.gallery, data.item)
            }));
          },
          {
            loadingMessage: "Estamos guardando la imagen de la galería.",
            successMessage: "La imagen se guardó correctamente."
          }
        );
      },
      deleteGalleryItem: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              gallery: removeById(current.gallery, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando la imagen de la galería.",
            successMessage: "La imagen se eliminó correctamente."
          }
        );
      },
      updateUser: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            const data = await readJsonOrThrow<{ user: AdminUser }>(response);
            setState((current) => ({
              ...current,
              users: upsertById(current.users, data.user)
            }));
          },
          {
            loadingMessage: "Estamos guardando el usuario del panel.",
            successMessage: "El usuario se guardó correctamente."
          }
        );
      },
      deleteUser: async (id) => {
        await runBlockingAction(
          async () => {
            const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              users: removeById(current.users, id)
            }));
          },
          {
            loadingMessage: "Estamos eliminando el usuario seleccionado.",
            successMessage: "El usuario se eliminó correctamente."
          }
        );
      },
      updateSiteContent: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              siteContent: item
            }));
          },
          {
            loadingMessage: "Estamos guardando el contenido del sitio.",
            successMessage: "El contenido del sitio se guardó correctamente."
          }
        );
      },
      updateSettings: async (item) => {
        await runBlockingAction(
          async () => {
            const response = await fetch("/api/admin/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item)
            });
            await readJsonOrThrow(response);
            setState((current) => ({
              ...current,
              settings: item
            }));
          },
          {
            loadingMessage: "Estamos guardando la configuración general.",
            successMessage: "La configuración se guardó correctamente."
          }
        );
      },
      resetState: () => {
        setState(initialState);
        notify("info", "Se restauró el estado local del panel.");
      }
    }),
    [initialState, notify, ready, runBlockingAction, state]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }

  return context;
}
