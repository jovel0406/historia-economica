import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // SPEC §3: cobertura obligatoria en el validador de esquema y en el pipeline de ingesta.
      include: ["src/schemas/**", "src/validacion/**", "scripts/fetch/**"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
