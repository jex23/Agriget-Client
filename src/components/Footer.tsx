import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid
} from '@chakra-ui/react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <Box className="footer-container" py={10}>
      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 1, md: 4 }} gap={8}>
          <VStack align="start" gap={4}>
            <Heading className="footer-brand-title" size="md">
              🏗️ Joey's Aggregates Trading
            </Heading>
            <Text className="footer-brand-description" fontSize="sm">
              Your trusted partner for premium construction materials and aggregates. 
              Quality guaranteed, delivered on time.
            </Text>
          </VStack>

          <VStack align="start" gap={3}>
            <Heading className="footer-section-title" size="sm">Products</Heading>
            <Text className="footer-link" fontSize="sm">Hollow Blocks</Text>
            <Text className="footer-link" fontSize="sm">Sand & Gravel</Text>
            <Text className="footer-link" fontSize="sm">Construction Materials</Text>
            <Text className="footer-link" fontSize="sm">Bulk Orders</Text>
          </VStack>

          <VStack align="start" gap={3}>
            <Heading className="footer-section-title" size="sm">Services</Heading>
            <Text className="footer-link" fontSize="sm">Same Day Delivery</Text>
            <Text className="footer-link" fontSize="sm">Bulk Discounts</Text>
            <Text className="footer-link" fontSize="sm">Custom Orders</Text>
            <Text className="footer-link" fontSize="sm">Quality Assurance</Text>
          </VStack>

          <VStack align="start" gap={3}>
            <Heading className="footer-section-title" size="sm">Contact Info</Heading>
            <VStack align="start" gap={2}>
              <HStack>
                <Text fontSize="sm">📞</Text>
                <Text className="footer-contact-item" fontSize="sm">+63 912 345 6789</Text>
              </HStack>
              <HStack>
                <Text fontSize="sm">📧</Text>
                <Text className="footer-contact-item" fontSize="sm">info@joeysaggregates.com</Text>
              </HStack>
              <HStack>
                <Text fontSize="sm">📍</Text>
                <Text className="footer-contact-item" fontSize="sm">Metro Manila, Philippines</Text>
              </HStack>
              <HStack>
                <Text fontSize="sm">🕒</Text>
                <Text className="footer-contact-item" fontSize="sm">Mon-Sat: 7AM-6PM</Text>
              </HStack>
            </VStack>
          </VStack>
        </SimpleGrid>

        <Box className="footer-divider" />

        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Text className="footer-copyright" fontSize="sm">
            © 2024 Joey's Aggregates Trading. All rights reserved.
          </Text>
          <HStack gap={6}>
            <Text className="footer-legal-links" fontSize="sm">Privacy Policy</Text>
            <Text className="footer-legal-links" fontSize="sm">Terms of Service</Text>
            <Text className="footer-legal-links" fontSize="sm">Return Policy</Text>
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
};

export default Footer;