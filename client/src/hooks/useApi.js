import { useCallback, useEffect, useState } from "react";
import { apiMessage } from "../api/client";

// Estados uniformes de carga/error/datos para todo consumo de la API (estándar 5.1)
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetcher();
      setData(response.data);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
