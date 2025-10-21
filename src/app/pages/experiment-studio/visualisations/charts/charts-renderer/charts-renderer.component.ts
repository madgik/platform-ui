// chart-renderer.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";

@Component({
  selector: 'app-chart-renderer',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule, NgxEchartsDirective],
  templateUrl: './charts-renderer.component.html',
  styleUrl: './charts-renderer.component.css'
})

export class ChartRendererComponent {
  @Input() charts: EChartsOption[] = [];
  @Input() echartsExtentions = [];

  constructor() {
    // this.echartsExtentions = [TooltipComponent, GridComponent, LegendComponent];
  }
}
