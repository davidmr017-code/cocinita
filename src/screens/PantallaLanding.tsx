import { useEffect, useState } from 'react';

import { IMAGENES } from '../data/seed';
import { useTraduccion } from '../i18n/useTraduccion';
import { Icono } from '../components/Icono';
import { RevelarAlScroll } from '../components/RevelarAlScroll';

interface PantallaLandingProps {
  /** Abre el formulario de acceso (crear hogar o unirse). */
  onEmpezar: () => void;
  /** Entra en modo local sin cuenta ni nube. */
  onProbarLocal: () => void;
}

type Funcion = {
  icono: string;
  titulo: string;
  texto: string;
  acento: 'primario' | 'secundario';
};

/** Barra de progreso de lectura que se llena al hacer scroll. */
function ProgresoScroll() {
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    const calcular = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      setProgreso(alto > 0 ? Math.min(1, window.scrollY / alto) : 0);
    };
    calcular();
    window.addEventListener('scroll', calcular, { passive: true });
    window.addEventListener('resize', calcular);
    return () => {
      window.removeEventListener('scroll', calcular);
      window.removeEventListener('resize', calcular);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-primary origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progreso})`, width: '100%' }}
      />
    </div>
  );
}

export function PantallaLanding({ onEmpezar, onProbarLocal }: PantallaLandingProps) {
  const { t } = useTraduccion();
  const [desplazado, setDesplazado] = useState(false);

  useEffect(() => {
    const alScroll = () => setDesplazado(window.scrollY > 24);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  const funciones: Funcion[] = [
    {
      icono: 'kitchen',
      titulo: t('landing.f1Titulo'),
      texto: t('landing.f1Texto'),
      acento: 'primario',
    },
    {
      icono: 'barcode_scanner',
      titulo: t('landing.f2Titulo'),
      texto: t('landing.f2Texto'),
      acento: 'secundario',
    },
    {
      icono: 'auto_awesome',
      titulo: t('landing.f3Titulo'),
      texto: t('landing.f3Texto'),
      acento: 'primario',
    },
    {
      icono: 'shopping_cart',
      titulo: t('landing.f4Titulo'),
      texto: t('landing.f4Texto'),
      acento: 'secundario',
    },
    {
      icono: 'calendar_month',
      titulo: t('landing.f5Titulo'),
      texto: t('landing.f5Texto'),
      acento: 'primario',
    },
    {
      icono: 'receipt_long',
      titulo: t('landing.f6Titulo'),
      texto: t('landing.f6Texto'),
      acento: 'secundario',
    },
    {
      icono: 'family_restroom',
      titulo: t('landing.f7Titulo'),
      texto: t('landing.f7Texto'),
      acento: 'primario',
    },
    {
      icono: 'menu_book',
      titulo: t('landing.f8Titulo'),
      texto: t('landing.f8Texto'),
      acento: 'secundario',
    },
  ];

  const pasos = [
    { icono: 'home', titulo: t('landing.p1Titulo'), texto: t('landing.p1Texto') },
    { icono: 'kitchen', titulo: t('landing.p2Titulo'), texto: t('landing.p2Texto') },
    { icono: 'skillet', titulo: t('landing.p3Titulo'), texto: t('landing.p3Texto') },
  ];

  return (
    <div className="min-h-screen">
      <ProgresoScroll />

      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          desplazado ? 'barra-cocina' : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1180px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center sombra-cocina">
              <Icono nombre="skillet" className="text-on-primary text-xl" />
            </div>
            <span className="font-serif font-extrabold text-xl text-primary tracking-tight">
              Cocinita
            </span>
          </div>
          <button type="button" onClick={onEmpezar} className="btn-primario py-2.5 px-4 text-sm">
            {t('landing.entrar')}
          </button>
        </div>
      </header>

      {/* ---------------------------------- HERO --------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          className="mancha-hero w-[26rem] h-[26rem] -top-32 -left-24 bg-primary/25"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="mancha-hero w-[22rem] h-[22rem] top-24 -right-20 bg-secondary/20"
          style={{ animationDelay: '2.5s' }}
        />

        <div className="relative max-w-[1180px] mx-auto px-4 md:px-8 pt-12 pb-20 md:pt-20 md:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <RevelarAlScroll>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] bg-primary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wide">
                <Icono nombre="auto_awesome" className="text-sm" />
                {t('landing.badge')}
              </span>
            </RevelarAlScroll>

            <RevelarAlScroll retardo={80}>
              <h1 className="titulo-pagina mt-4 text-balance">
                {t('landing.heroTitulo')}{' '}
                <span className="texto-degradado">{t('landing.heroTituloAcento')}</span>
              </h1>
            </RevelarAlScroll>

            <RevelarAlScroll retardo={160}>
              <p className="subtitulo-pagina text-lg max-w-xl">{t('landing.heroSub')}</p>
            </RevelarAlScroll>

            <RevelarAlScroll retardo={240}>
              <div className="flex flex-wrap gap-3 mt-7">
                <button type="button" onClick={onEmpezar} className="btn-primario">
                  <Icono nombre="rocket_launch" />
                  {t('landing.ctaPrincipal')}
                </button>
                <button type="button" onClick={onProbarLocal} className="btn-secundario">
                  <Icono nombre="phone_iphone" />
                  {t('landing.ctaSecundario')}
                </button>
              </div>
            </RevelarAlScroll>

            <RevelarAlScroll retardo={320}>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-on-surface-variant">
                {[t('landing.punto1'), t('landing.punto2'), t('landing.punto3')].map((p) => (
                  <li key={p} className="flex items-center gap-1.5">
                    <Icono nombre="check_circle" className="text-primary text-base" />
                    {p}
                  </li>
                ))}
              </ul>
            </RevelarAlScroll>
          </div>

          <RevelarAlScroll direccion="zoom" retardo={200} className="relative">
            <div className="relative mx-auto max-w-sm">
              <div className="tarjeta px-4 pt-4 pb-9 sombra-cocina flotar-suave">
                <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/70">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                    <Icono nombre="kitchen" className="text-primary text-xl" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-base leading-tight">
                      {t('landing.tarjetaDespensa')}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      <span className="font-bold text-primary tabular-nums">24</span>{' '}
                      {t('landing.tarjetaDespensaSub')}
                    </p>
                  </div>
                </div>

                <ul className="flex flex-col gap-2.5 pt-3">
                  {[
                    { img: IMAGENES.espinacas, nombre: 'Espinacas', cant: '150 g', estado: null },
                    {
                      img: IMAGENES.leche,
                      nombre: 'Leche entera',
                      cant: '1 ud',
                      estado: t('landing.mockPoco'),
                    },
                    { img: IMAGENES.arroz, nombre: 'Arroz bomba', cant: '500 g', estado: null },
                  ].map((item) => (
                    <li key={item.nombre} className="flex items-center gap-2.5">
                      <img
                        src={item.img}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-surface-container-low"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{item.nombre}</p>
                        {item.estado ? (
                          <span className="text-[11px] text-secondary font-semibold">
                            {item.estado}
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant">
                            {t('landing.mockEnStock')}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-on-surface-variant tabular-nums shrink-0">
                        {item.cant}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="tarjeta p-3 absolute -bottom-7 -left-5 w-52 sombra-cocina">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
                    <Icono nombre="auto_awesome" className="text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{t('landing.tarjetaChef')}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      {t('landing.tarjetaChefSub')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="tarjeta p-3 absolute -top-6 -right-4 w-44 sombra-cocina">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                    <Icono nombre="shopping_cart" className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{t('landing.tarjetaCompra')}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      {t('landing.tarjetaCompraSub')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RevelarAlScroll>
        </div>
      </section>

      {/* -------------------------------- FUNCIONES ------------------------------- */}
      <section className="max-w-[1180px] mx-auto px-4 md:px-8 py-16 md:py-24">
        <RevelarAlScroll className="text-center max-w-2xl mx-auto">
          <span className="etiqueta etiqueta-terracota">{t('landing.funcionesBadge')}</span>
          <h2 className="titulo-pagina text-3xl md:text-4xl mt-3">{t('landing.funcionesTitulo')}</h2>
          <p className="subtitulo-pagina mx-auto">{t('landing.funcionesSub')}</p>
        </RevelarAlScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {funciones.map((f, i) => (
            <RevelarAlScroll
              key={f.titulo}
              retardo={(i % 4) * 90}
              className="tarjeta tarjeta-interactiva p-5 h-full"
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${
                  f.acento === 'primario'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-secondary-fixed text-secondary'
                }`}
              >
                <Icono nombre={f.icono} className="text-2xl" />
              </div>
              <h3 className="font-serif font-bold text-base leading-tight">{f.titulo}</h3>
              <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">{f.texto}</p>
            </RevelarAlScroll>
          ))}
        </div>
      </section>

      {/* ------------------------------- CHEF IA ---------------------------------- */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="mancha-hero w-[24rem] h-[24rem] top-0 left-1/3 bg-primary/15" />
        <div className="relative max-w-[1180px] mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <RevelarAlScroll direccion="izquierda">
            <span className="etiqueta etiqueta-salvia">{t('landing.chefBadge')}</span>
            <h2 className="titulo-pagina text-3xl md:text-4xl mt-3">{t('landing.chefTitulo')}</h2>
            <p className="subtitulo-pagina">{t('landing.chefSub')}</p>
            <ul className="flex flex-col gap-3 mt-6">
              {[t('landing.chefP1'), t('landing.chefP2'), t('landing.chefP3')].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Icono nombre="check" className="text-base" />
                  </span>
                  <span className="text-on-surface-variant">{p}</span>
                </li>
              ))}
            </ul>
          </RevelarAlScroll>

          <RevelarAlScroll direccion="derecha" retardo={120}>
            <div className="tarjeta p-4 flex flex-col gap-3 sombra-cocina">
              <div className="self-end max-w-[85%] bg-primary text-on-primary rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                {t('landing.chatUsuario')}
              </div>
              <div className="self-start max-w-[85%] bg-surface-container-low border border-outline-variant/50 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                {t('landing.chatChef')}
              </div>
              <div className="rounded-2xl bg-secondary-fixed/40 border border-secondary/20 p-3">
                <p className="text-xs font-bold text-secondary flex items-center gap-1 mb-2">
                  <Icono nombre="shopping_cart" className="text-sm" />
                  {t('landing.chatFaltan')}
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {[t('landing.chatItem1'), t('landing.chatItem2')].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Icono nombre="add_shopping_cart" className="text-secondary text-base" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevelarAlScroll>
        </div>
      </section>

      {/* ------------------------------ CÓMO FUNCIONA ----------------------------- */}
      <section className="max-w-[1180px] mx-auto px-4 md:px-8 py-16 md:py-24">
        <RevelarAlScroll className="text-center max-w-2xl mx-auto">
          <span className="etiqueta etiqueta-terracota">{t('landing.pasosBadge')}</span>
          <h2 className="titulo-pagina text-3xl md:text-4xl mt-3">{t('landing.pasosTitulo')}</h2>
          <p className="subtitulo-pagina mx-auto">{t('landing.pasosSub')}</p>
        </RevelarAlScroll>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {pasos.map((paso, i) => (
            <RevelarAlScroll key={paso.titulo} retardo={i * 130} className="relative">
              <div className="tarjeta p-6 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 rounded-2xl bg-primary text-on-primary font-serif font-extrabold flex items-center justify-center sombra-cocina">
                    {i + 1}
                  </span>
                  <Icono nombre={paso.icono} className="text-2xl text-primary" />
                </div>
                <h3 className="font-serif font-bold text-lg leading-tight">{paso.titulo}</h3>
                <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                  {paso.texto}
                </p>
              </div>
            </RevelarAlScroll>
          ))}
        </div>
      </section>

      {/* --------------------------------- CTA FINAL ------------------------------ */}
      <section className="max-w-[1180px] mx-auto px-4 md:px-8 pb-20">
        <RevelarAlScroll direccion="zoom">
          <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] bg-primary text-on-primary px-6 py-12 md:py-16 text-center sombra-cocina">
            <div className="mancha-hero w-72 h-72 -top-20 -left-10 bg-white/20" />
            <div className="mancha-hero w-64 h-64 -bottom-24 -right-10 bg-secondary/40" />
            <div className="relative">
              <h2 className="font-serif font-extrabold text-3xl md:text-4xl tracking-tight">
                {t('landing.ctaTitulo')}
              </h2>
              <p className="mt-3 text-on-primary/85 max-w-lg mx-auto">{t('landing.ctaSub')}</p>
              <div className="flex flex-wrap gap-3 justify-center mt-7">
                <button
                  type="button"
                  onClick={onEmpezar}
                  className="cursor-pointer inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-btn)] bg-surface text-primary font-semibold hover:bg-surface-container-low active:scale-97 transition-all"
                >
                  <Icono nombre="home" />
                  {t('landing.ctaPrincipal')}
                </button>
                <button
                  type="button"
                  onClick={onProbarLocal}
                  className="cursor-pointer inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-btn)] border border-on-primary/40 font-semibold hover:bg-on-primary/10 active:scale-97 transition-all"
                >
                  {t('landing.ctaSecundario')}
                </button>
              </div>
            </div>
          </div>
        </RevelarAlScroll>
      </section>

      <footer className="border-t border-outline-variant/60 py-8">
        <div className="max-w-[1180px] mx-auto px-4 md:px-8 flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Icono nombre="skillet" className="text-primary" />
            <span className="font-serif font-bold text-primary">Cocinita</span>
          </div>
          <p>{t('landing.pie')}</p>
        </div>
      </footer>
    </div>
  );
}
