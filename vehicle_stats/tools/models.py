# from django.db import models
# from django.utils import timezone

# class Tool(models.Model):
#     equip_id = models.CharField(max_length=50)
#     state_in_date = models.DateTimeField(null=True, blank=True)
#     event_code = models.CharField(max_length=20)
#     error_name = models.CharField(max_length=255)
#     error_description = models.TextField()
#     recent_errors = models.CharField(max_length=255, null=True, blank=True)
#     report_ww = models.CharField(max_length=10, null=True, blank=True)
#     def save(self, *args, **kwargs):
#         # Ensure state_in_date is timezone-aware if it exists
#         if self.state_in_date and timezone.is_naive(self.state_in_date):
#             self.state_in_date = timezone.make_aware(self.state_in_date)
#         super(Tool, self).save(*args, **kwargs)

#     def __str__(self):
#         formatted_date = self.state_in_date.strftime('%Y-%m-%d %H:%M:%S') if self.state_in_date else 'N/A'
#         return f"Tool(equip_id={self.equip_id}, state_in_date={formatted_date}, event_code={self.event_code}, error_name={self.error_name}, error_description={self.error_description})"

from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta

class Tool(models.Model):
    equip_id = models.CharField(max_length=50)
    state_in_date = models.DateTimeField(null=True, blank=True)
    event_code = models.CharField(max_length=20)
    error_name = models.CharField(max_length=255)
    error_description = models.TextField()
    recent_errors = models.CharField(max_length=255, null=True, blank=True)
    report_ww = models.CharField(max_length=10, null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Ensure state_in_date is timezone-aware if it exists
        if self.state_in_date and timezone.is_naive(self.state_in_date):
            self.state_in_date = timezone.make_aware(self.state_in_date)
        super(Tool, self).save(*args, **kwargs)

    def get_workweek_year(self):
        """Extract year from report_ww (e.g., 202328 -> 2023)"""
        if self.report_ww and len(self.report_ww) >= 4:
            try:
                return int(self.report_ww[:4])
            except ValueError:
                return None
        return None
    
    def get_workweek_number(self):
        """Extract week number from report_ww (e.g., 202328 -> 28)"""
        if self.report_ww and len(self.report_ww) >= 6:
            try:
                return int(self.report_ww[4:])
            except ValueError:
                return None
        return None
    
    def get_workweek_start_date(self):
        """
        Convert work week to actual start date based on company standard:
        WW01 2025 = January 3, 2025 to January 9, 2025
        WW02 2025 = January 10, 2025 to January 16, 2025
        """
        year = self.get_workweek_year()
        week = self.get_workweek_number()
        
        if year and week:
            try:
                # Find WW01 start date for the given year
                # WW01 2025 starts on January 3, 2025 (Friday)
                # We need to find the first Friday of January for each year
                jan_1 = datetime(year, 1, 1)
                
                # Find the first Friday of January
                # weekday() returns 0=Monday, 1=Tuesday, ..., 4=Friday, 6=Sunday
                days_to_first_friday = (4 - jan_1.weekday()) % 7
                if days_to_first_friday == 0 and jan_1.day > 1:
                    # If Jan 1 is Friday but not the first Friday we want
                    days_to_first_friday = 7
                
                # For 2025: Jan 1 is Wednesday (weekday=2), so days_to_first_friday = (4-2)%7 = 2
                # Jan 1 + 2 days = Jan 3 (Friday) - this matches your WW01 2025 start
                ww01_start = jan_1 + timedelta(days=days_to_first_friday)
                
                # Calculate the start date for the specified week
                # WW01 = ww01_start, WW02 = ww01_start + 7 days, etc.
                week_start = ww01_start + timedelta(weeks=week-1)
                
                return week_start.date()
            except (ValueError, OverflowError):
                return None
        return None
    
    def get_workweek_end_date(self):
        """Get the end date (Thursday) of the work week (Friday to Thursday pattern)"""
        start_date = self.get_workweek_start_date()
        if start_date:
            return start_date + timedelta(days=6)  # Friday + 6 days = Thursday
        return None
    
    def get_workweek_display(self):
        """Get a human-readable work week format (e.g., 'WW28 2023')"""
        year = self.get_workweek_year()
        week = self.get_workweek_number()
        if year and week:
            return f"WW{week:02d} {year}"
        return self.report_ww or 'Unknown'
    
    def get_workweek_short_display(self):
        """Get a short work week format for charts (e.g., '2023-28')"""
        year = self.get_workweek_year()
        week = self.get_workweek_number()
        if year and week:
            return f"{year}-{week:02d}"
        return self.report_ww or 'Unknown'
    
    def get_workweek_date_range(self):
        """Get the full date range as a string (e.g., 'Jan 3 - Jan 9, 2025')"""
        start_date = self.get_workweek_start_date()
        end_date = self.get_workweek_end_date()
        if start_date and end_date:
            if start_date.year == end_date.year:
                if start_date.month == end_date.month:
                    return f"{start_date.strftime('%b %d')} - {end_date.strftime('%d, %Y')}"
                else:
                    return f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
            else:
                return f"{start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')}"
        return None

    def __str__(self):
        formatted_date = self.state_in_date.strftime('%Y-%m-%d %H:%M:%S') if self.state_in_date else 'N/A'
        workweek_display = self.get_workweek_display()
        return f"Tool(equip_id={self.equip_id}, state_in_date={formatted_date}, workweek={workweek_display}, event_code={self.event_code}, error_name={self.error_name})"