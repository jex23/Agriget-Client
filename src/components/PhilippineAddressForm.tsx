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
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');

  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [loading, setLoading] = useState(false);

  // Base API URL for PSGC (Philippine Standard Geographic Code)
  const API_BASE = 'https://psgc.gitlab.io/api';

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions();
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
    if (parts.length > 0) setHouseNumber(parts[0]);
    if (parts.length > 1) setStreet(parts[1]);
  };

  const fetchRegions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/regions.json`);
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      // Fallback to major regions
      setRegions([
        { code: '130000000', name: 'NCR', regionName: 'National Capital Region' },
        { code: '010000000', name: 'Region I', regionName: 'Ilocos Region' },
        { code: '020000000', name: 'Region II', regionName: 'Cagayan Valley' },
        { code: '030000000', name: 'Region III', regionName: 'Central Luzon' },
        { code: '040000000', name: 'Region IV-A', regionName: 'CALABARZON' },
        { code: '170000000', name: 'Region IV-B', regionName: 'MIMAROPA' },
        { code: '050000000', name: 'Region V', regionName: 'Bicol Region' },
        { code: '060000000', name: 'Region VI', regionName: 'Western Visayas' },
        { code: '070000000', name: 'Region VII', regionName: 'Central Visayas' },
        { code: '080000000', name: 'Region VIII', regionName: 'Eastern Visayas' },
        { code: '090000000', name: 'Region IX', regionName: 'Zamboanga Peninsula' },
        { code: '100000000', name: 'Region X', regionName: 'Northern Mindanao' },
        { code: '110000000', name: 'Region XI', regionName: 'Davao Region' },
        { code: '120000000', name: 'Region XII', regionName: 'SOCCSKSARGEN' },
        { code: '160000000', name: 'Region XIII', regionName: 'Caraga' },
        { code: '140000000', name: 'CAR', regionName: 'Cordillera Administrative Region' },
        { code: '150000000', name: 'BARMM', regionName: 'Bangsamoro Autonomous Region in Muslim Mindanao' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProvinces = async (regionCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/regions/${regionCode}/provinces.json`);
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Failed to fetch provinces:', error);
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async (provinceCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/provinces/${provinceCode}/cities-municipalities.json`);
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBarangays = async (cityCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cities-municipalities/${cityCode}/barangays.json`);
      const data = await response.json();
      setBarangays(data);
    } catch (error) {
      console.error('Failed to fetch barangays:', error);
      setBarangays([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (regionCode) {
      fetchProvinces(regionCode);
    }
  };

  const handleProvinceChange = (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);

    if (provinceCode) {
      fetchCities(provinceCode);
    }
  };

  const handleCityChange = (cityCode: string) => {
    setSelectedCity(cityCode);
    setSelectedBarangay('');
    setBarangays([]);

    if (cityCode) {
      fetchBarangays(cityCode);
    }
  };

  // Update full address whenever any field changes
  useEffect(() => {
    const buildAddress = () => {
      const parts = [];

      if (houseNumber) parts.push(houseNumber);
      if (street) parts.push(street);

      const barangay = barangays.find(b => b.code === selectedBarangay);
      if (barangay) parts.push(`Barangay ${barangay.name}`);

      const city = cities.find(c => c.code === selectedCity);
      if (city) parts.push(city.name);

      const province = provinces.find(p => p.code === selectedProvince);
      if (province) parts.push(province.name);

      const region = regions.find(r => r.code === selectedRegion);
      if (region) parts.push(region.regionName);

      if (zipCode) parts.push(zipCode);
      if (additionalInfo) parts.push(`(${additionalInfo})`);

      return parts.join(', ');
    };

    const fullAddress = buildAddress();
    onAddressChange(fullAddress);
  }, [houseNumber, street, selectedBarangay, selectedCity, selectedProvince, selectedRegion, zipCode, additionalInfo, barangays, cities, provinces, regions]);

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
      {/* House/Unit Number and Street */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          House/Unit Number & Building Name
        </Text>
        <Input
          value={houseNumber}
          onChange={(e) => setHouseNumber(e.target.value)}
          placeholder="e.g., Unit 123, Building A"
          style={inputStyle}
        />
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Street Name
        </Text>
        <Input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="e.g., Rizal Street, Subdivision Name"
          style={inputStyle}
        />
      </Box>

      {/* Region Dropdown */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Region
        </Text>
        <SelectRoot
          collection={createListCollection({
            items: regions.map(r => ({ label: r.regionName, value: r.code }))
          })}
          value={selectedRegion ? [selectedRegion] : []}
          onValueChange={(details) => handleRegionChange(details.value[0] || '')}
          disabled={loading}
        >
          <SelectTrigger style={selectStyle}>
            <SelectValueText placeholder="Select Region" />
          </SelectTrigger>
          <SelectContent style={selectStyle}>
            {regions.map((region) => (
              <SelectItem key={region.code} item={region.code} style={selectStyle}>
                {region.regionName}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </Box>

      {/* Province Dropdown */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Province
        </Text>
        <SelectRoot
          collection={createListCollection({
            items: provinces.map(p => ({ label: p.name, value: p.code }))
          })}
          value={selectedProvince ? [selectedProvince] : []}
          onValueChange={(details) => handleProvinceChange(details.value[0] || '')}
          disabled={!selectedRegion || loading}
        >
          <SelectTrigger style={selectStyle}>
            <SelectValueText placeholder={selectedRegion ? "Select Province" : "Select Region first"} />
          </SelectTrigger>
          <SelectContent style={selectStyle}>
            {provinces.map((province) => (
              <SelectItem key={province.code} item={province.code} style={selectStyle}>
                {province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </Box>

      {/* City/Municipality Dropdown */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          City/Municipality
        </Text>
        <SelectRoot
          collection={createListCollection({
            items: cities.map(c => ({ label: c.name, value: c.code }))
          })}
          value={selectedCity ? [selectedCity] : []}
          onValueChange={(details) => handleCityChange(details.value[0] || '')}
          disabled={!selectedProvince || loading}
        >
          <SelectTrigger style={selectStyle}>
            <SelectValueText placeholder={selectedProvince ? "Select City/Municipality" : "Select Province first"} />
          </SelectTrigger>
          <SelectContent style={selectStyle}>
            {cities.map((city) => (
              <SelectItem key={city.code} item={city.code} style={selectStyle}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
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
          disabled={!selectedCity || loading}
        >
          <SelectTrigger style={selectStyle}>
            <SelectValueText placeholder={selectedCity ? "Select Barangay" : "Select City/Municipality first"} />
          </SelectTrigger>
          <SelectContent style={selectStyle}>
            {barangays.map((barangay) => (
              <SelectItem key={barangay.code} item={barangay.code} style={selectStyle}>
                {barangay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </Box>

      {/* ZIP Code */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          ZIP Code
        </Text>
        <Input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="e.g., 1000"
          maxLength={4}
          style={inputStyle}
        />
      </Box>

      {/* Additional Information */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Additional Information (Optional)
        </Text>
        <Textarea
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="e.g., Landmarks, special instructions"
          rows={2}
          style={inputStyle}
        />
      </Box>

      {/* Preview */}
      <Box bg={darkMode ? "#f7fafc" : "gray.50"} p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
        <Text fontSize="xs" fontWeight="semibold" mb={1} style={darkMode ? { color: '#4a5568 !important' } : {}}>
          Address Preview:
        </Text>
        <Text fontSize="sm" style={darkMode ? { color: '#2d3748 !important' } : {}}>
          {[houseNumber, street, selectedBarangay && `Barangay ${barangays.find(b => b.code === selectedBarangay)?.name}`,
            selectedCity && cities.find(c => c.code === selectedCity)?.name,
            selectedProvince && provinces.find(p => p.code === selectedProvince)?.name,
            selectedRegion && regions.find(r => r.code === selectedRegion)?.regionName,
            zipCode
          ].filter(Boolean).join(', ') || 'No address entered yet'}
        </Text>
      </Box>
    </VStack>
  );
};

export default PhilippineAddressForm;
