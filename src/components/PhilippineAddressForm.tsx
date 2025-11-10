import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Input,
  Textarea,
} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '@chakra-ui/react/select';
import { createListCollection } from '@chakra-ui/react';

interface Region {
  code: string;
  name: string;
  regionName: string;
}

interface Province {
  code: string;
  name: string;
  regionCode: string;
}

interface City {
  code: string;
  name: string;
  provinceCode: string;
}

interface Barangay {
  code: string;
  name: string;
  cityCode: string;
}

interface PhilippineAddressFormProps {
  onAddressChange: (fullAddress: string) => void;
  initialAddress?: string;
  darkMode?: boolean;
}

const PhilippineAddressForm: React.FC<PhilippineAddressFormProps> = ({
  onAddressChange,
  initialAddress = '',
  darkMode = false
}) => {
  // Fixed location: Bulusan, Sorsogon (Region V - Bicol Region)
  const REGION_V_CODE = '050000000'; // Bicol Region
  const SORSOGON_CODE = '056200000'; // Sorsogon Province
  const BULUSAN_CODE = '056203000'; // Bulusan Municipality

  // Static list of Bulusan barangays
  const BULUSAN_BARANGAYS: Barangay[] = [
    { code: 'bagacay', name: 'Bagacay', cityCode: BULUSAN_CODE },
    { code: 'central', name: 'Central (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'cogon', name: 'Cogon', cityCode: BULUSAN_CODE },
    { code: 'dancalan', name: 'Dancalan', cityCode: BULUSAN_CODE },
    { code: 'dapdap', name: 'Dapdap (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'lalud', name: 'Lalud', cityCode: BULUSAN_CODE },
    { code: 'looban', name: 'Looban (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'mabuhay', name: 'Mabuhay (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'madlawon', name: 'Madlawon (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'poctol', name: 'Poctol (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'porog', name: 'Porog', cityCode: BULUSAN_CODE },
    { code: 'sabang', name: 'Sabang (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'salvacion', name: 'Salvacion', cityCode: BULUSAN_CODE },
    { code: 'san_antonio', name: 'San Antonio', cityCode: BULUSAN_CODE },
    { code: 'san_bernardo', name: 'San Bernardo', cityCode: BULUSAN_CODE },
    { code: 'san_francisco', name: 'San Francisco (Kapangihan)', cityCode: BULUSAN_CODE },
    { code: 'san_isidro', name: 'San Isidro', cityCode: BULUSAN_CODE },
    { code: 'san_jose', name: 'San Jose', cityCode: BULUSAN_CODE },
    { code: 'san_rafael', name: 'San Rafael (Likod)', cityCode: BULUSAN_CODE },
    { code: 'san_roque', name: 'San Roque', cityCode: BULUSAN_CODE },
    { code: 'san_vicente', name: 'San Vicente (Buhang)', cityCode: BULUSAN_CODE },
    { code: 'santa_barbara', name: 'Santa Barbara', cityCode: BULUSAN_CODE },
    { code: 'sapngan', name: 'Sapngan (Poblacion)', cityCode: BULUSAN_CODE },
    { code: 'tinampo', name: 'Tinampo', cityCode: BULUSAN_CODE }
  ];

  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays] = useState<Barangay[]>(BULUSAN_BARANGAYS);

  const [selectedRegion, setSelectedRegion] = useState(REGION_V_CODE);
  const [selectedProvince, setSelectedProvince] = useState(SORSOGON_CODE);
  const [selectedCity, setSelectedCity] = useState(BULUSAN_CODE);
  const [selectedBarangay, setSelectedBarangay] = useState('');

  const [unitNumber, setUnitNumber] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [zipCode, setZipCode] = useState('4704'); // ZIP code for Bulusan

  // Initialize with Bulusan, Sorsogon data on mount
  useEffect(() => {
    initializeBulusanAddress();
  }, []);

  // Parse initial address if provided
  useEffect(() => {
    if (initialAddress) {
      parseInitialAddress(initialAddress);
    }
  }, [initialAddress]);

  const parseInitialAddress = (address: string) => {
    // Simple parsing - you can enhance this
    const parts = address.split(',').map(s => s.trim());
    if (parts.length > 0) setUnitNumber(parts[0]);
    if (parts.length > 1) setStreet(parts[1]);
  };

  // Initialize with Bulusan, Sorsogon data
  const initializeBulusanAddress = () => {
    // Set fixed region data
    setRegions([{
      code: REGION_V_CODE,
      name: 'Region V',
      regionName: 'Bicol Region'
    }]);

    // Set fixed province data
    setProvinces([{
      code: SORSOGON_CODE,
      name: 'Sorsogon',
      regionCode: REGION_V_CODE
    }]);

    // Set fixed city data
    setCities([{
      code: BULUSAN_CODE,
      name: 'Bulusan',
      provinceCode: SORSOGON_CODE
    }]);
  };


  // Update full address whenever any field changes
  useEffect(() => {
    const buildAddress = () => {
      const parts = [];

      if (unitNumber) parts.push(unitNumber);
      if (street) parts.push(street);

      const barangay = barangays.find(b => b.code === selectedBarangay);
      if (barangay) parts.push(`Barangay ${barangay.name}`);

      // Always include Bulusan, Sorsogon
      parts.push('Bulusan');
      parts.push('Sorsogon');

      if (zipCode) parts.push(zipCode);
      if (landmark) parts.push(`(Landmark: ${landmark})`);

      return parts.join(', ');
    };

    const fullAddress = buildAddress();
    onAddressChange(fullAddress);
  }, [unitNumber, street, selectedBarangay, zipCode, landmark, barangays]);

  const inputStyle = darkMode ? {
    backgroundColor: '#ffffff !important',
    color: '#2d3748 !important',
    border: '1px solid #e2e8f0 !important',
    borderRadius: '0.375rem !important'
  } : {};

  const selectStyle = darkMode ? {
    backgroundColor: '#ffffff !important',
    color: '#2d3748 !important',
    border: '1px solid #e2e8f0 !important',
    borderRadius: '0.375rem !important'
  } : {};

  return (
    <VStack gap={3} align="stretch">
      {/* Fixed location indicator */}
      <Box bg={darkMode ? "#f7fafc" : "gray.50"} p={3} borderRadius="md" border="1px solid" borderColor="blue.200">
        <Text fontSize="sm" fontWeight="semibold" mb={1} style={darkMode ? { color: '#2b6cb0 !important' } : { color: '#2b6cb0' }}>
          Delivery Location: Bulusan, Sorsogon
        </Text>
        <Text fontSize="xs" style={darkMode ? { color: '#4a5568 !important' } : { color: '#4a5568' }}>
          All deliveries are for Bulusan municipality only. Please select your barangay below.
        </Text>
      </Box>

      {/* Unit Number */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Unit Number / House Number
        </Text>
        <Input
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          placeholder="e.g., Unit 123, House #45"
          style={inputStyle}
        />
      </Box>

      {/* Street */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Street Name
        </Text>
        <Input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="e.g., Rizal Street, Purok 1"
          style={inputStyle}
        />
      </Box>

      {/* Barangay Dropdown */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Barangay
        </Text>
        <SelectRoot
          collection={createListCollection({
            items: barangays.map(b => ({ label: b.name, value: b.code }))
          })}
          value={selectedBarangay ? [selectedBarangay] : []}
          onValueChange={(details) => setSelectedBarangay(details.value[0] || '')}
        >
          <SelectTrigger style={{
            backgroundColor: '#ffffff',
            color: '#2d3748',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: '12px'
          }}>
            <SelectValueText placeholder="Select your Barangay" />
          </SelectTrigger>
          <SelectContent style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem'
          }}>
            {barangays.map((barangay) => (
              <SelectItem
                key={barangay.code}
                item={barangay.code}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#2d3748'
                }}
                _hover={{
                  backgroundColor: '#f7fafc'
                }}
              >
                {barangay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </Box>

      {/* Landmark */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Landmark (Optional)
        </Text>
        <Input
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="e.g., Near Municipal Hall, Beside Sari-Sari Store"
          style={inputStyle}
        />
      </Box>

      {/* ZIP Code - Pre-filled and readonly */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          ZIP Code
        </Text>
        <Input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="4704"
          maxLength={4}
          style={inputStyle}
          readOnly
        />
      </Box>

      {/* Preview */}
      <Box bg={darkMode ? "#f7fafc" : "gray.50"} p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
        <Text fontSize="xs" fontWeight="semibold" mb={1} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Complete Address Preview:
        </Text>
        <Text fontSize="sm" style={darkMode ? { color: '#2d3748 !important' } : {}}>
          {[
            unitNumber,
            street,
            selectedBarangay && `Barangay ${barangays.find(b => b.code === selectedBarangay)?.name}`,
            'Bulusan',
            'Sorsogon',
            zipCode,
            landmark && `(Landmark: ${landmark})`
          ].filter(Boolean).join(', ') || 'Please fill in your address details above'}
        </Text>
      </Box>
    </VStack>
  );
};

export default PhilippineAddressForm;
