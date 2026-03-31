export type SelectorCategory =
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

export interface SelectorField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  category: SelectorCategory;
  required?: boolean;
}

export interface SelectorCategoryMeta {
  key: SelectorCategory;
  title: string;
  description: string;
  sectionModeOnly?: boolean;
}

export const SELECTOR_CATEGORIES: ReadonlyArray<SelectorCategoryMeta> = [
  {
    key: 'listing',
    title: 'Real Estate Identification',
    description: 'Title, ID, URL, and publication date',
  },
  {
    key: 'location',
    title: 'Location',
    description: 'District, Municipality, Parish',
  },
  {
    key: 'property',
    title: 'Property Details',
    description: 'Type, typology, area, rooms, condition',
  },
  {
    key: 'price',
    title: 'Pricing',
    description: 'Price, business type, and price per m²',
  },
  {
    key: 'features',
    title: 'Features',
    description: 'Garage, elevator, balcony, A/C, pool, garden',
  },
  {
    key: 'contact',
    title: 'Advertiser / Contact',
    description: 'Name, phone, agency email',
  },
  {
    key: 'seo',
    title: 'Content / SEO',
    description: 'Description, meta tags, titles',
  },
  {
    key: 'image',
    title: 'Images',
    description: 'Property photo gallery',
  },
  {
    key: 'pagination',
    title: 'Pagination',
    description: 'Navigation between result pages',
  },
  {
    key: 'section',
    title: '🔧 Section-based Extraction',
    description: 'Selectors to extract data from sections with name/value pairs',
    sectionModeOnly: true,
  },
];

export const SUGGEST_FIELD_MAP: Record<string, string> = {
  price: 'price_selector',
  title: 'title_selector',
  area: 'useful_area_selector',
  land_area: 'gross_area_selector',
  rooms: 'bedrooms_selector',
  bathrooms: 'bathrooms_selector',
  property_type: 'property_type_selector',
  typology: 'typology_selector',
  condition: 'condition_selector',
  business_type: 'business_type_selector',
  district: 'district_selector',
  county: 'county_selector',
  parish: 'parish_selector',
  images: 'image_selector',
  listing_link: 'listing_link_selector',
  next_page: 'next_page_selector',
  description: 'description_selector',
  location: 'location_selector',
  publication_date: 'publication_date_selector',
  property_id: 'property_id_selector',
};

export const FIELD_LABELS: Record<string, string> = {
  price: 'Price', title: 'Title', area: 'Useful area', land_area: 'Land area',
  rooms: 'Bedrooms', bathrooms: 'WC', property_type: 'Property type',
  typology: 'Typology', condition: 'Condition', business_type: 'Business type',
  district: 'District', county: 'County', parish: 'Parish', images: 'Images',
  listing_link: 'Listing link', next_page: 'Next page', description: 'Description',
  location: 'Location', publication_date: 'Publication date', property_id: 'Ref ID',
};
export const SELECTOR_FIELDS: ReadonlyArray<SelectorField> = [
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
  { key: 'elevator_selector', label: 'Elevador', placeholder: '.elevator', description: 'Tem elevador', category: 'features' },
  { key: 'balcony_selector', label: 'Varanda', placeholder: '.balcony', description: 'Tem varanda/terraço', category: 'features' },
  { key: 'air_conditioning_selector', label: 'Ar Condicionado', placeholder: '.ac, .air-conditioning', description: 'Tem ar condicionado', category: 'features' },
  { key: 'pool_selector', label: 'Piscina', placeholder: '.pool', description: 'Tem piscina', category: 'features' },
  { key: 'garden_selector', label: 'Jardim', placeholder: '.garden', description: 'Tem jardim', category: 'features' },

  { key: 'advertiser_selector', label: 'Anunciante', placeholder: '.agent .name', description: 'Nome do anunciante/agência', category: 'contact' },
  { key: 'advertiser_phone_selector', label: 'Telefone', placeholder: '.agent .phone', description: 'Telefone do anunciante', category: 'contact' },
  { key: 'advertiser_email_selector', label: 'Email', placeholder: '.agent .email', description: 'Email do anunciante', category: 'contact' },
  { key: 'advertiser_logo_selector', label: 'Logo Agência', placeholder: '.agent img', description: 'Logo da agência', category: 'contact' },

  { key: 'description_selector', label: 'Descrição Completa', placeholder: 'section#description', description: 'Descrição do imóvel', category: 'seo' },
  { key: 'page_title_selector', label: 'Page Title', placeholder: 'title', description: 'Título da página (SEO)', category: 'seo' },
  { key: 'meta_description_selector', label: 'Meta Description', placeholder: 'meta[name="description"]', description: 'Descrição SEO', category: 'seo' },

  { key: 'image_selector', label: 'Imagens', placeholder: '#main-slider img.slide-image', description: 'Galeria de imagens', category: 'image' },
  { key: 'thumbnail_selector', label: 'Thumbnails', placeholder: '.thumbnails img', description: 'Miniaturas das imagens', category: 'image' },
];
