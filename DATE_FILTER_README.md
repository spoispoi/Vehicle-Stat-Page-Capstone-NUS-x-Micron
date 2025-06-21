# Date Filter Feature for Vehicle Statistics

## Overview

A comprehensive date filtering system has been implemented for the Vehicle Statistics application, allowing users to filter chart data and statistics by date ranges. This feature provides better data analysis capabilities and improved user experience.

## Features

### 1. Date Range Selection
- **Start Date**: Filter data from a specific date onwards
- **End Date**: Filter data up to a specific date
- **Date Range**: Filter data between two specific dates
- **Clear Filter**: Reset to show all data

### 2. Real-time Filtering
- Filters are applied immediately when dates are selected
- Loading indicators show when data is being fetched
- Charts and statistics update automatically

### 3. Visual Feedback
- Active filter indicator with badge
- Clear description of current filter status
- Disabled clear button when no filter is applied

## Implementation Details

### Backend Changes

#### Django Views (`vehicle_stats/tools/views.py`)
- **ToolViewSet**: Added `get_queryset()` method to support date filtering
- **equipment_statistics**: Enhanced to accept `start_date` and `end_date` query parameters
- **Date Parsing**: Uses Django's `parse_date()` for safe date parsing
- **Query Filtering**: Applies `state_in_date__date__gte` and `state_in_date__date__lte` filters

#### API Endpoints
- `GET /api/tools/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /api/statistics/{equip_id}/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

### Frontend Changes

#### Reusable Date Filter Component (`src/app/components/date-filter/`)
- **DateFilterComponent**: Standalone, reusable component
- **Input Validation**: Ensures end date is after start date
- **Event Emission**: Emits date range changes to parent components
- **Responsive Design**: Works on desktop and mobile devices

#### Service Updates
- **StatisticsService**: Added optional date parameters to `getStatistics()`
- **ToolService**: Added optional date parameters to `getTools()`
- **HTTP Parameters**: Uses Angular's `HttpParams` for clean URL construction

#### Component Integration
- **EquipStatisticsComponent**: Integrated date filtering for equipment-specific statistics
- **ToolListComponent**: Integrated date filtering for overall tool statistics
- **Loading States**: Added loading indicators during data fetching

## Usage

### For Users
1. **Select Start Date**: Choose the beginning of your date range
2. **Select End Date**: Choose the end of your date range (optional)
3. **View Results**: Charts and statistics update automatically
4. **Clear Filter**: Click "Clear" to reset to all data

### For Developers
1. **Import Component**: `import { DateFilterComponent } from './components/date-filter/date-filter.component'`
2. **Add to Template**: `<app-date-filter [startDate]="startDate" [endDate]="endDate" (dateRangeChange)="onDateRangeChange($event)" (filterCleared)="onFilterCleared()"></app-date-filter>`
3. **Handle Events**: Implement `onDateRangeChange()` and `onFilterCleared()` methods
4. **Update Services**: Pass date parameters to your API calls

## API Examples

### Filter Tools by Date Range
```bash
GET /api/tools/?start_date=2024-01-01&end_date=2024-12-31
```

### Filter Equipment Statistics by Date Range
```bash
GET /api/statistics/EQUIP001/?start_date=2024-01-01&end_date=2024-12-31
```

## Testing

### Unit Tests
- **DateFilterComponent**: Comprehensive test suite covering all functionality
- **Date Validation**: Tests for date range validation
- **Event Emission**: Tests for proper event handling
- **UI States**: Tests for loading and filter states

### Manual Testing
1. Select different date ranges
2. Verify charts update correctly
3. Test edge cases (same start/end date, invalid dates)
4. Verify loading states work properly

## Styling

The date filter component uses a dark theme that matches the application's design:
- **Background**: Dark card with subtle borders
- **Inputs**: Dark-themed date inputs with focus states
- **Buttons**: Consistent with application button styling
- **Responsive**: Adapts to different screen sizes

## Future Enhancements

1. **Preset Ranges**: Quick selection for common ranges (Last 7 days, Last 30 days, etc.)
2. **Date Picker**: More advanced date picker with calendar view
3. **Multiple Ranges**: Support for multiple date ranges
4. **Export Filtered Data**: Export functionality for filtered results
5. **Saved Filters**: Save and reuse common date filters

## Technical Notes

- **Date Format**: Uses ISO 8601 format (YYYY-MM-DD) for API communication
- **Timezone**: All dates are handled in the user's local timezone
- **Performance**: Efficient database queries with proper indexing
- **Error Handling**: Graceful handling of invalid dates and API errors
- **Accessibility**: Proper ARIA labels and keyboard navigation support 