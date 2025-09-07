import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const useAuthWithNavigation = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  const signOutWithNavigation = async () => {
    try {
      console.log('Starting logout process...');

      // Clean up auth state first (localStorage + sessionStorage)
      try {
        localStorage.removeItem('supabase.auth.token');
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            console.log('Removing localStorage key:', key);
            localStorage.removeItem(key);
          }
        });
        if (typeof sessionStorage !== 'undefined') {
          Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
              console.log('Removing sessionStorage key:', key);
              sessionStorage.removeItem(key);
            }
          });
        }
      } catch (e) {
        console.warn('Error while cleaning storage during logout', e);
      }

      console.log('Calling Supabase signOut...');
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('Supabase signOut error:', error);
      } else {
        console.log('Supabase signOut successful');
      }

      // Use React Router navigation instead of window.location
      console.log('Navigating to /auth...');
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
      // Force cleanup even if signOut fails
      console.log('Force navigating to /auth due to error...');
      navigate('/auth', { replace: true });
    }
  };

  return {
    ...auth,
    signOut: signOutWithNavigation
  };
};