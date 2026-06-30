import { useState, useEffect, useCallback } from "react";
import { fetchNotifications } from "../api/notifications";
import { Log } from "../logger";

export function useNotifications(token, page, filter) {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications(token, page, 10, filter);
      setNotifications(data.notifications ?? []);
      // Calculate total pages assuming 10 per page if API provides pagination
      if (data.pagination) {
          setTotal(data.pagination.total_items || 0);
          setTotalPages(data.pagination.total_pages || 1);
      } else {
          // Mock pagination if API doesn't return it
          setTotalPages(5); 
      }
      await Log('info', 'hook', 'Loaded notifications', token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return { notifications, total, totalPages, loading, error };
}
