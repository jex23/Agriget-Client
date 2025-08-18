export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  image: string;
  inStock: boolean;
  features?: string[];
  specifications?: {
    [key: string]: string;
  };
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Standard Hollow Blocks 4"',
    description: 'High-quality concrete hollow blocks, 4 inches thick. Perfect for walls and partitions.',
    price: 12.50,
    unit: 'per piece',
    category: 'Hollow Blocks',
    image: 'https://images.unsplash.com/photo-1541976590-713941681591?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Durable concrete construction', 'Standard 4-inch thickness', 'Perfect for interior walls'],
    specifications: {
      'Thickness': '4 inches',
      'Material': 'High-grade concrete',
      'Compressive Strength': '3.5 MPa',
      'Water Absorption': 'Less than 20%'
    }
  },
  {
    id: '2',
    name: 'Standard Hollow Blocks 6"',
    description: 'Heavy-duty concrete hollow blocks, 6 inches thick. Ideal for load-bearing walls.',
    price: 18.75,
    unit: 'per piece',
    category: 'Hollow Blocks',
    image: 'https://images.unsplash.com/photo-1587985064151-eac4c4c8e6e8?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Heavy-duty construction', 'Load-bearing capacity', 'Weather resistant'],
    specifications: {
      'Thickness': '6 inches',
      'Material': 'Reinforced concrete',
      'Compressive Strength': '5.0 MPa',
      'Water Absorption': 'Less than 15%'
    }
  },
  {
    id: '3',
    name: 'Fine Sand',
    description: 'Premium quality fine sand, perfect for concrete mixing and plastering.',
    price: 850.00,
    unit: 'per cubic meter',
    category: 'Sand',
    image: 'https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Washed and screened', 'Low clay content', 'Consistent grain size'],
    specifications: {
      'Grain Size': '0.15 - 4.75mm',
      'Clay Content': 'Less than 3%',
      'Organic Content': 'Less than 1%',
      'Moisture Content': '5-8%'
    }
  },
  {
    id: '4',
    name: 'Coarse Sand',
    description: 'High-grade coarse sand, excellent for concrete foundations and heavy construction.',
    price: 900.00,
    unit: 'per cubic meter',
    category: 'Sand',
    image: 'https://images.unsplash.com/photo-1574482620531-927333ba3174?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Angular grains for better bonding', 'High strength applications', 'Minimal fines content'],
    specifications: {
      'Grain Size': '2.0 - 4.75mm',
      'Clay Content': 'Less than 2%',
      'Organic Content': 'Less than 0.5%',
      'Moisture Content': '4-7%'
    }
  },
  {
    id: '5',
    name: 'Gravel 3/4"',
    description: 'Premium 3/4 inch gravel aggregate for concrete mixing and road construction.',
    price: 1200.00,
    unit: 'per cubic meter',
    category: 'Gravel',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Crushed stone aggregate', 'Excellent drainage properties', 'High compressive strength'],
    specifications: {
      'Size': '19mm (3/4 inch)',
      'Shape': 'Angular crushed',
      'Specific Gravity': '2.6 - 2.7',
      'Absorption': 'Less than 2%'
    }
  },
  {
    id: '6',
    name: 'Gravel 1/2"',
    description: 'High-quality 1/2 inch gravel aggregate, perfect for concrete and drainage.',
    price: 1150.00,
    unit: 'per cubic meter',
    category: 'Gravel',
    image: 'https://images.unsplash.com/photo-1615672969096-5b9b22f0d3aa?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Uniform size distribution', 'Clean and washed', 'Ideal for fine concrete work'],
    specifications: {
      'Size': '12.5mm (1/2 inch)',
      'Shape': 'Angular crushed',
      'Specific Gravity': '2.6 - 2.7',
      'Absorption': 'Less than 1.5%'
    }
  },
  {
    id: '7',
    name: 'River Sand',
    description: 'Natural river sand, ideal for high-quality concrete and construction work.',
    price: 950.00,
    unit: 'per cubic meter',
    category: 'Sand',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Natural river origin', 'Smooth rounded grains', 'Excellent workability'],
    specifications: {
      'Grain Size': '0.5 - 2.0mm',
      'Clay Content': 'Less than 2%',
      'Organic Content': 'Nil',
      'Moisture Content': '3-6%'
    }
  },
  {
    id: '8',
    name: 'Decorative Hollow Blocks',
    description: 'Artistic hollow blocks with decorative patterns for aesthetic construction.',
    price: 25.00,
    unit: 'per piece',
    category: 'Hollow Blocks',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Decorative patterns', 'Architectural appeal', 'Multiple design options'],
    specifications: {
      'Thickness': '4 inches',
      'Material': 'Decorative concrete',
      'Patterns': 'Various geometric designs',
      'Finish': 'Smooth surface'
    }
  },
  {
    id: '9',
    name: 'Washed Sand',
    description: 'Thoroughly washed sand with minimal impurities, perfect for high-grade concrete.',
    price: 920.00,
    unit: 'per cubic meter',
    category: 'Sand',
    image: 'https://images.unsplash.com/photo-1606924842584-3b1c5b13dd0c?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Thoroughly washed', 'Minimal clay and silt', 'Consistent quality'],
    specifications: {
      'Grain Size': '0.15 - 2.0mm',
      'Clay Content': 'Less than 1%',
      'Organic Content': 'Nil',
      'Moisture Content': '2-5%'
    }
  },
  {
    id: '10',
    name: 'Pea Gravel',
    description: 'Small rounded gravel stones, excellent for drainage and decorative applications.',
    price: 980.00,
    unit: 'per cubic meter',
    category: 'Gravel',
    image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&h=400&fit=crop&crop=center',
    inStock: true,
    features: ['Small rounded stones', 'Excellent drainage', 'Decorative appeal'],
    specifications: {
      'Size': '6-10mm',
      'Shape': 'Rounded natural',
      'Color': 'Mixed earth tones',
      'Drainage Rate': 'High'
    }
  }
];

export const categories = ['All', 'Hollow Blocks', 'Sand', 'Gravel'];

export const getProductsByCategory = (category: string): Product[] => {
  if (category === 'All') {
    return products;
  }
  return products.filter(product => product.category === category);
};

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};