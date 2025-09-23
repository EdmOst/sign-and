import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Attempt to sign out from Supabase first
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Clear local state regardless of error
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Clear any local storage
      localStorage.removeItem('pdf-signer-documents');
      
      // Don't treat session not found as an error
      if (error && !error.message?.includes("Session") && !error.message?.includes("session")) {
        console.error("Error signing out:", error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      // Still clear local state even if there's an unexpected error
      setUser(null);
      setSession(null);
      setLoading(false);
      return { error: null };
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
};