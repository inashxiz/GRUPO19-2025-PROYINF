# Aplicación Node.js con Docker y PostgreSQL

## Requisitos Previos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)
- [Node.js](https://nodejs.org/) (opcional, solo para desarrollo local)
- `curl` o cliente HTTP (para probar endpoints)

## Instalación

### 1. Clonar el repositorio
git clone https://github.com/inashxiz/GRUPO19-2025-PROYINF.git  
(debe tener docker-desktop abierto en todo momento)
Ejecutar en terminal:

1. Deben navegar hasta la carpeta GRUPO19-2025-PROYINF/Proyecto

2. (les instalará las dependencias se suele demorar un poco la primera vez con esto levantan el proyecto)  
docker compose build --no-cache y luego docker-compose up

3. Crear las tablas con Powershell: "Get-Content database/migrations.sql | docker exec -i proyecto-postgres_db-1 psql -U user -d mydb"
                               WSL: "cat database/migrations.sql | docker exec -i proyecto-postgres_db-1 psql -U user -d mydb"
                               cmd: "type database\migrations.sql | docker exec -i proyecto-postgres_db-1 psql -U user -d mydb"


4. Ir a http://localhost:3000/simulator para acceder a la HU:005 Simulación de Préstamo

5. Ir a http://localhost:3000/solicitud para acceder a la HU:002 Solicitud de Préstamo

6. Ir a http://localhost:3000/debts para acceder a la HU:006 Gestión de Deudas

7. Ir a http://localhost:3000/payment para acceder a la HU:003 Registro de Pagos

8. Ir a http://localhost:3000/contrato para acceder a la HU:007 Generación de Contrato

9.Ir a http://localhost:3000/desembolso para acceder a la HU:007 Generación de Contrato 

(para detener los contenedores)  
docker compose down -v

si no les ejecuta asegurense de estar en la carpeta correcta  
si trabajan desde windows deben tener instalado WSL2 y tenerlo activado en docker desktop  
esto se puede verificar en  
Configuración   
-Resources  
  -Configure which WSL 2 distros you want to access Docker from. (esto debe estar activo)  
  -Enable integration with additional distros:(esto debe estar activo)  

# Comandos útiles 

Pueden levantar el proyecto sin volver a construir las imágenes con el siguiente comando:
  - docker compose up
Si quieren levantar el proyecto en segundo plano pueden usar:
  - docker compose up -d
Para ver el estado de los servicios que están corriendo:
  - docker compose ps
Para ver los logs en tiempo real de todos los servicios:
  - docker compose logs -f
O de un servicio específico:
  - docker compose logs -f nombre_servicio
Para reiniciar un servicio específico:
  - docker compose restart nombre_servicio
Para detener todos los contenedores sin eliminar volúmenes:
  - docker compose down



