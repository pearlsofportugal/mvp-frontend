# Copilot Instructions — MVP Scraper Frontend

Internal Angular 21 SPA + SSR frontend for a real estate web scraper. Operators manage scraping sites, launch jobs, view scraped listings, enrich descriptions with AI, and export data.

---

## ❌ Proibido — Nunca gerar isto

- NgModules — o projeto é 100% Standalone
- `@Input()` / `@Output()` — usar `input()` / `output()` signals
- `*ngIf`, `*ngFor`, `*ngSwitch` — usar `@if`, `@for` (com `track`), `@switch`
- `ngClass`, `ngStyle` — usar bindings de classe/estilo diretos (`[class.foo]`, `[style]`)
- Template-driven forms — usar sempre Reactive Forms (`FormGroup`, `FormControl`)
- Editar ficheiros em `core/api/generated/` ou `core/api/model/` — são gerados pelo Orval
- Subscrições sem `takeUntilDestroyed(this.destroyRef)`
- `constructor()` para injeção — usar sempre `inject()`
- `standalone: true` no decorator — é o default no Angular 21, não declarar
- Arrow functions em templates
- `new Date()` ou outros globals em templates
- NgRx ou qualquer store global

---

## 1. Visão Geral do Projeto

**Finalidade:** painel de gestão do MVP-Scraper backend (FastAPI). Permite:
- Configurar sites de scraping (CSS selectors, URL base, paginação)
- Lançar scrape jobs com URL de listagens e pré-visualizar anúncios antes de lançar
- Explorar e filtrar listings imobiliários scraped
- Enriquecer descrições via AI
- Exportar dados em CSV/JSON/Excel

**Stack técnica:**

| Tecnologia | Versão |
|---|---|
| Angular | 21 |
| TypeScript | ~5.9 |
| RxJS | ~7.8 |
| @angular/ssr | 21 (Express + Node) |
| Orval | 8.5.1 (gerador de tipos e serviços) |
| Tailwind CSS | v4 (PostCSS) — utilitários mínimos |
| Vitest + jsdom | testes unitários |

---

## 2. Arquitetura

### Estrutura de pastas

```
src/
├── app/
│   ├── app.ts / app.html / app.css         # Root component (RouterOutlet + Header + ToastContainer)
│   ├── app.config.ts                        # ApplicationConfig: router, HttpClient, interceptors, hydration
│   ├── app.config.server.ts                 # Merge server config: provideServerRendering + serverRoutes
│   ├── app.routes.ts                        # Rotas lazy; exporta NAV_ROUTES para o header
│   ├── app.routes.server.ts                 # RenderMode.Prerender para todas as rotas
│   │
│   ├── core/
│   │   ├── api/
│   │   │   ├── custom-fetch.ts              # Mutator Orval: prepend apiUrl, delega ao HttpClient
│   │   │   ├── generated/                   # NUNCA editar — gerado por `npx orval`
│   │   │   │   ├── enrichment/
│   │   │   │   ├── jobs/
│   │   │   │   ├── listings/
│   │   │   │   ├── sites/
│   │   │   │   ├── export/
│   │   │   │   └── system/
│   │   │   └── model/                       # ~80+ tipos gerados pelo Orval (não editar)
│   │   ├── interceptors/
│   │   │   ├── api-key-interceptor.ts       # Injeta X-API-Key em requests para environment.apiUrl
│   │   │   └── api-error-interceptor.ts     # Extrai mensagem de erro e chama ToastService.error()
│   │   ├── models/                          # Tipos de domínio manuais (não gerados)
│   │   │   ├── listing.model.ts
│   │   │   ├── enrichment.model.ts
│   │   │   └── scrape-job.model.ts
│   │   └── services/                        # Wrappers dos serviços gerados → expõem Observable<T> limpo
│   │       ├── sites.service.ts
│   │       ├── listings.service.ts
│   │       ├── jobs.ts
│   │       ├── enrichment.service.ts
│   │       ├── export.service.ts
│   │       ├── health.service.ts
│   │       └── toast.service.ts
│   │
│   ├── features/                            # Organização por feature
│   │   ├── sites/
│   │   ├── jobs/
│   │   ├── listings/
│   │   ├── enhancement/
│   │   └── export/
│   │
│   ├── layout/
│   │   └── header/
│   │
│   └── shared/
│       ├── components/toast-container/
│       └── pipes/
│
└── environments/
    ├── environment.ts                        # { apiUrl, apiKey } para dev
    └── environment.prod.ts
```

### Estratégia de organização

Híbrida: **feature-first** em `features/`, **por tipo** em `core/`. Cada feature tem um componente container (página) e subcomponentes em `components/`.

### SSR

- `outputMode: 'server'` + `ssr.entry: src/server.ts` no `angular.json`
- Todas as rotas: `RenderMode.Prerender` em `app.routes.server.ts`
- `provideClientHydration(withEventReplay())` em `app.config.ts`
- SSE (`streamJobProgress`) só corre no browser — guardar sempre com `isPlatformBrowser(PLATFORM_ID)`

---

## 3. Componentes

### Regras absolutas

- **Standalone sempre.** Nunca usar NgModules. Não declarar `standalone: true` — é o default no Angular 21.
- **`ChangeDetectionStrategy.OnPush` em todos os componentes**, sem exceção.
- **`input()` e `output()`** em vez de `@Input()` / `@Output()`.
- **Sem `@HostBinding` / `@HostListener`** — usar o objeto `host:` no decorator.
- **Sem `ngClass`** — usar `[class.foo]="condition"`.
- **Sem `ngStyle`** — usar `[style.prop]="value"`.
- Formulários: sempre **Reactive Forms** (`FormGroup`, `FormControl`). Nunca Template-driven.
- Templates externos para componentes com template > ~10 linhas. Inline para componentes muito simples.

### Padrão Input/Output

```typescript
// Inputs
site = input<SiteConfigRead | null>(null);           // opcional com default
sites = input.required<SiteConfigRead[]>();           // obrigatório

// Outputs
success = output<void>();
cancel = output<void>();
jobCreated = output<void>();
view = output<JobListRead>();
```

### Two-way binding com `model()`

Para componentes que expõem um valor bidirecional, usar `model()` (Angular signal two-way binding) em vez de um par `input()` + `output()`:

```typescript
// No componente filho — permite [(selectedId)]="..." no pai
readonly selectedId = model<string | null>(null);

// Uso no template do pai
<app-listing-selector [(selectedId)]="currentId" />

// Ou com binding separado
<app-listing-selector [selectedId]="currentId()" (selectedIdChange)="currentId.set($event)" />
```

- `model()` gera automaticamente o signal de input e o output `<name>Change`
- Usar apenas quando o componente é genuinamente bidirecional (ex: seletor de item com estado próprio)
- **Não usar** como substituto de outputs simples — preferir `output()` para eventos unidirecionais

### Injeção

Sempre `inject()`, nunca injeção no construtor:

```typescript
private readonly sitesService = inject(SitesService);
private readonly destroyRef = inject(DestroyRef);
private readonly platformId = inject(PLATFORM_ID);
```

---

## 4. Reatividade

### Hierarquia de estado — escolher nesta ordem

1. `signal()` local — estado UI simples (flags, valores de formulário, loading)
2. `rxResource()` — dados remotos (GET com reatividade automática)
3. RxJS + `takeUntilDestroyed` — operações assíncronas (POST/PUT/DELETE, SSE, polling)
4. ❌ Nunca NgRx ou estado global partilhado

### Signals

Usados para **todo o estado local** dos componentes e serviços:

```typescript
// Estado UI
protected readonly showForm = signal(false);
protected readonly editingSite = signal<SiteConfigRead | null>(null);
protected readonly submitting = signal(false);

// Estado derivado
protected readonly sites = computed<SiteConfigRead[]>(() => this.sitesResource.value() ?? []);
protected readonly loading = computed(() => this.sitesResource.isLoading());
```

`effect()` usado para reagir a mudanças de inputs (ex: observar `site()` para decidir entre modo criar vs editar).

### RxJS

Usado para **chamadas HTTP mutativas** e **streams** (SSE, polling).

Padrão de cleanup: `takeUntilDestroyed(this.destroyRef)` em todas as subscrições manuais:

```typescript
this.sitesService
  .suggest(url)
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({ next: ..., error: ... });
```

### Mixing Signals + RxJS

| Padrão | Onde se usa |
|---|---|
| `rxResource({ params, stream })` | Carregamento de dados em componentes container |
| `toSignal(observable$)` | Converter Observable para signal (ex: polling com `timer`) |
| `toObservable()` | Não encontrado no codebase atual |

```typescript
// Polling com toSignal
private readonly pollTick = toSignal(
  isPlatformBrowser(this.platformId) ? timer(0, 30_000) : EMPTY,
  { initialValue: 0 },
);

// rxResource reativo ao pollTick
readonly jobsResource = rxResource({
  params: () => this.pollTick(),
  stream: () => this.jobsService.getAll(),
});
```

### Refresh manual

Padrão para forçar reload de um `rxResource`:

```typescript
private readonly refreshTick = signal(0);
readonly resource = rxResource({
  params: () => this.refreshTick(),
  stream: () => this.service.getAll(),
});
private reload(): void { this.refreshTick.update(v => v + 1); }
```

### SSE (Server-Sent Events)

`JobsService.streamJobProgress(jobId)` usa `@microsoft/fetch-event-source` e retorna `Observable<JobRead>`. O `AbortController` é abortado quando o Observable é unsubscribed. Só corre no browser — guardar com `isPlatformBrowser`.

---

## 5. Serviços e Estado

### Dois níveis de serviços

**Nível 1 — Gerados pelo Orval** (`core/api/generated/<tag>/`): nunca editar. Retornam `Observable<ApiResponse<T>>`.

**Nível 2 — Wrappers manuais** (`core/services/`): `providedIn: 'root'`, injetam o serviço gerado, fazem `.pipe(map(r => r.data!))` e expõem `Observable<T>` limpo:

```typescript
@Injectable({ providedIn: 'root' })
export class SitesService {
  private readonly api = inject(GeneratedSitesService);

  list(): Observable<SiteConfigRead[]> {
    return this.api.listSites().pipe(map((r) => r.data ?? []));
  }

  create(payload: SiteConfigCreate): Observable<SiteConfigRead> {
    return this.api.createSite(payload).pipe(map((r) => r.data!));
  }
}
```

### Estado global

Não há store dedicado. Estado gerido por:
- Signals locais nos componentes container
- `rxResource` para dados remotos
- `ToastService` — único serviço com estado partilhado via `signal()`

### Comunicação com API

- `customFetch` (`core/api/custom-fetch.ts`) — mutator Orval: prepend de `environment.apiUrl`, delega ao `HttpClient`
- `apiKeyInterceptor` — injeta `X-API-Key: environment.apiKey` em todos os requests para `environment.apiUrl`
- `apiErrorInterceptor` — interceta erros HTTP, extrai mensagem, chama `ToastService.error()` e re-lança o erro

**Consequência:** os componentes não precisam de tratar erros HTTP — o interceptor já mostra o toast:

```typescript
// Correto — erro silencioso no componente
this.service.remove(key).subscribe({ next: () => this.reload(), error: () => {} });
```

### ExportService

Não usa `HttpClient` — abre URL diretamente com `window.open()`. Guardar com `isPlatformBrowser`.

---

## 6. Routing

```typescript
// app.routes.ts — todas lazy
{ path: 'sites',       loadComponent: () => import('./features/sites/sites').then(m => m.SitesComponent) },
{ path: 'jobs',        loadComponent: () => import('./features/jobs/jobs').then(m => m.JobsComponent) },
{ path: 'real-estate', loadComponent: () => import('./features/listings/listings').then(m => m.ListingsComponent) },
{ path: 'enhancement', loadComponent: () => import('./features/enhancement/enhancement').then(m => m.EnhancementComponent) },
{ path: 'export',      loadComponent: () => import('./features/export/export').then(m => m.ExportComponent) },
{ path: '',            redirectTo: 'sites', pathMatch: 'full' },
```

- Sem guards, sem resolvers.
- `NAV_ROUTES` exportado de `app.routes.ts` e consumido pelo `HeaderComponent`.
- SSR: todas as rotas com `RenderMode.Prerender`.

---

## 7. Tipagem

### Prioridade de tipos

**Preferir sempre** tipos de `core/api/model/` (gerados pelo Orval) sobre os de `core/models/` (manuais).
Os tipos em `core/models/` existem apenas para tipos de UI sem equivalente gerado.

Importar sempre via barrel:
```typescript
import type { SiteConfigRead, JobRead, ListingRead } from '../api/model';
```

### Tipos gerados (não editar)

`src/app/core/api/model/` — ~80 ficheiros. Exemplos chave:
- `SiteConfigRead`, `SiteConfigCreate`, `SiteConfigUpdate`
- `JobRead`, `JobCreate`, `JobListRead`, `JobProgress`
- `ListingRead`, `ListingListRead`, `ListingStats`
- `SiteConfigSuggestResponse`, `SiteConfigPreviewResponse`
- `SelectorCandidate`

### Tipos de UI local

Declarados no topo do ficheiro `.ts` onde são usados:

```typescript
type FormStage = 'detect' | 'configure';
type FormTab = 'basic' | 'selectors' | 'advanced';
type ExtractionMode = 'section' | 'direct';
```

### Envelope da API

O backend envolve sempre as respostas em `ApiResponse<T>`. Os wrappers em `core/services/` fazem sempre `.pipe(map(r => r.data!))` ou `r.data ?? []` para desempacotar.

---

## 8. Testes

- Framework: **Vitest** com jsdom
- Estrutura: `*.spec.ts` ao lado do ficheiro que testa
- Importar standalone components diretamente no `imports` do `TestBed`

### Padrão para interceptors

```typescript
describe('apiKeyInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => apiKeyInterceptor(req, next));

  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => expect(interceptor).toBeTruthy());
});
```

### Padrão para componentes

```typescript
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],  // importar o standalone component diretamente
    }).compileComponents();
  });
});
```

---

## 9. Convenções Específicas

### Naming

| Elemento | Convenção | Exemplo |
|---|---|---|
| Ficheiros | kebab-case | `site-form.ts`, `api-key-interceptor.ts` |
| Classes de componentes | PascalCase + sufixo `Component` | `SiteFormComponent` em `site-form.ts` |
| Serviços manuais | PascalCase + sufixo `Service` | `SitesService`, `ToastService` |
| Serviços gerados importados | alias com sufixo gerado | `import { SitesService as GeneratedSitesService }` |
| Signals privados | `private readonly` camelCase | `private readonly refreshTick = signal(0)` |
| Signals protegidos | `protected readonly` camelCase | `protected readonly showForm = signal(false)` |
| Computed | mesmo padrão que signals | `protected readonly loading = computed(...)` |
| rxResource | camelCase + sufixo `Resource` | `readonly sitesResource = rxResource(...)` |

### Formulários

```typescript
protected readonly form = new FormGroup({
  key: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  base_url: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
  }),
});
```

### Regras de template

```html
<!-- Correto -->
@if (loading()) { <span>Loading...</span> }
@for (site of sites(); track site.id) { <app-site-card [site]="site" /> }
@switch (status()) {
  @case ('active') { <span>Active</span> }
  @default { <span>Inactive</span> }
}

<!-- Proibido -->
<div *ngIf="loading">...</div>
<div *ngFor="let site of sites">...</div>
```

### CSS

- CSS por componente em ficheiro `.css` separado (exceto componentes muito simples com `styles:` inline)
- Variáveis CSS globais em `src/styles/global.css`: `--bg`, `--surface`, `--border`, `--text`, `--text-dim`, `--accent`, `--green`, `--red`, `--yellow`, `--radius`
- Classes comuns (`form-group`, `form-grid`, `btn`, `card`) em `src/styles/components.css`
- Não usar Tailwind para estilos de componentes — usar CSS custom com variáveis do design system

### Regenerar tipos Orval

```bash
npx orval
```

Regenera `core/api/generated/` e `core/api/model/`. Os wrappers em `core/services/` **não são afetados** mas devem ser ajustados manualmente se o contrato da API mudar.

### Ambiente

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  apiKey: '...',
};
```

`environment.apiUrl` usado em `customFetch.ts` e `jobs.ts` (SSE URL).
`environment.apiKey` usado em `apiKeyInterceptor` e no header SSE do `JobsService`.

### Guard de plataforma para SSR

Qualquer código que use `window`, `document`, timers, SSE ou `window.open()` deve ser guardado:

```typescript
private readonly platformId = inject(PLATFORM_ID);

if (isPlatformBrowser(this.platformId)) {
  // window, SSE, timers, window.open()
}
```