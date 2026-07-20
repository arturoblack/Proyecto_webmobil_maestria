// Formatos compartidos: un solo lugar para moneda y fechas (sin valores mágicos dispersos)
export const money = (value) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value ?? 0);

export const dateTime = (iso) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const MOVEMENT_LABELS = {
  entrada: { label: "ENTRADA", className: "text-bg-success" },
  salida: { label: "SALIDA", className: "text-bg-danger" },
  transferencia: { label: "TRANSFERENCIA", className: "text-bg-primary" },
  venta: { label: "VENTA", className: "text-bg-danger" },
};

export const ORDER_STATUS_LABELS = {
  pendiente: "badge-soft-amber",
  entregado: "badge-soft-green",
  recibido: "badge-soft-green",
  cancelado: "text-bg-secondary",
};
