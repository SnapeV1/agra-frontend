
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
  SimpleChanges,
} from '@angular/core';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

export interface LiveCountry {
  name: string;
  code: string;
  users: number;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-north-africa',
  templateUrl: './north-africa.component.html',
  styleUrls: ['./north-africa.component.css']
})
export class NorthAfricaComponent implements AfterViewInit, OnChanges {
  @ViewChild('svg') svgRef!: ElementRef<SVGSVGElement>;

  @Input() countries: LiveCountry[] = [];
  @Input() totalUsers = 0;

  northAfricaCodes = ['MA', 'DZ', 'TN', 'LY', 'EG', 'MR', 'EH'];

  ngAfterViewInit() {
    this.drawMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.svgRef?.nativeElement) {
      this.drawMap();
    }
  }

  get displayCountries(): LiveCountry[] {
    return (this.countries || []).filter((c) =>
      this.northAfricaCodes.includes(c.code)
    );
  }

  get totalUsersCount(): number {
    if (this.totalUsers > 0) return this.totalUsers;
    return this.displayCountries.reduce((sum, c) => sum + (c.users || 0), 0);
  }

  drawMap() {
    if (!this.svgRef?.nativeElement) {
      return;
    }
    const svg = d3.select(this.svgRef.nativeElement);
    svg.selectAll('*').remove();

    const width = 900;
    const height = 500;

    const projection = d3
      .geoMercator()
      .center([40, 28])
      .scale(400)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    d3.json(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
    ).then((world: any) => {
      const countries = (feature(world as any, world.objects.countries as any) as any)
        .features || [];

      svg
        .append('g')
        .selectAll('path')
        .data(countries)
        .enter()
        .append('path')
        .attr('d', (d: any) => path(d) as any)
        .attr('fill', (d: any) => {
          const code = d.properties.ISO_A2;
          if (!this.northAfricaCodes.includes(code)) {
            return '#f1f5f9';
          }
          return '#fef3c7';
        })
        .attr('stroke', '#d4d4d8');

      // MARKERS (equivalent to <Marker />)
      const markerData = this.displayCountries.filter(
        (c) =>
          typeof c.lat === 'number' &&
          typeof c.lng === 'number' &&
          (c.users || 0) > 0
      );
      svg
        .append('g')
        .selectAll('circle')
        .data(markerData)
        .enter()
        .append('circle')
        .attr('cx', (d) => projection([d.lng, d.lat])![0])
        .attr('cy', (d) => projection([d.lng, d.lat])![1])
        .attr('r', 6)
        .attr('fill', '#0d9488')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    });
  }
}
