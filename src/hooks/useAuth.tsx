import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId);
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1);
      
      console.log('Connection test result:', { testData, testError });
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        // If profile doesn't exist, this might be a new user
        if (error.code === 'PGRST116') {
          console.log('No profile found for user, this might be a new user');
          setUserRole('proprietaire'); // Default role
        }
        return;
      }
      
      console.log('Loaded profile:', profile);
      setUserProfile(profile);
      setUserRole(profile?.user_type || 'proprietaire');
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Clean up any corrupted auth state first
    const cleanupCorruptedState = () => {
      try {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith('supabase.auth.') || key.includes('sb-')
        );
        console.log('Found auth keys:', keys);
        
        // Check if we have corrupted tokens
        keys.forEach(key => {
          try {
            const value = localStorage.getItem(key);
            if (value && value.includes('error') || value === 'null') {
              console.log('Removing corrupted key:', key);
              localStorage.removeItem(key);
            }
          } catch (e) {
            console.log('Removing invalid key:', key);
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('Error cleaning up auth state:', error);
      }
    };
    
    cleanupCorruptedState();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load user profile after authentication
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        cleanupCorruptedState();
        setLoading(false);
        return;
      }
      
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Starting logout process...');
      
      // Clean up auth state first
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          console.log('Removing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
      
      console.log('Calling Supabase signOut...');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Supabase signOut error:', error);
      } else {
        console.log('Supabase signOut successful');
      }
      
      console.log('Redirecting to /auth...');
      window.location.href = "/auth";
    } catch (error) {
      console.error("Error signing out:", error);
      // Force cleanup even if signOut fails
      console.log('Force redirecting to /auth due to error...');
      window.location.href = "/auth";
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userProfile, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};