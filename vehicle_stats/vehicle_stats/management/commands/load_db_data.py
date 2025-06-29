
# from datetime import datetime
# from django.core.management.base import BaseCommand

# import os
# print(os.getcwd())
# from tools.models import Tool  # Direct import from tools module
# from helper import sqlconnection, engineConn, queryToDictbyScript
# from credential import fsprod04

# class Command(BaseCommand):
#     help = 'Load error data from the database into the Django models'

#     def handle(self, *args, **kwargs):
#         # Path to your SQL script file
#         sql_script_path = r'C:\Users\irodriguez\Desktop\Vehicle-Stat-Page-Capstone-NUS-x-Micron (Use This)\vehicle_stats\tools\stored_procedures\vehicle_data.sql'


#         # Use the helper function to execute the SQL script and get data from the database
#         data = queryToDictbyScript(sql_script_path, fsprod04)

#         # Define the field mapping
#         field_mapping = {
#             'EquipID': 'equip_id',
#             'Day of Equip State In': 'state_in_date',
#             'Event Code': 'event_code',
#             'Error Name': 'error_name',
#             'Error Description': 'error_description'
#         }

#         for row in data:
#             # Map the SQL fields to the Excel fields
#             mapped_row = {field_mapping[key]: value for key, value in row.items()}

#             equip_id = mapped_row['equip_id']
#             state_in_date = mapped_row['state_in_date']
#             event_code = mapped_row['event_code']
#             error_name = mapped_row['error_name']
#             error_description = mapped_row['error_description']

#             # Parse the date safely
#             try:
#                 if state_in_date is None:  # Handle missing values
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

#             # Create the Tool object (does not check for duplicates anymore)
#             try:
#                 tool = Tool.objects.create(
#                     equip_id=equip_id,
#                     state_in_date=formatted_date,
#                     event_code=event_code,
#                     error_name=error_name,
#                     error_description=error_description
#                 )
#                 self.stdout.write(self.style.SUCCESS(f"Created tool: {tool.equip_id}"))
#             except Exception as e:
#                 self.stdout.write(self.style.ERROR(f"Error creating tool: {e}"))



from datetime import datetime
from django.core.management.base import BaseCommand
import os
from tools.models import Tool  # Ensure this import is correct
from helper import sqlconnection, engineConn, queryToDictbyScript
from credential import fsprod04
import pytz
from dateutil import parser


class Command(BaseCommand):
    help = 'Load error data from the database into the Django models'

    def handle(self, *args, **kwargs):
        # Path to your SQL script file
        sql_script_path = r'C:\Users\irodriguez\Desktop\Full-Stack\VSP1.3 (Working without ww) - Copy\VSP 1.3\vehicle_stats\tools\stored_procedures\vehicle_data.sql'

        #C:\Users\irodriguez\Desktop\Vehicle-Stat-Page-Capstone-NUS-x-Micron (Use This)\vehicle_stats\tools\stored_procedures\vehicle_data.sql
        # Use the helper function to execute the SQL script and get data from the database
        data = queryToDictbyScript(sql_script_path, fsprod04)
        print("Data retrieved from the database:", data)
        if data:
            print("Data retrieved from the database:", data)
        else:
            print("No data retrieved or an error occurred.")

        # Define the field mapping using full key tuples
        field_mapping = {
            ('EquipID', str, None, 128, 128, 0, True): 'equip_id',
            ('EquipStateInDT', datetime, None, 23, 23, 3, True): 'state_in_date',
            ('EventCode2', str, None, 1073741823, 1073741823, 0, True): 'event_code',
            ('ErrorName', str, None, 1073741823, 1073741823, 0, True): 'error_name',
            ('EquipmentNotes', str, None, 1073741823, 1073741823, 0, True): 'error_description'
        }
        print("Field mapping:", field_mapping)

        for row in data:
            print("Processing row:", row)
            try:
                # Map the SQL fields to the Excel fields using full key tuples
                mapped_row = {}
                for key, value in row.items():
                    print(f"Key: {key}, Value: {value}")  # Debugging statement
                    if key in field_mapping:
                        mapped_row[field_mapping[key]] = value
                print("Mapped row:", mapped_row)

                equip_id = mapped_row.get('equip_id')
                state_in_date = mapped_row.get('state_in_date')
                event_code = mapped_row.get('event_code')
                error_name = mapped_row.get('error_name')
                error_description = mapped_row.get('error_description')
                report_ww = mapped_row.get('report_ww') 
                
                # Parse ISO 8601 string and convert to local timezone
                if isinstance(state_in_date, str):
                    utc_date = parser.isoparse(state_in_date)
                    local_timezone = pytz.timezone('Asia/Singapore')
                    formatted_date = utc_date.astimezone(local_timezone)
                else:
                    formatted_date = state_in_date

                # Format datetime as string for frontend
                formatted_date_str = formatted_date.strftime('%Y-%m-%d %H:%M:%S')
                print(f"Formatted date for frontend: {formatted_date_str}")

                # Handle None values for other fields
                equip_id = equip_id if equip_id is not None else 'Unknown'
                event_code = event_code if event_code is not None else 'Unknown'
                error_name = error_name if error_name is not None else 'Unknown'
                error_description = error_description if error_description is not None else 'Unknown'
                report_ww = report_ww if report_ww is not None else 'Unknown'

                # Create the Tool object (does not check for duplicates anymore)
                try:
                    tool = Tool.objects.create(
                        equip_id=equip_id,
                        state_in_date=formatted_date,
                        event_code=event_code,
                        error_name=error_name,
                        error_description=error_description,
                        report_ww=report_ww
                    )
                    self.stdout.write(self.style.SUCCESS(f"Created tool: {tool.equip_id}"))
                    print(f"Tool created with state_in_date: {tool.state_in_date}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error creating tool: {e}"))
            except KeyError as e:
                self.stdout.write(self.style.ERROR(f"KeyError: The key '{e.args}' does not exist in the row."))

# def execute_query(connection, query, params):
#     try:
#         cursor = connection.cursor()
#         cursor.execute(query, params)
#         print("Query executed:", query)
#         print("Cursor description:", cursor.description)
#         if cursor.description is None:
#             print("No results returned.")
#             return []
#         columns = [col for col in cursor.description]
#         data = [dict(zip(columns, row)) for row in cursor.fetchall()]
#         return data
#     except Exception as e:
#         print("An error occurred:", e)
#         return None
 

