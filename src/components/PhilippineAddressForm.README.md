# Philippine Address Form Component

A comprehensive address form component for Philippine locations with cascading dropdowns for Region, Province, City/Municipality, and Barangay selection.

## Features

- ✅ **Complete Philippine Location Data**: Uses the official PSGC (Philippine Standard Geographic Code) API
- ✅ **Cascading Dropdowns**: Automatically loads related locations based on selection
- ✅ **Manual Input Fields**: House/Unit number, Street, and ZIP code
- ✅ **Live Preview**: Shows formatted address as you fill the form
- ✅ **Fallback Data**: Works offline with major regions if API is unavailable
- ✅ **Dark Mode Support**: Configurable styling for light/dark themes

## Data Source

This component uses the **PSGC API** (Philippine Standard Geographic Code):
- **API Base URL**: `https://psgc.gitlab.io/api`
- **Official Documentation**: https://psgc.gitlab.io
- **Data Coverage**: All regions, provinces, cities/municipalities, and barangays in the Philippines
- **Update Frequency**: Updated regularly with official PSGC data

## Usage

```tsx
import PhilippineAddressForm from '../components/PhilippineAddressForm';

// In your component
<PhilippineAddressForm
  onAddressChange={(fullAddress) => {
    console.log('Complete address:', fullAddress);
    // Use the address
  }}
  initialAddress="123 Rizal St, Manila" // Optional
  darkMode={false} // Optional, default: false
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onAddressChange` | `(address: string) => void` | Yes | - | Callback function that receives the complete formatted address |
| `initialAddress` | `string` | No | `''` | Initial address to parse and populate fields |
| `darkMode` | `boolean` | No | `false` | Enable dark mode styling |

## Address Format

The component automatically formats the address in this order:

```
[House Number], [Street], Barangay [Barangay Name], [City/Municipality], [Province], [Region], [ZIP Code], ([Additional Info])
```

### Example Output:
```
Unit 123 Building A, Rizal Street, Barangay Poblacion, Makati City, Metro Manila, National Capital Region, 1200, (Near City Hall)
```

## Form Fields

### Manual Input Fields
1. **House/Unit Number & Building Name** - Free text input
2. **Street Name** - Free text input
3. **ZIP Code** - 4-digit numeric input
4. **Additional Information** - Optional notes (landmarks, special instructions)

### Dropdown Selections
1. **Region** - All 17 Philippine regions
2. **Province** - Loaded based on selected region
3. **City/Municipality** - Loaded based on selected province
4. **Barangay** - Loaded based on selected city/municipality

## Integration Examples

### Cart Checkout
```tsx
const [shippingAddress, setShippingAddress] = useState('');

<PhilippineAddressForm
  onAddressChange={(address) => setShippingAddress(address)}
  initialAddress={userProfile?.address}
  darkMode={true}
/>
```

### User Registration
```tsx
<PhilippineAddressForm
  onAddressChange={(address) => {
    setCredentials(prev => ({
      ...prev,
      address: address
    }));
  }}
  initialAddress={credentials.address}
  darkMode={false}
/>
```

### User Profile
```tsx
<PhilippineAddressForm
  onAddressChange={(address) => handleInputChange('address', address)}
  initialAddress={formData.address || ''}
  darkMode={false}
/>
```

## API Endpoints Used

```
GET https://psgc.gitlab.io/api/regions.json
GET https://psgc.gitlab.io/api/regions/{regionCode}/provinces.json
GET https://psgc.gitlab.io/api/provinces/{provinceCode}/cities-municipalities.json
GET https://psgc.gitlab.io/api/cities-municipalities/{cityCode}/barangays.json
```

## Error Handling

- If the API is unavailable, the component falls back to a hardcoded list of major regions
- All API calls include error handling with console warnings
- Failed requests won't break the form - users can still proceed with manual input

## Styling

The component uses Chakra UI components with customizable styling:
- Light mode: Default Chakra UI theme
- Dark mode: White backgrounds with dark text for modal compatibility

## Dependencies

- `@chakra-ui/react` - UI components
- React - Core framework

## Notes

- The component makes API calls only when needed (lazy loading)
- Dropdowns are disabled until the parent selection is made
- Address preview updates in real-time
- All data is fetched from the official PSGC API for accuracy
