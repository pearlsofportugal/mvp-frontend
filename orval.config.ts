import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'http://localhost:8000/openapi.json',
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
