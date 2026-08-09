import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { BarraSuperior } from './components/BarraSuperior';
import { NavegacionInferior } from './components/NavegacionInferior';
import { PantallaExplorador } from './screens/PantallaExplorador';
import { PantallaMisRecetas } from './screens/PantallaMisRecetas';
import { PantallaDetalleReceta } from './screens/PantallaDetalleReceta';
import { PantallaEditorReceta } from './screens/PantallaEditorReceta';
import { PantallaDespensa } from './screens/PantallaDespensa';
import { PantallaEscaner } from './screens/PantallaEscaner';
import { PantallaListaCompra } from './screens/PantallaListaCompra';
import { PantallaMenuSemanal } from './screens/PantallaMenuSemanal';
import { PantallaAmigos } from './screens/PantallaAmigos';
import { PantallaAjustes } from './screens/PantallaAjustes';
import { PantallaPerfil } from './screens/PantallaPerfil';
import { PantallaImportarReceta } from './screens/PantallaImportarReceta';
import { PantallaAcceso } from './screens/PantallaAcceso';
import { PantallaGastos } from './screens/PantallaGastos';
import { PantallaTicket } from './screens/PantallaTicket';
import { useAuthStore } from './store/useAuthStore';
import { iniciarSyncFamiliar, refrescarDesdeServidor } from './store/sync';

function AppAutenticada() {
  const modo = useAuthStore((s) => s.modo);
  const token = useAuthStore((s) => s.token);
  const sincronizando = useAuthStore((s) => s.sincronizando);
  const ultimoError = useAuthStore((s) => s.ultimoError);

  useEffect(() => {
    iniciarSyncFamiliar();
  }, []);

  useEffect(() => {
    if (modo === 'familia' && token) {
      void refrescarDesdeServidor();
    }
  }, [modo, token]);

  if (modo === 'sin-elegir') {
    return (
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 pt-5 pb-10">
        <PantallaAcceso />
      </main>
    );
  }

  return (
    <>
      <BarraSuperior />
      {(sincronizando || ultimoError) && modo === 'familia' && (
        <div
          className={`text-center text-xs py-1.5 px-3 ${
            ultimoError
              ? 'bg-error-container text-on-error-container'
              : 'bg-primary-fixed text-on-primary-fixed-variant'
          }`}
        >
          {ultimoError ?? 'Sincronizando con el hogar…'}
        </div>
      )}
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 pt-5 pb-28">
        <Routes>
          <Route path="/" element={<PantallaExplorador />} />
          <Route path="/recetas" element={<PantallaMisRecetas />} />
          <Route path="/receta/nueva" element={<PantallaEditorReceta />} />
          <Route path="/receta/importar" element={<PantallaImportarReceta />} />
          <Route path="/receta/:id" element={<PantallaDetalleReceta />} />
          <Route path="/receta/:id/editar" element={<PantallaEditorReceta />} />
          <Route path="/despensa" element={<PantallaDespensa />} />
          <Route path="/escanear" element={<PantallaEscaner />} />
          <Route path="/compra" element={<PantallaListaCompra />} />
          <Route path="/gastos" element={<PantallaGastos />} />
          <Route path="/gastos/nuevo" element={<PantallaTicket />} />
          <Route path="/gastos/:id" element={<PantallaTicket />} />
          <Route path="/menu" element={<PantallaMenuSemanal />} />
          <Route path="/amigos" element={<PantallaAmigos />} />
          <Route path="/perfil" element={<PantallaPerfil />} />
          <Route path="/ajustes" element={<PantallaAjustes />} />
        </Routes>
      </main>
      <NavegacionInferior />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppAutenticada />
    </BrowserRouter>
  );
}
