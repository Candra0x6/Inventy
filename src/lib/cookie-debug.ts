// Debug utility to analyze cookie sizes
export const analyzeCookies = () => {
  if (typeof window === 'undefined') return;
  
  const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
  let totalSize = 0;
  
  console.log('🍪 Cookie Analysis:');
  console.log('==================');
  
  const cookieData = cookies.map(cookie => {
    const [name] = cookie.split('=');
    const size = cookie.length;
    totalSize += size;
    
    return { name, size, content: cookie };
  });
  
  // Sort by size (largest first)
  cookieData.sort((a, b) => b.size - a.size);
  
  cookieData.forEach(({ name, size, content }) => {
    console.log(`${name}: ${size} bytes`);
    if (size > 1000) {
      console.log(`  └─ Large cookie: ${content.substring(0, 100)}...`);
    }
  });
  
  console.log('==================');
  console.log(`Total cookie size: ${totalSize} bytes`);
  console.log(`Header limit typically: 4096-8192 bytes`);
  
  if (totalSize > 4096) {
    console.warn(`⚠️  Cookie size (${totalSize}b) may exceed server limits!`);
  }
  
  // Count NextAuth chunks
  const sessionTokens = cookieData.filter(c => c.name.startsWith('next-auth.session-token'));
  if (sessionTokens.length > 1) {
    console.log(`📦 NextAuth chunked into ${sessionTokens.length} cookies (this is normal)`);
  }
  
  return {
    totalSize,
    cookieCount: cookies.length,
    sessionTokenChunks: sessionTokens.length,
    largestCookie: cookieData[0]
  };
};

// Function to check if cookies exceed safe limits
export const checkCookieLimits = () => {
  const analysis = analyzeCookies();
  
  if (!analysis) return false;
  
  const warnings = [];
  
  if (analysis.totalSize > 4096) {
    warnings.push(`Total cookie size (${analysis.totalSize}b) exceeds 4KB`);
  }
  
  if (analysis.totalSize > 8192) {
    warnings.push(`Total cookie size (${analysis.totalSize}b) exceeds 8KB - likely causing HTTP 431`);
  }
  
  if (analysis.sessionTokenChunks > 5) {
    warnings.push(`Too many session token chunks (${analysis.sessionTokenChunks}) - session data too large`);
  }
  
  if (warnings.length > 0) {
    console.error('🚨 Cookie Issues Found:');
    warnings.forEach(warning => console.error(`  - ${warning}`));
    return true;
  }
  
  return false;
};