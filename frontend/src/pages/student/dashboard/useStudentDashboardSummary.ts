import { useCallback, useEffect, useState } from "react";
import { fetchStudentDashboardSummary, type AuthFetch, type StudentDashboardSummary } from "../../../services/dashboard";

interface UseStudentDashboardSummaryOptions {
  authFetch: AuthFetch;
  userId: number | null;
}

interface UseStudentDashboardSummaryResult {
  summary: StudentDashboardSummary | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useStudentDashboardSummary({ authFetch, userId }: UseStudentDashboardSummaryOptions): UseStudentDashboardSummaryResult {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const nextSummary = await fetchStudentDashboardSummary(authFetch, userId);
    setSummary(nextSummary);
    setLoading(false);
  }, [authFetch, userId]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const nextSummary = await fetchStudentDashboardSummary(authFetch, userId);
      if (!active) {
        return;
      }
      setSummary(nextSummary);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [authFetch, userId]);

  return {
    summary,
    loading,
    reload: loadSummary,
  };
}