import { db } from '../../../lib/db'
import { useAlertasStore } from '../../../stores/alertasStore'

export type TipoAlerta = 'stockBajo' | 'caducidad'

/**
 * Alterna una preferencia de notificaciones (spec 010 FR-025/027): local al
 * dispositivo, nunca sincronizada. Abierto a cualquier usuario autenticado
 * — es del dispositivo, no de la cuenta.
 */
export async function actualizarPreferenciaNotificacion(
  tipo: TipoAlerta,
  valor: boolean,
): Promise<void> {
  const actual = useAlertasStore.getState()
  await db.preferenciasNotificaciones.put({
    id: 'local',
    stockBajo: tipo === 'stockBajo' ? valor : actual.preferenciaStockBajo,
    caducidad: tipo === 'caducidad' ? valor : actual.preferenciaCaducidad,
  })
}
