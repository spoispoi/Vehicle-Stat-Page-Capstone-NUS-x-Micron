import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToolService } from '../tool.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tool-detail.component.html',
  styleUrls: ['./tool-detail.component.css']
})
export class ToolDetailComponent implements OnInit {
  tool: any;

  constructor(private route: ActivatedRoute, private toolService: ToolService) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.toolService.getTool(id).subscribe(data => {
      this.tool = data;
    });
  }
}
