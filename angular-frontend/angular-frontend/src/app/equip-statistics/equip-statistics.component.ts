import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { StatisticsService } from '../services/statistics.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-equip-statistics',
  templateUrl: './equip-statistics.component.html',
  styleUrls: ['./equip-statistics.component.css'],
})
export class EquipStatisticsComponent implements OnInit {
  equipId: string = ''; // Holds the equipment ID
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

  ngOnInit(): void {
    // Fetch the equipment ID from the route
    const equipIdParam = this.route.snapshot.paramMap.get('equip_id');
    if (equipIdParam) {
      this.equipId = equipIdParam;

      // Fetch the statistics for this equipment ID
      this.fetchStatistics(this.equipId);

      // Fetch the full list of entries for this equipment ID
      this.fetchEquipEntries(this.equipId);
    } else {
      console.error('No equipment ID provided in the route.');
    }
  }

  fetchStatistics(equipId: string): void {
    this.statisticsService.getStatistics(equipId).subscribe(
      (data) => {
        this.statistics = data;
        this.populateStatistics();
      },
      (error) => {
        console.error('Error fetching statistics:', error);
      }
    );
  }

  fetchEquipEntries(equipId: string): void {
    this.http.get<any[]>(`/api/tools/?equip_id=${equipId}`).subscribe(
      (data) => {
        this.equipEntries = data;
        this.renderEquipEntries();
      },
      (error) => {
        console.error('Error fetching equipment entries:', error);
      }
    );
  }

  populateStatistics(): void {
    if (this.isBrowser) {
      document.getElementById('total-errors')!.textContent =
        this.statistics.total_errors.toString();
      document.getElementById('most-common-event-code')!.textContent =
        this.statistics.most_common_event_code;
      document.getElementById('most-common-error-name')!.textContent =
        this.statistics.most_common_error_name;
      document.getElementById('earliest-error-date')!.textContent =
        this.statistics.earliest_error_date;
      document.getElementById('latest-error-date')!.textContent =
        this.statistics.latest_error_date;
    }
  }

  renderEquipEntries(): void {
    if (this.isBrowser) {
      const container = document.getElementById('equip-entries-container');
      if (container) {
        container.innerHTML = ''; // Clear any previous content

        this.equipEntries.forEach((entry) => {
          const div = document.createElement('div');
          div.classList.add('equip-entry');
          div.innerHTML = `
            <strong>State In Date:</strong> ${entry.state_in_date} <br>
            <strong>Event Code:</strong> ${entry.event_code} <br>
            <strong>Error Name:</strong> ${entry.error_name} <br>
            <strong>Error Description:</strong> ${entry.error_description} <br>
            <hr>
          `;
          container.appendChild(div);
        });
      }
    }
  }
}
