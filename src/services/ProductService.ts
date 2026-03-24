export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: string;
}

export interface FindAllProductsOptions {
  page: number;
  limit: number;
  category?: string;
}

export class ProductService {
  static async findAll(options: FindAllProductsOptions): Promise<Product[]> {
    return [];
  }

  static async findById(id: string): Promise<Product | null> {
    return null;
  }

  static async create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    return {
      id: `prod_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  static async update(id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product | null> {
    return null;
  }

  static async delete(id: string): Promise<void> {}
}
