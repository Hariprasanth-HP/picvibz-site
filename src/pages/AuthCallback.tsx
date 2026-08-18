import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          navigate('/', { replace: true });
          return;
        }
      }
      setTimeout(() => {
        if (!cancelled) navigate('/login', { replace: true });
      }, 1500);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] text-gray-900 dark:text-white transition-colors duration-300">
      <div className="w-12 h-12 border-4 border-gray-200 dark:border-white/10 border-t-[#a855f7] rounded-full animate-spin mb-4" />
      <p className="text-gray-500 dark:text-gray-400">Completing sign in...</p>
    </div>
  );
}