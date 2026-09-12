import { useEffect, useState } from "react";

/**
 * Aviso de falta de conexión.
 *
 * LibreStock se instala como aplicación, pero NO opera sin conexión: el stock se valida
 * siempre en el servidor dentro de una transacción. Por eso el aviso es explícito en vez
 * de aparentar que la aplicación sigue funcionando.
 */
export default function OfflineNotice() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <output
      className="position-fixed top-0 start-0 end-0 text-white text-center py-2 px-3 small fw-bold"
      style={{ background: "var(--ls-red)", zIndex: 1080 }}
    >
      Sin conexión — LibreStock necesita internet para consultar stock y registrar ventas.
    </output>
  );
}
