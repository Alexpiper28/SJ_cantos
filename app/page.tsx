import type { RowDataPacket } from "mysql2";
import CalendarioLiturgicoCliente from "./CalendarioLiturgicoCliente";
import { pool } from "@/lib/db";

type TiempoLiturgico = {
  nombre: string;
  color: string;
  celebracion: string;
};

type TiempoLiturgicoRow = RowDataPacket & Partial<TiempoLiturgico>;

type CancionRecomendada = RowDataPacket & {
  titulo: string;
  slug: string;
};

const TIEMPO_POR_DEFECTO: TiempoLiturgico = {
  nombre: "No definido",
  color: "gray",
  celebracion: "",
};

async function getTiempoLiturgico() {
  try {
    const [rows] = await pool.query<TiempoLiturgicoRow[]>(`
      SELECT t.nombre, t.color, c.celebracion
      FROM calendario_liturgico c
      JOIN tiempos_liturgicos t ON c.tiempo_id = t.id
      WHERE CURDATE() BETWEEN c.fecha_inicio AND c.fecha_fin
      LIMIT 1
    `);

    const row = rows?.[0];

    return {
      nombre: typeof row?.nombre === "string" ? row.nombre : TIEMPO_POR_DEFECTO.nombre,
      color: typeof row?.color === "string" ? row.color : TIEMPO_POR_DEFECTO.color,
      celebracion:
        typeof row?.celebracion === "string" ? row.celebracion : TIEMPO_POR_DEFECTO.celebracion,
    };
  } catch {
    return TIEMPO_POR_DEFECTO;
  }
}

async function getCancionesRecomendadas() {
  const [rows] = await pool.query<CancionRecomendada[]>(
    "SELECT titulo, slug FROM canciones ORDER BY id DESC LIMIT 8"
  );
  return rows ?? [];
}

export default async function Home() {
  const tiempo = await getTiempoLiturgico();
  const canciones = await getCancionesRecomendadas();

  return <CalendarioLiturgicoCliente tiempo={tiempo} canciones={canciones} />;
}
