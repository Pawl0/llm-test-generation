export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}

export interface FindAllOptions {
  page: number;
  limit: number;
}

/**
 * Stub service layer for the Users API.
 * In a real app, this would talk to a database.
 */
export class UserService {
  static async findAll(options: FindAllOptions): Promise<User[]> {
    // Placeholder — would query a database
    return [];
  }

  static async findById(id: string): Promise<User | null> {
    // Placeholder — would query by ID
    return null;
  }

  static async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Placeholder — would insert into database
    return {
      id: `usr_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  static async delete(id: string): Promise<void> {
    // Placeholder — would delete from database
  }
}
