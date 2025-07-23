/**
 * Test to verify environment variables are loaded correctly
 */

export function testEnvVariables() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  console.log('Environment test results:');
  console.log('NEXT_PUBLIC_API_URL:', apiUrl);
  console.log('Expected:', 'http://localhost:3001');
  console.log('Match:', apiUrl === 'http://localhost:3001');
  
  return {
    apiUrl,
    isCorrect: apiUrl === 'http://localhost:3001'
  };
}