import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../core/services/sites.service';
import {
  SiteConfig,
  SiteConfigCreate,
} from '../../../../core/models/site-config.model';

type ExtractionMode = 'section' | 'direct';

interface SelectorField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  category:
    | 'listing'
    | 'location'
    | 'property'
    | 'price'
    | 'features'
    | 'contact'
    | 'seo'
    | 'pagination'
    | 'image'
    | 'section';
  required?: boolean;
}

const SELECTOR_FIELDS: ReadonlyArray<SelectorField> = [
  { key: 'listing_link_selector', label: 'Link dos Anúncios', placeholder: 'a.property-card', description: 'Seletor para os links de cada anúncio na listagem', category: 'listing', required: true },
  { key: 'next_page_selector', label: 'Próxima Página', placeholder: 'a.pagination-next', description: 'Seletor para o link da próxima página', category: 'pagination' },
  { key: 'details_section', label: 'Secção Detalhes', placeholder: 'section#details', description: 'Container com pares nome/valor', category: 'section' },
  { key: 'detail_item_selector', label: 'Item Detalhe', placeholder: '.detail', description: 'Cada item dentro da secção', category: 'section' },
  { key: 'detail_name_selector', label: 'Nome Campo', placeholder: '.name', description: 'Seletor para o nome do campo', category: 'section' },
  { key: 'detail_value_selector', label: 'Valor Campo', placeholder: '.value', description: 'Seletor para o valor', category: 'section' },
  { key: 'areas_section', label: 'Secção Áreas', placeholder: 'section#areas', description: 'Container com áreas', category: 'section' },
  { key: 'area_item_selector', label: 'Item Área', placeholder: '.area', description: 'Cada item de área', category: 'section' },
  { key: 'characteristics_section', label: 'Secção Características', placeholder: 'section#characteristics', description: 'Container com características', category: 'section' },
  { key: 'nearby_section', label: 'Secção Proximidades', placeholder: 'section#nearby', description: 'Container com proximidades', category: 'section' },
  { key: 'nearby_item_selector', label: 'Item Proximidade', placeholder: '.name', description: 'Cada proximidade', category: 'section' },

  { key: 'title_selector', label: 'Título do Anúncio', placeholder: 'h1#title', description: 'Título principal do imóvel', category: 'listing', required: true },
  { key: 'property_id_selector', label: 'ID do Imóvel', placeholder: '.reference .value', description: 'Referência/ID único', category: 'listing' },
  { key: 'publication_date_selector', label: 'Data de Publicação', placeholder: '.publish-date', description: 'Data de publicação do anúncio', category: 'listing' },

  { key: 'location_selector', label: 'Localização Geral', placeholder: 'section#address', description: 'Localização completa', category: 'location' },
  { key: 'district_selector', label: 'Distrito', placeholder: '.district .value', description: 'Distrito (ex: Porto, Lisboa)', category: 'location' },
  { key: 'county_selector', label: 'Concelho', placeholder: '.county .value', description: 'Concelho/Município', category: 'location' },
  { key: 'parish_selector', label: 'Freguesia', placeholder: '.parish .value', description: 'Freguesia', category: 'location' },

  { key: 'property_type_selector', label: 'Tipo de Imóvel', placeholder: '.property-type .value', description: 'Apartamento, Moradia, etc.', category: 'property' },
  { key: 'typology_selector', label: 'Tipologia', placeholder: '.typology .value', description: 'T0, T1, T2, etc.', category: 'property' },
  { key: 'useful_area_selector', label: 'Área Útil', placeholder: '.useful-area .value', description: 'Área útil em m²', category: 'property' },
  { key: 'gross_area_selector', label: 'Área Bruta', placeholder: '.gross-area .value', description: 'Área bruta em m²', category: 'property' },
  { key: 'bedrooms_selector', label: 'Quartos', placeholder: '.bedrooms .value', description: 'Número de quartos', category: 'property' },
  { key: 'bathrooms_selector', label: 'Casas de Banho', placeholder: '.bathrooms .value', description: 'Número de WCs', category: 'property' },
  { key: 'floor_selector', label: 'Andar', placeholder: '.floor .value', description: 'Andar do imóvel', category: 'property' },
  { key: 'construction_year_selector', label: 'Ano Construção', placeholder: '.year .value', description: 'Ano de construção', category: 'property' },
  { key: 'energy_certificate_selector', label: 'Certificado Energético', placeholder: '.energy .value, .energy img', description: 'Classe energética (A-G)', category: 'property' },
  { key: 'condition_selector', label: 'Estado', placeholder: '.rectangle, .condition', description: 'Novo/Usado/Renovado', category: 'property' },

  { key: 'price_selector', label: 'Preço', placeholder: '.price .value', description: 'Preço de venda/arrendamento', category: 'price' },
  { key: 'business_type_selector', label: 'Tipo Negócio', placeholder: '.business-type .value', description: 'Compra/Arrendamento', category: 'price' },
  { key: 'price_per_m2_selector', label: 'Preço por m²', placeholder: '.price-m2', description: 'Preço por metro quadrado', category: 'price' },

  { key: 'features_selector', label: 'Lista Características', placeholder: '.features li, .amenities span', description: 'Todas as características', category: 'features' },
  { key: 'garage_selector', label: 'Garagem', placeholder: '.garage, [data-feature="garage"]', description: 'Garagem/Estacionamento', category: 'features' },
  { key: 'elevator_selector', label: 'Elevador', placeholder: '.elevator, [data-feature="elevator"]', description: 'Tem elevador', category: 'features' },
  { key: 'balcony_selector', label: 'Varanda/Terraço', placeholder: '.balcony, .terrace', description: 'Varanda ou terraço', category: 'features' },
  { key: 'air_conditioning_selector', label: 'Ar Condicionado', placeholder: '.ac, .air-conditioning', description: 'A/C ou aquecimento central', category: 'features' },
  { key: 'pool_selector', label: 'Piscina', placeholder: '.pool, [data-feature="pool"]', description: 'Piscina', category: 'features' },
  { key: 'garden_selector', label: 'Jardim', placeholder: '.garden, [data-feature="garden"]', description: 'Jardim', category: 'features' },

  { key: 'advertiser_selector', label: 'Anunciante', placeholder: '.agent .name', description: 'Nome do anunciante/agência', category: 'contact' },
  { key: 'advertiser_phone_selector', label: 'Telefone', placeholder: '.agent .phone', description: 'Telefone do anunciante', category: 'contact' },
  { key: 'advertiser_email_selector', label: 'Email', placeholder: '.agent .email', description: 'Email do anunciante', category: 'contact' },
  { key: 'advertiser_logo_selector', label: 'Logo Agência', placeholder: '.agent img', description: 'Logo da agência', category: 'contact' },

  { key: 'description_selector', label: 'Descrição Completa', placeholder: 'section#description', description: 'Descrição do imóvel', category: 'seo' },
  { key: 'meta_description_selector', label: 'Meta Description', placeholder: 'meta[name="description"]', description: 'Meta description da página', category: 'seo' },
  { key: 'page_title_selector', label: 'Page Title', placeholder: 'title', description: 'Título da página (SEO)', category: 'seo' },

  { key: 'image_selector', label: 'Imagens', placeholder: '#main-slider img.slide-image', description: 'Galeria de imagens', category: 'image' },
  { key: 'thumbnail_selector', label: 'Thumbnails', placeholder: '.thumbnails img', description: 'Miniaturas das imagens', category: 'image' },
];

@Component({
  selector: 'app-site-form',
  imports: [ReactiveFormsModule],
  templateUrl: './site-form.html',
  styleUrl: './site-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFormComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfig | null>(null);
  success = output<void>();
  cancel = output<void>();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<'basic' | 'selectors' | 'advanced'>('basic');
  protected readonly showHelp = signal(false);

  protected readonly selectorFields = SELECTOR_FIELDS;

  protected readonly form = new FormGroup({
    key: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    base_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
    }),
    extraction_mode: new FormControl<ExtractionMode>('direct', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    link_pattern: new FormControl('', { nonNullable: true }),
    image_filter: new FormControl('', { nonNullable: true }),
    ...this.buildSelectorControls(),
  });

  constructor() {
    effect(() => {
      const currentSite = this.site();
      if (currentSite) {
        this.patchFormForEdit(currentSite);
      } else {
        this.resetFormForCreate();
      }
    });
  }

  protected getSelectorsByCategory(category: SelectorField['category']): SelectorField[] {
    return this.selectorFields.filter((f) => f.category === category);
  }

  protected setTab(tab: 'basic' | 'selectors' | 'advanced'): void {
    this.activeTab.set(tab);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeTab.set('basic');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const payload = this.buildPayload();
    const currentSite = this.site();

    const request$ = currentSite
      ? this.sitesService.update(currentSite.key, payload)
      : this.sitesService.create(payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.emit();
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Erro ao guardar site';
          this.error.set(message);
          this.submitting.set(false);
        },
      });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected toggleHelp(): void {
    this.showHelp.update((v) => !v);
  }

  private buildSelectorControls(): Record<string, FormControl<string>> {
    return this.selectorFields.reduce<Record<string, FormControl<string>>>((acc, field) => {
      acc[field.key] = new FormControl('', { nonNullable: true });
      return acc;
    }, {});
  }

  private patchFormForEdit(site: SiteConfig): void {
    const selectors = (site.selectors as Record<string, string> | null) ?? {};
    const selectorPatch = this.selectorFields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = selectors[field.key] ?? '';
      return acc;
    }, {});

    this.form.patchValue({
      key: site.key,
      name: site.name,
      base_url: site.base_url,
      extraction_mode: (site.extraction_mode as ExtractionMode | undefined) ?? 'direct',
      link_pattern: site.link_pattern ?? '',
      image_filter: site.image_filter ?? '',
      ...selectorPatch,
    });

    this.form.controls.key.disable();
  }

  private resetFormForCreate(): void {
    this.form.reset({
      key: '',
      name: '',
      base_url: '',
      extraction_mode: 'direct',
      link_pattern: '',
      image_filter: '',
    });
    this.form.controls.key.enable();
  }

  private buildPayload(): SiteConfigCreate {
    const raw = this.form.getRawValue() as Record<string, string> & {
      extraction_mode: ExtractionMode;
    };

    const selectors = this.selectorFields.reduce<Record<string, string>>((acc, field) => {
      const value = raw[field.key]?.trim();
      if (value) acc[field.key] = value;
      return acc;
    }, {});

    return {
      key: raw['key'].trim(),
      name: raw['name'].trim(),
      base_url: raw['base_url'].trim(),
      extraction_mode: raw.extraction_mode,
      selectors,
      link_pattern: raw['link_pattern'].trim() || undefined,
      image_filter: raw['image_filter'].trim() || undefined,
    };
  }
}