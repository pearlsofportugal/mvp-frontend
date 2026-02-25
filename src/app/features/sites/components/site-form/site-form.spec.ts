import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SiteFormComponent } from './site-form';
import { SitesService } from '../../../../core/services/sites.service';

class SitesServiceMock {
  create() {
    return of({});
  }

  update() {
    return of({});
  }
}

describe('SiteFormComponent', () => {
  let component: SiteFormComponent;
  let fixture: ComponentFixture<SiteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteFormComponent],
      providers: [{ provide: SitesService, useClass: SitesServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark required selector fields as invalid when empty', () => {
    const listingControl = component['form'].get('listing_link_selector');
    const titleControl = component['form'].get('title_selector');

    expect(listingControl?.hasError('required')).toBe(true);
    expect(titleControl?.hasError('required')).toBe(true);
  });

  it('should move to selectors tab when selectors are invalid on submit', () => {
    component['form'].patchValue({
      key: 'test_site',
      name: 'Test Site',
      base_url: 'https://example.com',
      extraction_mode: 'direct',
    });

    component['onSubmit']();

    expect(component['activeTab']()).toBe('selectors');
    expect(component['form'].invalid).toBe(true);
  });
});
