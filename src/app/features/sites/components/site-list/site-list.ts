import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SiteConfig } from '../../../../core/models/site-config.model';

@Component({
  selector: 'app-site-list',
  imports: [],
  templateUrl: './site-list.html',
  styleUrl: './site-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteListComponent {
  sites = input.required<SiteConfig[]>();
  edit = output<SiteConfig>();
  delete = output<string>();

  protected onEdit(site: SiteConfig): void {
    this.edit.emit(site);
  }

  protected onDelete(key: string): void {
    this.delete.emit(key);
  }

  protected viewSelectors(site: SiteConfig): void {
    alert(JSON.stringify(site.selectors, null, 2));
  }

  protected getSelectorCount(site: SiteConfig): number {
    if (!site.selectors) return 0;
    return Object.keys(site.selectors).filter(
      key => site.selectors![key as keyof typeof site.selectors]
    ).length;
  }
}
