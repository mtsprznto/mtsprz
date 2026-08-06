/**
 * Leads store (Zustand vanilla · sin React).
 * Estado global del panel /admin/leads: lista paginada, filtros, stats.
 * La URL permanece limpia · todo el estado vive aquí.
 */

import { createStore } from "zustand/vanilla";

export type LeadStatus = "new" | "contacted" | "qualified" | "lost";

export interface Lead {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  service_interest: string | null;
  message: string | null;
  status: LeadStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type LeadFilters = { status: string; source: string; search: string };

interface LeadsState {
  leads: Lead[];
  total: number;
  stats: Record<string, number>;
  page: number;
  perPage: number;
  totalPages: number;
  filters: LeadFilters;
  loading: boolean;
  error: string | null;
}

interface LeadsActions {
  /** Fetch de la página actual según filtros. Clampa página si quedó fuera de rango. */
  fetchLeads: () => Promise<void>;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setFilter: (key: keyof LeadFilters, value: string) => void;
}

export type LeadsStore = LeadsState & LeadsActions;

const EMPTY_STATS = { new: 0, contacted: 0, qualified: 0, lost: 0 };

export const useLeadsStore = createStore<LeadsStore>((set, get) => ({
  leads: [],
  total: 0,
  stats: EMPTY_STATS,
  page: 1,
  perPage: 10,
  totalPages: 1,
  filters: { status: "", source: "", search: "" },
  loading: false,
  error: null,

  fetchLeads: async () => {
    const { page, perPage, filters } = get();
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/leads?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar leads");

      const totalPages = Math.max(data.total_pages || Math.ceil((data.total || 0) / perPage), 1);
      // Página fuera de rango (filtro redujo resultados) → clamp y re-fetch
      if (page > totalPages) {
        set({ page: totalPages });
        return get().fetchLeads();
      }

      set({
        leads: data.leads || [],
        total: data.total || 0,
        stats: data.stats || EMPTY_STATS,
        totalPages,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  setPage: (page) => {
    const { totalPages } = get();
    const next = Math.max(1, Math.min(page, totalPages));
    if (next === get().page) return;
    set({ page: next });
    void get().fetchLeads();
  },

  nextPage: () => get().setPage(get().page + 1),
  prevPage: () => get().setPage(get().page - 1),

  setFilter: (key, value) => {
    set({ filters: { ...get().filters, [key]: value }, page: 1 });
    void get().fetchLeads();
  },
}));
