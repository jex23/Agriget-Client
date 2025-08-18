import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="200px"
    >
      <VStack gap={4}>
        <Box
          w={8}
          h={8}
          border="4px solid"
          borderColor="gray.200"
          borderTopColor="blue.500"
          borderRadius="full"
          className="spinner"
        />
        <Text color="gray.600">{message}</Text>
      </VStack>
    </Box>
  );
};

export default LoadingSpinner;