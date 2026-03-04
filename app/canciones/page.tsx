import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import EstadoCategoriasPendientes from "@/components/EstadoCategoriasPendientes";
import RepertorioToggleButton from "@/components/RepertorioToggleButton";
import { categoriasLiturgicasDesdeTexto, etiquetaCategoria, hasCategoriaLiturgica, normalizarTexto } from "@/lib/categorias";

export const dynamic = "force-dynamic";

type CancionListaItem = RowDataPacket & {
  titulo: string;
  slug: string;
  categoria: string | null;
  tiempo_liturgico: string | null;
};

type SearchParams = {
  select?: string | string[];
};

const CATEGORIAS_MISA = [
  "Entrada",
  "Perdon",
  "Gloria",
  "Aleluya",
  "Ofertorio",
  "Santo",
  "Cordero",
  "Comunion",
  "Salida",
] as const;

const TIEMPOS_LITURGICOS = [
  "Tiempo Ordinario",
  "Adviento",
  "Cuaresma",
  "Pascua",
  "Navidad",
  "Otros",
] as const;

async function getCanciones() {
  const [rows] = await pool.query<CancionListaItem[]>(
    `
      SELECT titulo, slug, categoria, tiempo_liturgico
      FROM canciones
      ORDER BY
        CASE LOWER(TRIM(tiempo_liturgico))
          WHEN 'adviento' THEN 1
          WHEN 'navidad' THEN 2
          WHEN 'cuaresma' THEN 3
          WHEN 'pascua' THEN 4
          WHEN 'tiempo ordinario' THEN 5
          WHEN 'ordinario' THEN 5
          ELSE 99
        END ASC,
        CASE LOWER(TRIM(categoria))
          WHEN 'entrada' THEN 1
          WHEN 'perdon' THEN 2
          WHEN 'gloria' THEN 3
          WHEN 'aleluya' THEN 4
          WHEN 'ofertorio' THEN 5
          WHEN 'santo' THEN 6
          WHEN 'cordero' THEN 7
          WHEN 'comunion' THEN 8
          WHEN 'salida' THEN 9
          ELSE 99
        END ASC,
        titulo ASC
    `
  );
  return rows ?? [];
}

export default async function CancionesPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const canciones = await getCanciones();
  const params = (await searchParams) ?? {};
  const selectValue = Array.isArray(params.select) ? params.select[0] : params.select;
  const showAgregar = selectValue === "1";

  const cancionesPorTiempo = TIEMPOS_LITURGICOS.map(tiempo => {
    const cancionesDeTiempo = canciones.filter(cancion => {
      const tiempoCancion = normalizarTexto(cancion.tiempo_liturgico);
      if (tiempo === "Otros") {
        return tiempoCancion.includes(normalizarTexto("Todo el ano liturgico"));
      }
      return tiempoCancion === normalizarTexto(tiempo);
    });

    const cancionesPorCategoria = CATEGORIAS_MISA.map(categoria => {
      const cancionesDeCategoria = cancionesDeTiempo.filter(cancion =>
        hasCategoriaLiturgica(cancion.categoria, categoria)
      );
      return { categoria, canciones: cancionesDeCategoria };
    });

    return { tiempo, cancionesPorCategoria };
  });

  return (
    <main className="bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Repertorio</p>
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Lista de canciones</h1>
              <p className="mt-2 text-sm text-slate-600">
                {showAgregar
                  ? "Modo seleccion: agrega cantos al repertorio."
                  : "Explora los cantos por tiempo liturgico y categoria."}
              </p>
              {showAgregar ? (
                <>
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Limites: maximo 9 canciones en total y solo 1 por categoria liturgica.
                  </p>
                  <EstadoCategoriasPendientes categorias={CATEGORIAS_MISA} />
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/repertorio"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Ver repertorio
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Volver al calendario
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {canciones.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-600">No hay canciones registradas.</p>
          ) : (
            <div className="space-y-5">
              {cancionesPorTiempo.map(grupo => (
                <details key={grupo.tiempo} className="rounded-xl border border-slate-200 bg-white" open={false}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">{grupo.tiempo}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {grupo.cancionesPorCategoria.reduce((acc, c) => acc + c.canciones.length, 0)} canciones
                    </span>
                  </summary>

                  <div className="border-t border-slate-200 px-4 py-4">
                    {grupo.cancionesPorCategoria.every(t => t.canciones.length === 0) ? (
                      <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                        No hay canciones en este tiempo liturgico.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {grupo.cancionesPorCategoria
                          .filter(bloqueCategoria => bloqueCategoria.canciones.length > 0)
                          .map(bloqueCategoria => (
                            <div key={`${grupo.tiempo}-${bloqueCategoria.categoria}`} className="space-y-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {bloqueCategoria.categoria} ({bloqueCategoria.canciones.length})
                              </h3>

                              <div className="grid gap-3 sm:grid-cols-2">
                                {bloqueCategoria.canciones.map(cancion => {
                                  const categorias = categoriasLiturgicasDesdeTexto(cancion.categoria);

                                  return (
                                    <article
                                      key={`${bloqueCategoria.categoria}-${cancion.slug}`}
                                      className="group relative rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                    >
                                      <Link
                                        href={`/canciones/${cancion.slug}`}
                                        className="absolute inset-0 z-10 rounded-xl"
                                        aria-label={`Abrir cancion ${cancion.titulo}`}
                                      />

                                      <div className="relative z-0 space-y-3">
                                        <div className="space-y-1">
                                          <p className="text-base font-semibold leading-tight text-slate-900">{cancion.titulo}</p>
                                          <p className="text-xs text-slate-500">Pulsa en cualquier parte de la tarjeta para abrir.</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          {categorias.length > 0 ? (
                                            categorias.map(cat => (
                                              <span
                                                key={`${cancion.slug}-${cat}`}
                                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                              >
                                                {etiquetaCategoria(cat)}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                              Sin categoria
                                            </span>
                                          )}

                                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                            {cancion.tiempo_liturgico || "Sin tiempo"}
                                          </span>
                                        </div>
                                      </div>

                                      {showAgregar ? (
                                        <div className="relative z-20 mt-3 flex justify-end">
                                          <RepertorioToggleButton
                                            categoriaContexto={bloqueCategoria.categoria}
                                            mode="addOnly"
                                            item={{
                                              slug: cancion.slug,
                                              titulo: cancion.titulo,
                                              categoria: cancion.categoria,
                                              tiempo_liturgico: cancion.tiempo_liturgico,
                                            }}
                                          />
                                        </div>
                                      ) : null}
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

