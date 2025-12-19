import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NorthAfricaComponent } from './north-africa.component';

describe('NorthAfricaComponent', () => {
  let component: NorthAfricaComponent;
  let fixture: ComponentFixture<NorthAfricaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NorthAfricaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NorthAfricaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
