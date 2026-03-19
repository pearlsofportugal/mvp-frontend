import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingsComponent } from './listings';

describe('Listings', () => {
  let component: ListingsComponent;
  let fixture: ComponentFixture<ListingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListingsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
