#!/bin/bash

# Frontend Update Script
# Updates React app to use local API instead of Supabase

set -e

echo "🚀 Updating frontend to use local API..."

# Create directories if they don't exist
mkdir -p src/lib

# Create new API client
cat > src/lib/api.ts << 'EOF'
const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // Auth methods
  async signUp(email: string, password: string, userData: any) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...userData }),
    });
  }

  async signIn(email: string, password: string) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Properties
  async getProperties() {
    return this.request('/properties');
  }

  async createProperty(propertyData: any) {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  // Tenants
  async getTenants() {
    return this.request('/tenants');
  }

  async createTenant(tenantData: any) {
    return this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  }

  // Leases
  async getLeases() {
    return this.request('/leases');
  }

  async createLease(leaseData: any) {
    return this.request('/leases', {
      method: 'POST',
      body: JSON.stringify(leaseData),
    });
  }

  // Rents
  async getRents() {
    return this.request('/rents');
  }

  async createRent(rentData: any) {
    return this.request('/rents', {
      method: 'POST',
      body: JSON.stringify(rentData),
    });
  }
}

export const apiClient = new ApiClient();
EOF

# Update auth hook
cat > src/hooks/useAuth.tsx << 'EOF'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
      // You might want to add a /me endpoint to verify the token
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await apiClient.signIn(email, password);
    apiClient.setToken(response.token);
    setUser(response.user);
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const response = await apiClient.signUp(email, password, userData);
    apiClient.setToken(response.token);
    setUser(response.user);
  };

  const signOut = () => {
    apiClient.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
EOF

# Create a backup of the current Supabase client
if [ -f "src/integrations/supabase/client.ts" ]; then
    cp src/integrations/supabase/client.ts src/integrations/supabase/client.ts.backup
    echo "✅ Backed up Supabase client"
fi

echo ""
echo "📋 Manual updates needed:"
echo ""
echo "1. Update your main App.tsx to use the new AuthProvider:"
echo "   import { AuthProvider } from '@/hooks/useAuth';"
echo "   <AuthProvider><App /></AuthProvider>"
echo ""
echo "2. Replace Supabase queries in your components with apiClient calls:"
echo "   - Replace: supabase.from('properties').select()"
echo "   - With: apiClient.getProperties()"
echo ""
echo "3. Update your environment variables:"
echo "   - Remove Supabase URLs"
echo "   - Add: REACT_APP_API_URL=http://localhost:3001/api"
echo ""
echo "4. Test each page/component to ensure API calls work"
echo ""
echo "✅ Frontend update template created!"
echo "📝 Complete the manual updates above to finish the migration."