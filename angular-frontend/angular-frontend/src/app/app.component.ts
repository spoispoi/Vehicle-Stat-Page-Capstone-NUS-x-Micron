import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NgxChartsModule } from '@swimlane/ngx-charts';
//import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { StatisticsService } from './services/statistics.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxChartsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  // saleData = [
  //   { name: "Mobiles", value: 1050000 },
  //   { name: "Laptop", value: 55000 },
  //   { name: "AC", value: 15000 },
  //   { name: "Headset", value: 150000 },
  //   { name: "Fridge", value: 20000 }
  // ];

  errorFrequencyData: any[] = [];
  errorNotesData: any[] = [];
  equipId: string = '';
  //constructor(private route: ActivatedRoute, private statisticsService: StatisticsService) {}
  
  statistics: any = null; // Holds the fetched statistics data
  equipEntries: any[] = []; // Holds the list of tool entries for the equip_id
  isBrowser: boolean; // Indicates if running in the browser

  constructor(
    private route: ActivatedRoute,
    private statisticsService: StatisticsService,
    private http: HttpClient, // Needed for additional fetches
    @Inject(PLATFORM_ID) private platformId: Object // For checking the platform
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }


  // ngOnInit() {
  //   this.fetchStatistics('1'); // Replace with actual equipment ID
  // }

  // ngOnInit() {
  //   this.route.params.subscribe(params => {
  //     const equipId = params['equipId'];
  //     this.fetchStatistics(equipId);
  //   });
  // }

  ngOnInit(): void {
    // Fetch the equipment ID from the route
    const equipIdParam = this.route.snapshot.paramMap.get('equip_id');
    if (equipIdParam) {
      this.equipId = equipIdParam;

      // Fetch the statistics for this equipment ID
      this.fetchStatistics(this.equipId);

      // Fetch the full list of entries for this equipment ID
  
    } else {
      console.error('No equipment ID provided in the route aaa.');
    }
  }
  fetchStatistics(equipId: string) {
    this.statisticsService.getStatistics(equipId).subscribe((data: any) => {
      this.transformData(data);
    });
  }

  transformData(data: any) {
    // Transform error frequency data
    this.errorFrequencyData = data.error_frequency.map((item: any) => ({
      name: new Date(item.state_in_date).toLocaleDateString(),
      value: item.count
    }));

    // Transform error notes data
    this.errorNotesData = Object.keys(data.error_notes).map(key => ({
      name: key,
      value: data.error_notes[key].length
    }));
  }
}
