import { Injectable } from '@nestjs/common';
import { Product } from './product.entity';

interface FindAllOptions {
  limit: number;
  offset: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

@Injectable()
export class ProductService {
  // Mock product database
  private products: Product[] = [
    {
      id: '1',
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: 129.99,
      category: 'Electronics',
      sku: 'WH-001',
      rating: 4.5,
      inStock: true,
      tags: ['audio', 'wireless', 'headphones'],
      imageUrl: 'https://example.com/headphones.jpg',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'USB-C Cable',
      description: 'Durable USB-C to USB-C charging cable',
      price: 19.99,
      category: 'Accessories',
      sku: 'USB-C-001',
      rating: 4.8,
      inStock: true,
      tags: ['cable', 'usb-c', 'charging'],
      imageUrl: 'https://example.com/cable.jpg',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      name: 'Laptop Stand',
      description: 'Ergonomic aluminum laptop stand for desk setup',
      price: 49.99,
      category: 'Office',
      sku: 'LS-001',
      rating: 4.7,
      inStock: true,
      tags: ['stand', 'ergonomic', 'office'],
      imageUrl: 'https://example.com/stand.jpg',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
    {
      id: '4',
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard for gaming and productivity',
      price: 149.99,
      category: 'Electronics',
      sku: 'KB-001',
      rating: 4.6,
      inStock: false,
      tags: ['keyboard', 'mechanical', 'gaming'],
      imageUrl: 'https://example.com/keyboard.jpg',
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
    {
      id: '5',
      name: 'Wireless Mouse',
      description: 'Precision wireless mouse with adjustable DPI',
      price: 59.99,
      category: 'Electronics',
      sku: 'MS-001',
      rating: 4.4,
      inStock: true,
      tags: ['mouse', 'wireless', 'gaming'],
      imageUrl: 'https://example.com/mouse.jpg',
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
    },
  ];

  async findAll(options: FindAllOptions): Promise<Product[]> {
    let filtered = [...this.products];

    // Filter by category
    if (options.category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    // Filter by price range
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= options.minPrice!);
    }
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= options.maxPrice!);
    }

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    return filtered.slice(options.offset, options.offset + options.limit);
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) || null;
  }
}
