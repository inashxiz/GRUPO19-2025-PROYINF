# Reporte de Inspección de Código - SonarCloud

Este documento detalla los hallazgos de la inspección automática de código realizada con SonarCloud para el proyecto.

## Resumen del Estado del Proyecto
A continuación se presenta el estado general obtenido en el dashboard de SonarCloud:

![Dashboard General de SonarCloud](Reporte_issues.png)
![Quality issues totales por archivo](Reporte_issues_por_archivo.png)
---

## 1. Primer Quality Issue: Credenciales Hardcodeadas (JavaScript)

* **Archivo / Línea afectada:** Proyecto\index.js / Línea 23
* **Impacto en Calidad:** Security (Seguridad)
* **Severidad / Tipo:** Bloqueante / Vulnerabilidad
* **Regla SonarCloud:** `javascript:S6437` - *Credentials should not be hard-coded.*

### Descripción del problema
Se detectó una vulnerabilidad crítica debido a que la clave secreta de la sesión (`secret: 'supermegagigachadsecretuser'`) se encuentra expuesta directamente en texto plano dentro del código fuente de la aplicación. 

![Vulnerabilidad de contraseña expuesta](Issue1.png)

### Recomendación de la aplicación y resolución
* **Recomendación:** Revocar y cambiar esta contraseña inmediatamente, ya que al estar expuesta en el código (y más en un repositorio público) se considera comprometida.
* **Cómo se abordará:** **Se considera prioritario.** Se eliminó la cadena de texto fija y se reemplazó por una variable de entorno mediante `process.env.SESSION_SECRET`. Además, se configuró un valor alternativo de desarrollo (`|| 'default_dev_secret_replace_in_prod'`) para evitar fallos si la variable no está definida localmente. Para habilitar esto, se instaló la librería `dotenv`, se configuró en la primera línea de la aplicación y se creó el archivo `.env` (el cual fue debidamente añadido al `.gitignore` para protegerlo).

---

## 2. Segundo Quality Issue: Propiedad CSS Sobreescrita (CSS)

* **Archivo / Línea afectada:** Proyecto\public\css\login.css / Línea 161
* **Impacto en Calidad:** Reliability (Confiabilidad)
* **Severidad / Tipo:** Alta / Crítico
* **Regla SonarCloud:** `css:S4657` - *Shorthand properties that override related longhand properties should be avoided.*

### Descripción del problema
En el archivo de estilos, dentro de la clase `.password-container input`, se definió primero de forma específica `padding-right: 2.5rem;`, pero inmediatamente en la línea siguiente se utilizó la propiedad atajo `padding: 0.75rem 1rem;`. Esto último sobreescribe por completo el margen derecho que se había calculado previamente, haciendo que la primera línea sea código muerto e inútil.

![Bug de CSS por propiedad sobreescrita](Issue2.png)

### Recomendación de la aplicación y resolución
* **Recomendación:** Evitar el uso de propiedades *shorthand* (como `padding`) justo después de especificar un lado de forma individual (*longhand*), o bien reordenar las reglas correctamente.
* **Cómo se abordará:** **Se considera para la mejora.** Se corregirá el CSS reordenando o unificando la propiedad para que el `padding-right` específico de `2.5rem` se aplique correctamente (por ejemplo, declarando el shorthand primero y luego el valor específico, o combinando todo en una sola línea de padding: `padding: 0.75rem 2.5rem 0.75rem 1rem;`).