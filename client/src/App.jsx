import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import OfflineNotice from "./components/OfflineNotice";
import { RequireAuth, RequireAdmin } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sell from "./pages/Sell";
import Movements from "./pages/Movements";
import CustomerOrders from "./pages/CustomerOrders";
import PurchaseOrders from "./pages/PurchaseOrders";
import Products from "./pages/Products";
import Locations from "./pages/Locations";
import Users from "./pages/Users";

export default function App() {
  return (
    <BrowserRouter>
      <OfflineNotice />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="vender" element={<Sell />} />
          <Route path="movimientos" element={<Movements />} />
          <Route path="pedidos-clientes" element={<CustomerOrders />} />
          <Route path="pedidos-proveedor" element={<RequireAdmin><PurchaseOrders /></RequireAdmin>} />
          <Route path="productos" element={<RequireAdmin><Products /></RequireAdmin>} />
          <Route path="ubicaciones" element={<RequireAdmin><Locations /></RequireAdmin>} />
          <Route path="usuarios" element={<RequireAdmin><Users /></RequireAdmin>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
