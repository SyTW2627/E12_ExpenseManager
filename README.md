# E12_ExpenseManager

[![Server Test Coverage](https://github.com/SyTW2627/E12_ExpenseManager/actions/workflows/coverage.yml/badge.svg?branch=test)](https://github.com/SyTW2627/E12_ExpenseManager/actions/workflows/coverage.yml)
[![Playwright E2E Tests](https://github.com/SyTW2627/E12_ExpenseManager/actions/workflows/playwright.yml/badge.svg?branch=test)](https://github.com/SyTW2627/E12_ExpenseManager/actions/workflows/playwright.yml)

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-764ABC?logo=redux&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33)

### Miembros del proyecto
- Lucía Hernández Marrero alu0101647111@ull.edu.es
- Eduardo Cruz González alu0101432748@ull.edu.es
- Álvaro Martín Pérez-Dionis alu0101646299@ull.edu.es

### Descripción de la aplicación 
Se trata de una aplicación web full-stack orientada a la gestión, reparto e informe de gastos colectivos. La plataforma permite organizar el presupuesto de un grupo de usuarios destacando por la integración de mecánicas de juego para incentivar la participación y amenizar el proceso de cobro.

### Instrucciones para su funcionamiento

- `client`:

1. Instalar las dependencias con `npm install`
2. Arrancar el servidor con el comando `npm run dev -- --host 0.0.0.0 `

- `server` :

1. Instalar las dependencias con `npm install`
2. Arrancar el servidor con el comando `npm run dev`

### Ejecución de tests

- **Tests unitarios y cobertura (`server` — Vitest)** *(no requieren MongoDB)*:
  ```bash
  cd server
  npm test            # Ejecuta la batería de tests unitarios
  npm run coverage    # Ejecuta los tests y genera el informe en consola y server/coverage/lcov.info
  ```

- **Tests End-to-End (`client` — Playwright)**:

  *Prerrequisitos:* tener instaladas las dependencias de `server` y `client`, disponer de MongoDB local activo en `127.0.0.1:27017` e instalar los navegadores de Playwright la primera vez (`cd client && npx playwright install`).

  ```bash
  cd client
  npx playwright test                    # Ejecuta todos los tests E2E en Chromium, Firefox y WebKit
  npx playwright test --project=chromium # Ejecuta únicamente en Chromium (igual que en CI)
  npx playwright show-report             # Abre el informe HTML de la última ejecución
  ```

  *(Playwright arranca automáticamente el `seed` y el servidor backend en `http://localhost:5000` sobre la base de datos `expense_manager_e2e`, además del frontend en `http://localhost:5173`).*
