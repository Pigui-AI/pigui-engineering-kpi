# Pigui Engineering KPI

Dashboard de entregas y líneas de código, publicado en GitHub Pages. Interfaz basada en la composición de Rapport Growth: fondo cálido animado, tarjetas translúcidas, navegación superior y dock flotante. Incluye tema claro/oscuro, filtro quincenal, evidencias, resumen por integrante, CSV y reportes QA delegados. La curva de revisión y las barras por fecha se calculan con los PR de la quincena, agrupados cada tres días; las fechas sin entregas no generan porcentajes de aprobación.

## Sincronización automática

`Sync GitHub evidence` consulta los ocho repositorios de `data/team.json` cada 15 minutos (minutos 7, 22, 37 y 52). GitHub puede retrasar ejecuciones programadas. También admite ejecución manual y `repository_dispatch` de tipo `kpi-pr-merged`. El receptor está preparado; no se han instalado emisores en los repositorios de negocio. La configuración activa es la consulta periódica.

El workflow necesita el secreto `PIGUI_READ_TOKEN`, con lectura de los repositorios conectados. Sólo la Action usa este secreto; nunca se entrega al navegador. El `GITHUB_TOKEN` del workflow sólo escribe el snapshot en este repositorio. Una ejecución exitosa dispara `Deploy GitHub Pages` mediante `workflow_run`, incluso cuando el commit del bot no dispara eventos `push`.

El navegador comprueba nuevos datos publicados cada minuto, al volver a la pestaña y con el botón Actualizar. Conserva la quincena, los filtros y el desplazamiento. Si hay un formulario o detalle abierto, espera a que se cierre para aplicar el nuevo corte. Un error conserva los últimos datos válidos y muestra su antigüedad real.

El primer corte automático descubre actividad desde el 1 de octubre de 2026. Los siguientes descubren PR actualizados desde el último corte menos un día y revisan además los abiertos y los de la quincena actual. Se conserva el historial previo. No se inventan metas ni porcentajes de avance a partir del volumen de código.

## Atribución y validación

La cuenta `SergiorCode`, sin distinguir mayúsculas, se asigna siempre a Ever en todos los repositorios conectados. Esta regla se aplica antes de las excepciones por repositorio. La actividad de `everbecerra0` también corresponde a Ever. El backend de `americabalderas-del` se mantiene asignado a Ever según la instrucción del responsable. América conserva su actividad en los otros repositorios. Marco y Ricardo usan sus cuentas configuradas. Cada PR tiene un responsable y cuenta una sola vez; la autoría original permanece en los datos de auditoría y GitHub.

Los metadatos se obtienen de GitHub, no de cifras declaradas en un formulario. Se comprueban SHA, fecha de merge, cantidad de archivos, revisiones externas sobre el head y checks. Una aprobación no oculta un CI fallido. Una respuesta incompleta, pérdida de acceso o inconsistencia entre archivos y totales impide publicar un corte parcial.

Las líneas añadidas y eliminadas se consultan por archivo, con paginación completa y reconciliación contra los totales del PR. Sólo cuentan código y pruebas de PR fusionados; se excluyen dependencias, generados, compilados, documentación y datos/configuración. Los valores se reutilizan sólo si coinciden SHA, archivos medidos y versión del método. El cambio neto puede ser negativo. Las líneas miden volumen de cambios, no calidad ni el tamaño actual del repositorio.

## Periodos y reportes

Quincenas: 1–15 y 16–último día del mes, zona America/Mexico_City. Un PR fusionado se asigna por fecha de merge; uno cerrado por fecha de cierre; uno abierto por fecha de creación. El filtro se aplica a gráficas, equipo, evidencias y CSV.

Yestzanetli participa como QA sin cuenta de GitHub. Puede guardar borradores locales y publicar reportes mediante los delegados de `data/team.json`. El verificador exige pruebas descritas, merge, cambios y revisión externa sobre el head; rechaza identidades no autorizadas y reutilización del mismo PR. `piguiai` es un bot. La ausencia de reporte no se interpreta como desempeño cero.

## Comprobación y operación

```sh
node --test tests/*.test.cjs
# Validar un corte sin publicar (token del login local, sin imprimirlo):
node scripts/sync-github.cjs --local-auth --output /tmp/pigui-sync-preview.json
gh workflow run sync-github.yml --repo Pigui-AI/pigui-engineering-kpi
```

Configuración de fuentes y atribución: `data/sync-config.json` y `data/team.json`. Datos publicados: `data/github-audit.json`. El snapshot sólo incluye metadatos de PR, títulos, enlaces y checks; nunca código fuente ni credenciales. Las animaciones respetan la preferencia de movimiento reducido.
