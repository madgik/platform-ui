import { Component, Input, AfterViewInit, QueryList, ViewChildren, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ECharts, EChartsOption } from 'echarts';
import { NgxEchartsModule, NgxEchartsDirective } from 'ngx-echarts';

@Component({
    selector: 'app-chart-renderer',
    imports: [CommonModule, NgxEchartsModule],
    templateUrl: './charts-renderer.component.html',
    styleUrls: ['./charts-renderer.component.css']
})
export class ChartRendererComponent implements AfterViewInit {
  @Input() charts: EChartsOption[] = [];
  @ViewChildren(NgxEchartsDirective) echartsDirectives!: QueryList<NgxEchartsDirective>;

  private instances: ECharts[] = [];

  constructor(private zone: NgZone) { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.instances = this.echartsDirectives
          .map(d => (d as any).getInstance?.())
          .filter((i): i is ECharts => !!i);
      }, 1000);
    });
  }

  getInstances(): ECharts[] {
    return this.instances;
  }
}
