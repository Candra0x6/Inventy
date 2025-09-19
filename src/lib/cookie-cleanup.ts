// Utility function to clean up duplicate NextAuth cookies
export const cleanupNextAuthCookies = () => {
  if (typeof window === 'undefined') return;
  
  const cookiesToClean = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.csrf-token'
  ];
  
  cookiesToClean.forEach(cookieName => {
    // Clear cookie for current domain
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    
    // Clear cookie for localhost domain
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
    
    // Clear cookie for .localhost domain
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;`;
    
    // Clear cookie for 127.0.0.1
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=127.0.0.1;`;
  });
  
  console.log('NextAuth cookies cleaned up');
};

// Function to count current NextAuth cookies
export const countNextAuthCookies = () => {
  if (typeof window === 'undefined') return 0;
  
  const cookies = document.cookie.split(';');
  const nextAuthCookies = cookies.filter(cookie => 
    cookie.trim().startsWith('next-auth.session-token')
  );
  
  return nextAuthCookies.length;
};

// Function to monitor and auto-cleanup duplicate cookies
export const monitorAndCleanupCookies = () => {
  if (typeof window === 'undefined') return;
  
  const cookieCount = countNextAuthCookies();
  
  if (cookieCount > 1) {
    console.warn(`Found ${cookieCount} duplicate NextAuth session cookies. Cleaning up...`);
    cleanupNextAuthCookies();
    
    // Reload the page after cleanup to ensure fresh state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
};