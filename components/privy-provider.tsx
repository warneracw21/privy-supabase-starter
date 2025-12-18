'use client';

import {PrivyProvider} from '@privy-io/react-auth';
import {SupabaseProvider, useSupabase} from '@/components/supabase-provider';

export default function Providers({children}: {children: React.ReactNode}) {
  return (
    <SupabaseProvider>
      <InnerPrivyProvider>{children}</InnerPrivyProvider>
    </SupabaseProvider>
  );
}

export function InnerPrivyProvider({children}: {children: React.ReactNode}) {
  const {loading, supabase, session} = useSupabase();

  async function getCustomAuthToken() {
    if (!session) return undefined;

    const {data, error} = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return undefined;
    }

    return data.session?.access_token || undefined;
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        customAuth: {
          isLoading: loading,
          getCustomAccessToken: getCustomAuthToken
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users'
          }
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
