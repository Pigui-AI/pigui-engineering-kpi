# Pigui Engineering KPI

## Corte validado del 29 de octubre, 12:36 CDMX

La vista principal carga `data/github-audit.json`: 57 PR revisados en 8 repositorios, 53 fusionados, 11 fusionados con cambios y aprobación externa sobre el head, 13 con fallos técnicos y 12 sin señal de CI. Se muestran las alertas, no se convierten en una aprobación de calidad. Es un corte puntual, no una sincronización automática ni una auditoría completa del código.

Los resultados se presentan por responsable operativo: Marco 1 merge, América 17, Ricardo 10 y Ever 25. Cada PR se cuenta una vez. Las fichas muestran el trabajo; la cuenta autora original permanece en GitHub. QA sigue sin reporte atribuible.

La cobertura de aprobación es 11 / 53 = 20.8%, no un porcentaje de cumplimiento de metas. Los porcentajes de avance de objetivos se dejan sin dato hasta tener metas acordadas. El snapshot guarda sólo enlaces y metadata de PR/checks, sin código, cuerpos de comentarios ni credenciales. Los repositorios privados siguen requiriendo sus permisos al abrir los enlaces.

Interfaz inspirada visualmente en Vitrea, implementada con HTML/CSS/JS propios, sin copiar sus recursos ni su plantilla comercial. Vistas: Resumen, Equipo, Evidencias y Criterios. Incluye tema claro/oscuro, búsqueda (⌘/Ctrl K), detalle de integrante, exportación CSV y formulario de reportes.

## Equipo y QA

Marco: `marcopigui`; América: `americabalderas-del`; Ricardo: `ricardogallardo-pigui`; Ever: `everbecerra0`. Yestzanetli participa como QA comodín sin cuenta. `piguiai` es un bot, no un integrante.

QA puede guardar borradores en el navegador. Para compartir y contabilizar un reporte se publica un Issue desde una cuenta de `qa_delegates` en `data/team.json`: inicialmente SergiorCode y América. QA puede verificar PR ajenos, pero debe incluir pruebas y resultados (mínimo 30 caracteres); se siguen exigiendo merge y aprobación externa. Los borradores locales no se sincronizan entre dispositivos.

Los PR cuentan una sola vez por persona. El porcentaje individual es el último declarado y validado; no es una estimación automática del código. El sitio no genera tendencias ni periodos semanales automáticos. La vista Criterios documenta estas limitaciones.

Pruebas: `node --test tests/verification.test.cjs`. El despliegue de Pages se dispara tanto con push como cuando termina exitosamente el verificador de KPIs.

Dashboard estático publicado en GitHub Pages. Los reportes de avance se reciben con un Issue Form y sólo son válidos cuando `.github/workflows/verify-kpi.yml` los etiqueta como `kpi-verified`.

## Candados

1. La evidencia debe enlazar a un PR de `Pigui-AI/api-pigui-backend`.
2. El PR debe estar fusionado y tener al menos un archivo modificado.
3. El autor del Issue y del PR deben coincidir con la cuenta configurada, excepto QA delegado.
4. Para repositorios privados, configurar el secreto `PIGUI_READ_TOKEN` con permiso de lectura sobre el repo de código.
5. El verificador comprueba aprobación externa. La protección del repositorio de código debe configurarse allí; este workflow de Issues no es un check de PR.

## Inicialización

Las cuatro cuentas de desarrollo están vinculadas en `data/team.json`. Los delegados de QA se administran en `qa_delegates`. GitHub Pages se despliega automáticamente por la Action incluida.
