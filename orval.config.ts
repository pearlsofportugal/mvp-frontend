import { defineConfig } from 'orval';

// Por omissão lê o spec do backend a correr localmente. Para gerar sem backend
// (ex.: CI), usa o snapshot versionado: `OPENAPI_INPUT=./openapi/openapi.json npm run api:generate`
// (PowerShell: `$env:OPENAPI_INPUT='./openapi/openapi.json'; npm run api:generate`).
const input = process.env['OPENAPI_INPUT'] ?? 'http://localhost:8000/openapi.json';

export default defineConfig({
  api: {
    input,
    output: {
      mode: 'tags-split',
      target: 'src/app/core/api/generated',
      schemas: 'src/app/core/api/model',
      client: 'angular',
      tsconfig: './tsconfig.app.json',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './src/app/core/api/custom-fetch.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
