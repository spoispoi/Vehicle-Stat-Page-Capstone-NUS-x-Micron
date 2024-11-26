

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
from tools.models import Tool
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Load data from Excel into the database'

    def handle(self, *args, **kwargs):
        # Path to your Excel file
        excel_path = "/Users/ianrodriguez/Downloads/Error History NXA.xlsx"

        # Read the Excel file
        try:
            data = pd.read_excel(excel_path)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"File not found: {excel_path}"))
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
