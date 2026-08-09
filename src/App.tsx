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

export default function App() {
  return (
    <BrowserRouter>
      <BarraSuperior />
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
          <Route path="/menu" element={<PantallaMenuSemanal />} />
          <Route path="/amigos" element={<PantallaAmigos />} />
          <Route path="/perfil" element={<PantallaPerfil />} />
          <Route path="/ajustes" element={<PantallaAjustes />} />
        </Routes>
      </main>
      <NavegacionInferior />
    </BrowserRouter>
  );
}
