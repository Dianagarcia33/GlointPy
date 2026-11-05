import { useCallback, useRef } from 'react';

/**
 * Evita que una respuesta vieja pise una nueva.
 *
 * Las tarjetas del panel se refrescan solas cada pocos segundos y además cambian con las acciones del equipo. Si una
 * consulta automática sale ANTES de una acción y llega DESPUÉS (algo normal con una red o un servidor lentos), trae
 * datos de antes de la acción y borra el resultado que la persona acaba de ver: parece que «no se actualiza».
 *
 *   const { startRead, invalidate } = useLatestOnly();
 *   const isFresh = startRead();          // al lanzar una consulta
 *   const data = await consulta();
 *   if (isFresh()) setData(data);          // solo se aplica si no hubo cambios mientras tanto
 *   invalidate();                          // al hacer una acción (antes y después): las consultas en vuelo quedan obsoletas
 */
export function useLatestOnly() {
  const version = useRef(0);
  const startRead = useCallback(() => {
    const startedAt = version.current;
    return () => version.current === startedAt;
  }, []);
  const invalidate = useCallback(() => { version.current += 1; }, []);
  return { startRead, invalidate };
}
