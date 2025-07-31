import '@testing-library/jest-dom'

// Mock fetch for tests
global.fetch = jest.fn()

// Mock window.alert
global.alert = jest.fn()


// Mock console methods to reduce test output noise  
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  
  // Suppress common test errors and jsdom limitations
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args[0]?.toString() || ''
    // Suppress known test-related errors
    if (message.includes('Not implemented: navigation') ||
        message.includes('Not implemented: window.alert') ||
        message.includes('Cannot read properties of undefined (reading \'status\')') ||
        message.includes('Error saving entry:')) {
      return
    }
    originalError(...args)
  })
  
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useParams() {
    return {}
  },
}))