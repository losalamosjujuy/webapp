"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { adminSeedState } from "@/data/admin-seed";
import type {
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
  updateGuest: (item: AdminGuest) => void;
  deleteGuest: (id: string) => void;
  updateInquiry: (item: AdminInquiry) => void;
  deleteInquiry: (id: string) => void;
  updateUnit: (item: AdminUnit & { uploads?: Array<{ url: string; path: string; fileName: string }> }) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  updateAvailabilityBlock: (item: AdminAvailabilityBlock) => Promise<void>;
  deleteAvailabilityBlock: (id: string) => Promise<void>;
  updatePriceSeason: (item: AdminPriceSeason) => void;
  deletePriceSeason: (id: string) => void;
  createGalleryItems: (payload: {
    title: string;
    category: AdminGalleryItem["category"];
    uploads: Array<{ url: string; path: string; fileName: string }>;
  }) => Promise<void>;
  updateGalleryItem: (item: AdminGalleryItem) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
  updateUser: (item: AdminUser) => void;
  deleteUser: (id: string) => void;
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

export function AdminProvider({
  children,
  initialState = adminSeedState
}: {
  children: React.ReactNode;
  initialState?: AdminState;
}) {
  const [state, setState] = useState<AdminState>(initialState);
  const [ready] = useState(true);

  const value = useMemo<AdminContextValue>(
    () => ({
      state,
      ready,
      updateReservation: async (item) => {
        const response = await fetch("/api/admin/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const data = await response.json();
        setState((current) => ({
          ...current,
          reservations: upsertById(current.reservations, data.reservation)
        }));
      },
      deleteReservation: async (id) => {
        await fetch(`/api/admin/reservations?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
        setState((current) => ({
          ...current,
          reservations: removeById(current.reservations, id)
        }));
      },
      updateGuest: (item) =>
        setState((current) => ({
          ...current,
          guests: upsertById(current.guests, item)
        })),
      deleteGuest: (id) =>
        setState((current) => ({
          ...current,
          guests: removeById(current.guests, id)
        })),
      updateInquiry: (item) =>
        setState((current) => ({
          ...current,
          inquiries: upsertById(current.inquiries, item)
        })),
      deleteInquiry: (id) =>
        setState((current) => ({
          ...current,
          inquiries: removeById(current.inquiries, id)
        })),
      updateUnit: async (item) => {
        const response = await fetch("/api/admin/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const data = await response.json();
        setState((current) => ({
          ...current,
          units: upsertById(current.units, data.unit)
        }));
      },
      deleteUnit: async (id) => {
        await fetch(`/api/admin/units?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
        setState((current) => ({
          ...current,
          units: removeById(current.units, id)
        }));
      },
      updateAvailabilityBlock: async (item) => {
        const response = await fetch("/api/admin/availability-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const data = await response.json();
        setState((current) => ({
          ...current,
          availabilityBlocks: upsertById(current.availabilityBlocks, data.block)
        }));
      },
      deleteAvailabilityBlock: async (id) => {
        await fetch(`/api/admin/availability-blocks?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
        setState((current) => ({
          ...current,
          availabilityBlocks: removeById(current.availabilityBlocks, id)
        }));
      },
      updatePriceSeason: (item) =>
        setState((current) => ({
          ...current,
          priceSeasons: upsertById(current.priceSeasons, item)
        })),
      deletePriceSeason: (id) =>
        setState((current) => ({
          ...current,
          priceSeasons: removeById(current.priceSeasons, id)
        })),
      createGalleryItems: async (payload) => {
        const response = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        setState((current) => ({
          ...current,
          gallery: [...data.items, ...current.gallery]
        }));
      },
      updateGalleryItem: async (item) => {
        const response = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const data = await response.json();
        setState((current) => ({
          ...current,
          gallery: upsertById(current.gallery, data.item)
        }));
      },
      deleteGalleryItem: async (id) => {
        await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
        setState((current) => ({
          ...current,
          gallery: removeById(current.gallery, id)
        }));
      },
      updateUser: (item) =>
        setState((current) => ({
          ...current,
          users: upsertById(current.users, item)
        })),
      deleteUser: (id) =>
        setState((current) => ({
          ...current,
          users: removeById(current.users, id)
        })),
      updateSiteContent: async (item) => {
        await fetch("/api/admin/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        setState((current) => ({
          ...current,
          siteContent: item
        }));
      },
      updateSettings: async (item) => {
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        setState((current) => ({
          ...current,
          settings: item
        }));
      },
      resetState: () => setState(initialState)
    }),
    [initialState, ready, state]
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
