# Pigui Engineering KPI

Dashboard estático publicado en GitHub Pages. Los reportes de avance se reciben con un Issue Form y sólo son válidos cuando `.github/workflows/verify-kpi.yml` los etiqueta como `kpi-verified`.

## Candados

1. La evidencia debe enlazar a un PR de `Pigui-AI/api-pigui-backend`.
2. El PR debe estar fusionado y tener al menos un archivo modificado.
3. El autor del Issue y del PR deben coincidir.
4. Para repositorios privados, configurar el secreto `PIGUI_READ_TOKEN` con permiso de lectura sobre el repo de código.
5. Activa protección de rama en `main`: revisión requerida y el check **Verify KPI evidence** obligatorio.

## Inicialización

Actualiza los `login` que dicen `por-asignar` dentro de `data/team.json`, con los usuarios reales de GitHub del equipo. GitHub Pages se despliega automáticamente por la Action incluida.
