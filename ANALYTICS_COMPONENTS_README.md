# Analytics Line Chart Components

A comprehensive analytics dashboard with line charts for borrowing and returning data, built with Next.js, Chart.js, and Framer Motion.

## Features

### 🎯 Core Functionality
- **Dual Analytics Views**: Switch between borrowing and returning analytics
- **Interactive Line Charts**: Built with Chart.js for smooth performance
- **Multiple Datasets**: Display multiple data series on the same chart
- **Real-time Tooltips**: Custom tooltips with formatted data
- **Responsive Design**: Works seamlessly across all device sizes

### 📊 Chart Features
- **Smooth Animations**: Powered by Framer Motion
- **Trend Indicators**: Visual indicators for growth/decline patterns
- **Multiple Timeframes**: 7d, 30d, 90d, 1y, all-time views
- **Custom Styling**: Modern gradient designs with dark mode support
- **Export Functionality**: CSV and JSON export options

### 🎨 UI/UX
- **Modern Interface**: Gradient cards with glass morphism effects
- **Intuitive Navigation**: Easy-to-use menu system
- **Loading States**: Elegant skeleton loading animations
- **Error Handling**: Graceful error states with retry options
- **Accessibility**: WCAG compliant design patterns

## Components Overview

### 1. AnalyticsLineChart (`analytics-line-chart.tsx`)
The core chart component that renders line charts using Chart.js.

**Props:**
- `datasets`: Array of chart datasets
- `title`: Chart title
- `subtitle`: Optional subtitle
- `height`: Chart height in pixels
- `isLoading`: Loading state
- `showTrend`: Show trend indicator
- `timeframe`: Current timeframe
- `formatTooltip`: Custom tooltip formatter

**Features:**
- Responsive design
- Custom tooltips
- Trend calculations
- Multiple datasets support
- Loading skeleton

### 2. AnalyticsMenu (`analytics-menu.tsx`)
Navigation component for switching between analytics types and timeframes.

**Props:**
- `activeType`: Current analytics type ('borrowing' | 'returning')
- `timeframe`: Current timeframe
- `onTypeChange`: Type change handler
- `onTimeframeChange`: Timeframe change handler
- `onRefresh`: Refresh handler
- `onExport`: Export handler
- `isLoading`: Loading state
- `totalBorrowings`: Total borrowings count
- `totalReturns`: Total returns count

**Features:**
- Visual menu cards
- Quick stats display
- Export controls
- Timeframe selector
- Loading states

### 3. AnalyticsDashboard (`analytics-dashboard.tsx`)
Main dashboard component that orchestrates all analytics functionality.

**Features:**
- State management
- Data loading
- Summary statistics
- Insights cards
- Responsive layout

### 4. Analytics Data (`analytics-data.ts`)
Utility functions for data generation and manipulation.

**Functions:**
- `generateBorrowingData()`: Creates borrowing sample data
- `generateReturningData()`: Creates returning sample data
- `generateSummaryStats()`: Calculates statistics
- `exportAnalyticsData()`: Handles data export
- `formatTooltipValue()`: Formats tooltip values

## Installation & Setup

### Prerequisites
- Next.js 13+ project
- Chart.js and react-chartjs-2 already installed
- Framer Motion for animations
- Tailwind CSS for styling

### Dependencies
The following packages are already included in your project:
```json
{
  "chart.js": "^4.5.0",
  "react-chartjs-2": "^5.3.0",
  "framer-motion": "^12.23.13"
}
```

### File Structure
```
src/
├── components/
│   ├── analytics/
│   │   ├── analytics-line-chart.tsx    # Core chart component
│   │   ├── analytics-menu.tsx          # Navigation menu
│   │   └── analytics-dashboard.tsx     # Main dashboard
│   └── ui/
│       ├── animated-card.tsx           # Existing UI component
│       ├── animated-button.tsx         # Existing UI component
│       └── badge.tsx                   # Existing UI component
├── lib/
│   ├── analytics-data.ts               # Data utilities
│   ├── animations.ts                   # Existing animations
│   └── utils.ts                        # Existing utilities
└── app/
    └── analytics-demo/
        └── page.tsx                    # Demo page
```

## Usage Examples

### Basic Usage
```tsx
import AnalyticsDashboard from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen">
      <AnalyticsDashboard />
    </main>
  )
}
```

### Using Individual Components
```tsx
import AnalyticsLineChart from '@/components/analytics/analytics-line-chart'
import { generateBorrowingData } from '@/lib/analytics-data'

export default function CustomChart() {
  const datasets = generateBorrowingData('30d')
  
  return (
    <AnalyticsLineChart
      datasets={datasets}
      title="Custom Borrowing Chart"
      subtitle="Last 30 days"
      height={400}
      timeframe="30d"
      showTrend={true}
    />
  )
}
```

### Custom Data Integration
```tsx
// Replace sample data with real API data
const loadRealData = async (type: 'borrowing' | 'returning', timeframe: string) => {
  const response = await fetch(`/api/analytics/${type}?timeframe=${timeframe}`)
  const data = await response.json()
  
  return data.datasets.map(dataset => ({
    label: dataset.label,
    data: dataset.data.map(point => ({
      date: point.date,
      count: point.count,
      label: point.label
    })),
    color: dataset.color,
    fillColor: dataset.fillColor
  }))
}
```

## Sample Data Structure

The components expect data in the following format:

```typescript
interface AnalyticsDataPoint {
  date: string        // ISO date string
  count: number       // Numeric value
  label?: string      // Optional tooltip label
}

interface AnalyticsDataset {
  label: string           // Dataset name
  data: AnalyticsDataPoint[]
  color: string          // Line color (hex)
  fillColor?: string     // Fill color (rgba)
  borderWidth?: number   // Line width
}
```

### Example Dataset
```typescript
const sampleData: AnalyticsDataset[] = [
  {
    label: 'Daily Borrowings',
    data: [
      { date: '2025-01-01T00:00:00Z', count: 15, label: '15 items borrowed' },
      { date: '2025-01-02T00:00:00Z', count: 12, label: '12 items borrowed' },
      // ... more data points
    ],
    color: '#3b82f6',
    fillColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 3
  }
]
```

## Customization

### Theming
The components use Tailwind CSS and support both light and dark modes automatically. Key color classes used:

- `text-primary`: Primary text color
- `bg-card`: Card background
- `border-border`: Border colors
- `text-muted-foreground`: Secondary text

### Chart Styling
Modify chart appearance in `analytics-line-chart.tsx`:

```typescript
const options: ChartOptions<'line'> = {
  // Customize colors, fonts, spacing, etc.
  plugins: {
    legend: {
      labels: {
        color: '#6b7280', // Change legend color
        font: { size: 12, weight: '600' }
      }
    }
  }
}
```

### Animation Customization
Animations are powered by Framer Motion. Modify in component files:

```typescript
const customVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}
```

## API Integration

### Real Data Integration
Replace the sample data generation with actual API calls:

1. **Create API endpoints** for analytics data
2. **Update data loading** in `analytics-dashboard.tsx`
3. **Handle error states** appropriately
4. **Add loading indicators** during API calls

### Example API Structure
```typescript
// GET /api/analytics/borrowing?timeframe=30d
{
  "datasets": [
    {
      "label": "Daily Borrowings",
      "data": [
        { "date": "2025-01-01", "count": 15 },
        // ... more data
      ],
      "color": "#3b82f6"
    }
  ],
  "summary": {
    "total": 450,
    "average": 15,
    "peak": 28,
    "growth": 12.5
  }
}
```

## Performance Considerations

### Optimization Tips
1. **Lazy Loading**: Use dynamic imports for large datasets
2. **Data Pagination**: Implement pagination for large time ranges
3. **Memoization**: Use React.memo for expensive calculations
4. **Chart Updates**: Avoid recreating chart instances unnecessarily

### Memory Management
```typescript
// Cleanup chart instances
useEffect(() => {
  return () => {
    if (chartRef.current) {
      chartRef.current.destroy()
    }
  }
}, [])
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for menus
- **Screen Reader Support**: Proper ARIA labels and roles
- **Color Contrast**: WCAG AA compliant color schemes
- **Focus Management**: Clear focus indicators
- **Alternative Text**: Descriptive labels for charts

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **Chart not rendering**
   - Ensure Chart.js is properly imported
   - Check data format matches expected structure
   - Verify container has proper height

2. **Animations not working**
   - Confirm Framer Motion is installed
   - Check for CSS conflicts
   - Verify animation variants are properly defined

3. **Export not working**
   - Check browser download permissions
   - Verify data is available before export
   - Ensure proper MIME types for file downloads

### Debug Mode
Enable debug logging:
```typescript
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log('Analytics data:', datasets)
  console.log('Summary stats:', summaryStats)
}
```

## Contributing

When contributing to these components:

1. **Follow TypeScript conventions**
2. **Maintain responsive design patterns**
3. **Include proper error handling**
4. **Add comprehensive JSDoc comments**
5. **Test across different screen sizes**
6. **Ensure accessibility compliance**

## License

This component library follows the same license as the parent project.