import { useAuthStore } from '../../../stores/authStore'
import { PerfilSection } from './PerfilSection'
import { ConfiguracionAlertasSection } from './ConfiguracionAlertasSection'
import { ClinicaSection } from './ClinicaSection'
import { CategoriasSection } from './CategoriasSection'
import { InsumosBajaSection } from './InsumosBajaSection'
import { NotificacionesSection } from './NotificacionesSection'

/**
 * Vista "Ajustes" (spec 010 FR-001/002/003): reemplaza el puente temporal
 * "Consumir insumo" de la spec 006 en la pestaña "Más". Organiza secciones
 * abiertas a todo usuario autenticado (Perfil, Notificaciones) y secciones
 * solo para administradores (Configuración de Alertas, Clínica, Categorías,
 * Insumos dados de baja) — ocultas por completo para `personal`, no solo
 * deshabilitadas, mismo criterio que ya usa `AlertasView`.
 */
export function AjustesView() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdministrador = usuario?.rol === 'administrador'

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      <PerfilSection />
      <NotificacionesSection />

      {esAdministrador && (
        <>
          <ConfiguracionAlertasSection />
          <ClinicaSection />
          <CategoriasSection />
          <InsumosBajaSection />
        </>
      )}
    </div>
  )
}
