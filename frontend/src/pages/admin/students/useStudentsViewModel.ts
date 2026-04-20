import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  fetchStudents,
  fetchStudentStats,
  fetchSyncStatus,
  triggerSync,
  revokeStudent,
  restoreStudent,
  type StudentListItem,
  type StudentStatsOverview,
  type SyncLog,
  type StudentListParams,
} from "../../../services/students";

export interface StudentsFiltersState {
  grade: string;      // "" = all
  status: string;     // "" = all
}

export function useStudentsViewModel() {
  const { authFetch } = useAuth();

  // Data
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [stats, setStats] = useState<StudentStatsOverview | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncLog | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const pageSize = 20;

  // Filters
  const [filters, setFilters] = useState<StudentsFiltersState>({
    grade: "",
    status: "ACTIVE",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("grade");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const mountedRef = useRef(true);

  // ── Load students ──────────────────────────────────────────────

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: StudentListParams = {
        page: currentPage,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (filters.grade) params.grade = filters.grade;
      if (filters.status) params.status = filters.status;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await fetchStudents(authFetch, params);
      if (!mountedRef.current) return;
      setStudents(data.items);
      setTotalPages(data.total_pages);
      setTotalStudents(data.total);
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Error al cargar estudiantes");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [authFetch, currentPage, pageSize, filters, searchQuery, sortBy, sortOrder]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStudentStats(authFetch);
      if (mountedRef.current) setStats(data);
    } catch {
      // stats are non-critical
    }
  }, [authFetch]);

  const loadSyncStatus = useCallback(async () => {
    try {
      const data = await fetchSyncStatus(authFetch);
      if (mountedRef.current) setSyncStatus(data);
    } catch {
      // non-critical
    }
  }, [authFetch]);

  useEffect(() => {
    mountedRef.current = true;
    loadStudents();
    loadStats();
    loadSyncStatus();
    return () => {
      mountedRef.current = false;
    };
  }, [loadStudents, loadStats, loadSyncStatus]);

  // ── Filter actions ─────────────────────────────────────────────

  const updateFilter = useCallback(
    (key: keyof StudentsFiltersState, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
  );

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ grade: "", status: "ACTIVE" });
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback(
    (col: string) => {
      if (sortBy === col) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(col);
        setSortOrder("asc");
      }
      setCurrentPage(1);
    },
    [sortBy],
  );

  // ── Sync ───────────────────────────────────────────────────────

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const log = await triggerSync(authFetch);
      if (mountedRef.current) {
        setSyncStatus(log);
        await loadStudents();
        await loadStats();
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Error al sincronizar");
      }
    } finally {
      if (mountedRef.current) setSyncing(false);
    }
  }, [authFetch, loadStudents, loadStats]);

  // ── Revoke / Restore ──────────────────────────────────────────

  const handleRevoke = useCallback(
    async (id: string, reason?: string) => {
      try {
        await revokeStudent(authFetch, id, reason);
        await loadStudents();
        await loadStats();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al revocar");
      }
    },
    [authFetch, loadStudents, loadStats],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await restoreStudent(authFetch, id);
        await loadStudents();
        await loadStats();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al restaurar");
      }
    },
    [authFetch, loadStudents, loadStats],
  );

  // ── Computed ───────────────────────────────────────────────────

  const visibleStart = totalStudents === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(currentPage * pageSize, totalStudents);

  return {
    // Data
    students,
    stats,
    syncStatus,

    // UI state
    loading,
    error,
    syncing,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    totalStudents,
    visibleStart,
    visibleEnd,

    // Filters
    filters,
    searchQuery,
    sortBy,
    sortOrder,
    updateFilter,
    handleSearch,
    clearFilters,
    handleSort,

    // Actions
    handleSync,
    handleRevoke,
    handleRestore,
    refresh: loadStudents,
  };
}
