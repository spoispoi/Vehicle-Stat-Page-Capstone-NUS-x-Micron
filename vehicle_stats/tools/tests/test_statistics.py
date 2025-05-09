from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from tools.models import Tool
import json

class EquipmentStatisticsTests(TestCase):
    def setUp(self):
        """Set up test data before each test"""
        # Create test date
        test_date = timezone.now()
        
        # Create test tools with different error types
        self.tool1 = Tool.objects.create(
            equip_id='TEST-EQUIP-001',
            state_in_date=test_date,
            event_code='E001',
            error_name='Error Type 1',
            error_description='First error description'
        )
        
        self.tool2 = Tool.objects.create(
            equip_id='TEST-EQUIP-001',
            state_in_date=test_date,
            event_code='E001',
            error_name='Error Type 1',
            error_description='Second error description'
        )
        
        self.tool3 = Tool.objects.create(
            equip_id='TEST-EQUIP-001',
            state_in_date=test_date,
            event_code='E002',
            error_name='Error Type 2',
            error_description='Third error description'
        )

    def test_basic_statistics(self):
        """Test basic statistics like total errors and date ranges"""
        response = self.client.get(f"/api/statistics/TEST-EQUIP-001/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        # Check total errors
        self.assertEqual(data['total_errors'], 3)
        # Check that dates are properly formatted
        self.assertIsNotNone(data['earliest_error_date'])
        self.assertIsNotNone(data['latest_error_date'])

    def test_most_common_errors(self):
        """Test that most common event code and error name are correctly identified"""
        response = self.client.get(f"/api/statistics/TEST-EQUIP-001/")
        data = response.json()
        
        # E001 appears twice, E002 appears once
        self.assertEqual(data['most_common_event_code'], 'E001')
        # Error Type 1 appears twice, Error Type 2 appears once
        self.assertEqual(data['most_common_error_name'], 'Error Type 1')

    def test_error_notes_grouping(self):
        """Test that error notes are properly grouped by error name"""
        response = self.client.get(f"/api/statistics/TEST-EQUIP-001/")
        data = response.json()
        
        # Check error notes structure
        self.assertIn('error_notes', data)
        error_notes = data['error_notes']
        
        # Check that Error Type 1 has two descriptions
        self.assertIn('Error Type 1', error_notes)
        self.assertEqual(len(error_notes['Error Type 1']), 2)
        self.assertIn('First error description', error_notes['Error Type 1'])
        self.assertIn('Second error description', error_notes['Error Type 1'])
        
        # Check that Error Type 2 has one description
        self.assertIn('Error Type 2', error_notes)
        self.assertEqual(len(error_notes['Error Type 2']), 1)
        self.assertIn('Third error description', error_notes['Error Type 2'])

    def test_error_frequency(self):
        """Test that error frequency data is properly calculated and formatted"""
        response = self.client.get(f"/api/statistics/TEST-EQUIP-001/")
        data = response.json()
        
        # Check error frequency structure
        self.assertIn('error_frequency', data)
        frequency_data = data['error_frequency']
        
        # Should have 2 entries (Error Type 1 appears twice on same date, Error Type 2 once)
        self.assertEqual(len(frequency_data), 2)
        
        # Check format of each entry
        for entry in frequency_data:
            self.assertIn('date', entry)
            self.assertIn('error_name', entry)
            self.assertIn('count', entry)
            
        # Find Error Type 1 entry and verify count is 2
        error_type_1 = next(entry for entry in frequency_data if entry['error_name'] == 'Error Type 1')
        self.assertEqual(error_type_1['count'], 2)
        
        # Find Error Type 2 entry and verify count is 1
        error_type_2 = next(entry for entry in frequency_data if entry['error_name'] == 'Error Type 2')
        self.assertEqual(error_type_2['count'], 1)

    def test_nonexistent_equipment(self):
        """Test response for non-existent equipment"""
        response = self.client.get("/api/statistics/NONEXISTENT/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertEqual(data['error'], 'Equipment not found')

    def test_unknown_errors_exclusion(self):
        """Test that 'Unknown' errors are excluded from most common calculations"""
        # Add an 'Unknown' error
        Tool.objects.create(
            equip_id='TEST-EQUIP-001',
            state_in_date=timezone.now(),
            event_code='Unknown',
            error_name='Unknown',
            error_description='Unknown error'
        )
        
        response = self.client.get(f"/api/statistics/TEST-EQUIP-001/")
        data = response.json()
        
        # Most common should still be E001, not Unknown
        self.assertEqual(data['most_common_event_code'], 'E001')
        self.assertEqual(data['most_common_error_name'], 'Error Type 1') 