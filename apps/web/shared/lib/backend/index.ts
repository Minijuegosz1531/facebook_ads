// Selects the backend implementation. MOCK_API=1 → in-memory mock (E2E / local
// dev without the Python service); otherwise proxy to FastAPI.
import "server-only";

import { httpBackend } from "./http";
import { mockBackend } from "./mock";
import type { Backend } from "./types";

export const backend: Backend =
  process.env.MOCK_API === "1" ? mockBackend : httpBackend;

export type { Backend } from "./types";
