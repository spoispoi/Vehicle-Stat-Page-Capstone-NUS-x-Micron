

# from datetime import datetime
# import pandas as pd
# from tools.models import Tool
# from django.core.management.base import BaseCommand

# class Command(BaseCommand):
#     help = 'Load data from Excel into the database'

#     def handle(self, *args, **kwargs):
#         # Path to your Excel file
#         excel_path = "/Users/ianrodriguez/Downloads/Error History NXA.xlsx"

#         # Read the Excel file
#         try:
#             data = pd.read_excel(excel_path)
#         except FileNotFoundError:
#             self.stdout.write(self.style.ERROR(f"File not found: {excel_path}"))
#             return

#         for _, row in data.iterrows():
#             # Parse the date safely
#             state_in_date = row['Day of Equip State In']
#             try:
#                 if pd.isna(state_in_date):  # Handle missing values
#                     formatted_date = None
#                 elif isinstance(state_in_date, str):
#                     formatted_date = datetime.strptime(state_in_date, '%B %d, %Y').strftime('%Y-%m-%d')
#                 elif isinstance(state_in_date, (float, int)):  # Handle numeric values
#                     formatted_date = datetime.fromtimestamp(state_in_date).strftime('%Y-%m-%d')
#                 else:
#                     formatted_date = None  # Default to None if parsing fails
#             except ValueError:
#                 self.stdout.write(self.style.WARNING(f"Invalid date format: {state_in_date}"))
#                 formatted_date = None

#             # Create or update the Tool object
#             tool, created = Tool.objects.create(
#                 equip_id=row['EquipID'],
#                 defaults={
#                     'state_in_date': formatted_date,
#                     'event_code': row['Event Code'],
#                     'error_name': row['Error Name'],
#                     'error_description': row['Error Description']
#                 }
#             )
#             if created:
#                 self.stdout.write(self.style.SUCCESS(f"Created tool: {tool.equip_id}"))
#             else:
#                 self.stdout.write(self.style.SUCCESS(f"Updated tool: {tool.equip_id}"))

from datetime import datetime
import pandas as pd
from django.core.management.base import BaseCommand
from tools.models import Tool  
import sys
import os
from django.conf import settings

# Set the DJANGO_SETTINGS_MODULE environment variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vehicle_stats.vehicle_stats.settings')

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))


import django
django.setup()
class Command(BaseCommand):
    help = 'Load data from Excel into the database'

    def handle(self, *args, **kwargs):
        # Path to your Excel file
        excel_path = r"C:\Users\irodriguez\Downloads\Error History NXA (1).xlsx"

        # Read the Excel file
        try:
            data = pd.read_excel(excel_path)
            self.stdout.write(self.style.SUCCESS(f"Columns in Excel file: {data.columns.tolist()}"))
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"File not found: {excel_path}"))
            return

        # Check if 'Error Description' column exists
        if 'Error Description' not in data.columns:
            self.stdout.write(self.style.ERROR("Column 'Error Description' not found in the Excel file"))
            return

        # Fix merged cells in the EquipID column
        if 'EquipID' in data.columns:
            data['EquipID'] = data['EquipID'].fillna(method='ffill')

        for _, row in data.iterrows():
            # Parse the date safely
            state_in_date = row['Day of Equip State In']
            try:
                if pd.isna(state_in_date):  # Handle missing values
                    formatted_date = None
                elif isinstance(state_in_date, str):
                    formatted_date = datetime.strptime(state_in_date, '%B %d, %Y').strftime('%Y-%m-%d')
                elif isinstance(state_in_date, (float, int)):  # Handle numeric values
                    formatted_date = datetime.fromtimestamp(state_in_date).strftime('%Y-%m-%d')
                else:
                    formatted_date = None  # Default to None if parsing fails
            except ValueError:
                self.stdout.write(self.style.WARNING(f"Invalid date format: {state_in_date}"))
                formatted_date = None

            # Create the Tool object (does not check for duplicates anymore)
            try:
                tool = Tool.objects.create(
                    equip_id=row['EquipID'],
                    state_in_date=formatted_date,
                    event_code=row['Event Code'],
                    error_name=row['Error Name'],
                    error_description=row['Error Description']
                )
                self.stdout.write(self.style.SUCCESS(f"Created tool: {tool.equip_id}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating tool: {e}"))