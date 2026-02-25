import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingSelector } from './listing-selector';

describe('ListingSelector', () => {
  let component: ListingSelector;
  let fixture: ComponentFixture<ListingSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListingSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
