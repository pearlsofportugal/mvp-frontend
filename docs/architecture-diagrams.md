# MVP Scraper Frontend — Diagramas de Arquitetura

> Abrir preview: `Ctrl+Shift+V`

---

## 1. Dashboard

```mermaid
flowchart TD
    DC[DashboardComponent]
    DC -->|rxResource stream| DS[DashboardService\n.partnerStats]
    DS -->|GET /dashboard/partner-stats| API[(API)]
    API -->|PartnerStats[ ]| DS
    DS --> DC

    DC --> SORT[sortColumn / sortDir\nsignal]
    SORT --> P[partners computed\nsort local]
    P --> TBL[Tabela de Parceiros\ntotal · updated · avg_price\nenriched · imodigi · last_job]
    TBL -->|click cabeçalho| SORT
```

---

## 2. Sites

```mermaid
flowchart TD
    SC[SitesComponent]
    SC -->|rxResource params=refreshTick| SL[SitesService.list]
    SL -->|GET /sites| API[(API)]

    SC --> SLC[SiteListComponent\nlista de sites]
    SLC -->|new| RN[Router → /sites/new]
    SLC -->|edit| RE[Router → /sites/:key/edit]
    SLC -->|delete| SD[SitesService.remove\n→ reloadSites]

    RN --> WIZ[Wizard\nSiteFormComponent]
    RE --> WIZ

    WIZ --> SUG[SiteSuggestComponent\ndetect selectors from URL]
    WIZ --> PRV[SitePreviewComponent\npré-visualizar anúncios]
    WIZ --> TST[SiteTestScrapeComponent\ntestar scrape real]
    WIZ --> TSRC[SiteTestListingComponent\ntestar listing individual]

    WIZ -->|create| SC2[SitesService.create → reload]
    WIZ -->|update| SU[SitesService.update → reload]

    SC -->|forkJoin enabled sites| SCH[SitesService.getSchedule\npor site com schedule ativo]
    SCH --> MAP[scheduleInfoMap signal\nnext_run · last_run · status]
    MAP --> SLC
```

---

## 3. Jobs

```mermaid
flowchart TD
    JC[JobsComponent\ntab: Jobs · Schedules]

    subgraph Tab Jobs
        JC -->|rxResource| JL[JobsService.getAll]
        JL -->|GET /jobs| API[(API)]
        JC --> JF[JobFormComponent\ncreate new job]
        JF -->|preview job listings| PREV[SitesService.previewSelector]
        JF -->|POST /jobs| API
        JF -->|jobCreated| JC

        JC --> JLIST[JobsListComponent]
        JLIST -->|SSE per active job| SSE[createSseObservable\nGET /jobs/:id/progress]
        SSE -->|JobRead live| JLIST
        JLIST -->|view| JDT[JobDetailComponent\nSSE own stream]
        JLIST -->|cancel| JCA[JobsService.cancel]
        JLIST -->|delete| JD[JobsService.delete]
    end

    subgraph Tab Schedules
        JC --> SP[SchedulesPanelComponent\nlista sites com schedule]
        SP -->|edit schedule| SF[SiteScheduleFormComponent\ninterval · timezone · max_pages]
        SF -->|PATCH /sites/:key| API
        SF -->|saved| SP
    end

    JC -->|openDetail| DLG[AppDialogComponent\nJobDetailComponent]
    DLG -->|SSE /jobs/:id/progress| API
    DLG -->|ESC / close| JC

    JC -->|confirmDelete| CONF[ConfirmDialogComponent]
    CONF -->|confirmed| JD
```

---

## 4. Listings

```mermaid
flowchart TD
    LC[ListingsComponent]
    LC -->|rxResource params=currentFilters| LS[RealEstateService\n.getListings paginated]
    LC -->|rxResource| SS[SitesService.list]
    LS -->|GET /listings?filters| API[(API)]

    LC --> FIL[ListingsFiltersComponent\nsite · tipo · localização · preço · status]
    FIL -->|userFilters signal| LC

    LC --> TBL[ListingsTableComponent\ntabela paginada]
    TBL -->|sortField · sortOrder| LC
    TBL -->|view| DET
    TBL -->|edit| EDIT
    TBL -->|delete| CONF

    LC -->|rxResource params=activeDetailId| DR[RealEstateService\n.getListingById]
    DR --> DET[ListingDetailComponent\ndetalhe completo do anúncio]
    DET -->|AppDialogComponent| LC

    DR --> EDIT[ListingEditComponent\neditar campos do anúncio]
    EDIT -->|PATCH /listings/:id| API
    EDIT -->|saved| LC

    CONF[ConfirmDialogComponent] -->|confirmed| DEL[RealEstateService.delete\n→ reloadListings]
```

---

## 5. Enhancement (AI Enrichment)

```mermaid
flowchart TD
    EC[EnhancementComponent\ntab: Enrich · Stats]

    subgraph Tab Enrich
        EC --> LS[ListingSelectorComponent\npesquisar e selecionar anúncios]
        LS -->|onListingsConfirmed| SEL[selectedListings signal]

        SEL -->|count === 1| TP[TranslationPanelComponent\n1 listing selecionado]
        TP -->|POST /enrichment/translate\napply: false — dry-run| API[(API)]
        API -->|ListingTranslationResponse\npreview por locale| TP
        TP -->|edição inline das traduções| TP
        TP -->|POST /enrichment/translate\napply: true — persiste| API

        SEL -->|count > 1| EF[EnrichmentFormComponent\nbulk — aplica imediatamente]
        EF -->|POST /enrichment/bulk\nlocales · force flag| API
        API -->|BulkJobStatus progress| EF
        EF -->|onEnrichmentSuccess| EC
    end

    subgraph Tab Stats
        EC -->|rxResource params=statsRefreshTick| STAT[EnrichmentService.getStats]
        STAT -->|GET /enrichment/stats| API
        STAT --> ES[EnrichmentStatsComponent\ntotal · enriched · pending · cost]
    end

    EC -->|reloadStats após bulk| STAT
```

> **Nota:** `EnrichmentPreviewComponent` e `EnrichmentResultComponent` existem no código mas nunca são usados em nenhum template — dead code.

---

## 6. Export

```mermaid
flowchart TD
    EXP[ExportComponent]
    EXP --> EF[ExportFormComponent]

    EF --> FG[FormGroup\ndistrict · county · property_type\nsource_partner · price_min · price_max]

    FG -->|valueChanges\ndebounce 400ms switchMap| PREV[RealEstateService.getListings\npré-visualizar contagem]
    PREV -->|GET /listings count| API[(API)]
    PREV --> CNT[previewCount signal\nN anúncios a exportar]

    EF -->|exportCSV| EXS[ExportService\nwindow.open URL /export/csv]
    EF -->|exportJSON| EXJ[ExportService\nwindow.open URL /export/json]
    EF -->|exportExcel| EXE[ExportService\nwindow.open URL /export/excel]

    EXS & EXJ & EXE -->|download direto| BRW[Browser download]
```

---

## 7. Imodigi (Publicação)

```mermaid
flowchart TD
    IC[ImodigiComponent]

    IC -->|rxResource| STR[ImodigiService.listStores]
    STR -->|GET /imodigi/stores| API[(API)]
    STR --> OPTS[storeOptions computed\nSelectDropdownComponent]
    OPTS -->|storeControl FormControl| SEL[selectedStore computed]

    IC --> LSC[ListingSelectorComponent\npesquisar e selecionar anúncios]
    LSC -->|onListingsConfirmed| SLS[selectedListings signal]

    SEL & SLS --> PF[ImodigiPublishFormComponent\nstore · listings selecionados]

    PF -->|POST /imodigi/publish| API
    API -->|PublishResult\n✓ sucesso por listing| PF
    PF -->|resultado inline| IC
```

---

## Visão Global — Routing

```mermaid
flowchart LR
    H[HeaderComponent\nhealth polling 30s]
    H -->|/| DASH[Dashboard]
    H -->|/sites| SITES[Sites]
    H -->|/jobs| JOBS[Jobs]
    H -->|/real-estate| LISTINGS[Listings]
    H -->|/enhancement| ENH[Enhancement]
    H -->|/export| EXPORT[Export]
    H -->|/imodigi| IMO[Imodigi]

    subgraph Cross-cutting
        AK[apiKeyInterceptor\nX-API-Key em todos os requests]
        ERR[apiErrorInterceptor\nToastService.error em erros HTTP]
        TC[ToastContainerComponent\nsingleton em app.html]
    end
```
