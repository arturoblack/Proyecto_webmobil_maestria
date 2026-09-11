import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Cada prueba arranca sin sesión previa ni restos del DOM de la anterior:
// una prueba que depende del estado que dejó otra deja de ser determinista.
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});
