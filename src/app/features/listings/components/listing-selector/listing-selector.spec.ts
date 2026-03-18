import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingSelectorComponent } from './listing-selector';

describe('ListingSelectorComponent', () => {
  let component: ListingSelectorComponent;
  let fixture: ComponentFixture<ListingSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListingSelectorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
