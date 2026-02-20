import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnhancementComponent } from './enhancement';

describe('Enhancement', () => {
  let component: EnhancementComponent;
  let fixture: ComponentFixture<EnhancementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnhancementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnhancementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
