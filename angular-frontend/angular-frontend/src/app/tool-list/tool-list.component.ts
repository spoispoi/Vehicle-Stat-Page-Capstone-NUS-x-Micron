import { Component, OnInit, Inject } from '@angular/core';
import { ToolService } from '../tool.service';
import { Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tool-list',
  templateUrl: './tool-list.component.html',
  styleUrls: ['./tool-list.component.css'],
})
export class ToolListComponent implements OnInit {
  tools: any[] = []; // Stores the full dataset fetched from the backend
  filteredTools: any[] = []; // Stores the tools to display, filtered by the search term
  searchTerm: string = ''; // Stores the user's input for filtering tools

  constructor(
    private toolService: ToolService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private router: Router // For navigation
  ) {}

  ngOnInit(): void {
    this.toolService.getTools().subscribe((tools) => {
      console.log('Fetched tools:', tools);

      // Group tools by equip_id and calculate most recent and top error
      const groupedTools = this.groupToolsByEquipId(tools);

      // Prepare filteredTools with distinct equip_id and calculated data
      this.tools = groupedTools;
      this.filteredTools = [...this.tools]; // Initialize the filtered list
      this.renderToolList();
    });
  }

  groupToolsByEquipId(tools: any[]): any[] {
    const grouped: { [key: string]: any[] } = {};

    // Group tools by equip_id
    tools.forEach((tool) => {
      if (!grouped[tool.equip_id]) {
        grouped[tool.equip_id] = [];
      }
      grouped[tool.equip_id].push(tool);
    });

    // Calculate most recent and top error for each equip_id
    return Object.keys(grouped).map((equipId) => {
      const toolGroup = grouped[equipId];

      // Find most recent error
      const mostRecentError = toolGroup.reduce((latest, current) =>
        new Date(latest.state_in_date) > new Date(current.state_in_date) ? latest : current
      );

      // Find top error (most frequent error_name)
      const errorCounts: { [key: string]: number } = {};
      toolGroup.forEach((tool) => {
        errorCounts[tool.error_name] = (errorCounts[tool.error_name] || 0) + 1;
      });

      const topError = Object.keys(errorCounts).reduce((a, b) =>
        errorCounts[a] > errorCounts[b] ? a : b
      );

      return {
        equip_id: equipId,
        most_recent_error: mostRecentError.error_name,
        most_recent_date: mostRecentError.state_in_date,
        top_error: topError,
      };
    });
  }

  onSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();

    // Filter and ensure unique equip_id
    this.filteredTools = this.tools.filter((tool) =>
      tool.equip_id.toLowerCase().includes(searchTerm)
    );

    this.renderToolList(); // Render the updated filtered list
  }

  renderToolList(): void {
    const container = this.document.getElementById('tool-list');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Create a container div for the card layout
    const row = this.renderer.createElement('div');
    this.renderer.addClass(row, 'row');

    // Loop through filtered tools and create cards
    this.filteredTools.forEach((tool) => {
      // Create column div
      const col = this.renderer.createElement('div');
      this.renderer.addClass(col, 'col-md-4');
      this.renderer.addClass(col, 'mb-4');

      // Create card
      const card = this.renderer.createElement('div');
      this.renderer.addClass(card, 'card');
      this.renderer.addClass(card, 'shadow-sm');

      // Create card body
      const cardBody = this.renderer.createElement('div');
      this.renderer.addClass(cardBody, 'card-body');

      // Add card title
      const title = this.renderer.createElement('h5');
      this.renderer.addClass(title, 'card-title');
      title.textContent = tool.equip_id;

      // Add card text
      const text = this.renderer.createElement('p');
      this.renderer.addClass(text, 'card-text');
      text.innerHTML = `
        <strong>Most Recent Error:</strong> ${tool.most_recent_error || 'N/A'}<br>
        <strong>Most Recent Date:</strong> ${tool.most_recent_date || 'N/A'}<br>
       
      `;

      // Add button
      const button = this.renderer.createElement('button');
      this.renderer.addClass(button, 'btn');
      this.renderer.addClass(button, 'btn-primary');
      this.renderer.addClass(button, 'btn-block');
      button.textContent = 'View Statistics';
      this.renderer.listen(button, 'click', () => this.navigateToStatistics(tool.equip_id));

      // Assemble card
      this.renderer.appendChild(cardBody, title);
      this.renderer.appendChild(cardBody, text);
      this.renderer.appendChild(cardBody, button);
      this.renderer.appendChild(card, cardBody);
      this.renderer.appendChild(col, card);
      this.renderer.appendChild(row, col);
    });

    // Append the row to the container
    this.renderer.appendChild(container, row);
  }

  navigateToStatistics(equipId: string): void {
    this.router.navigate(['/statistics', equipId]);
  }
}
