import { getLocalDateString, formatDateForDisplay, formatTimestampForDisplay } from './dateUtils'

describe('dateUtils', () => {
  describe('getLocalDateString', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const result = getLocalDateString()
      
      // Should match YYYY-MM-DD pattern
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      // Should be a valid date
      const date = new Date(result)
      expect(date.getFullYear()).toBeGreaterThan(2020)
      expect(date.getMonth()).toBeGreaterThanOrEqual(0)
      expect(date.getMonth()).toBeLessThan(12)
      expect(date.getDate()).toBeGreaterThan(0)
      expect(date.getDate()).toBeLessThanOrEqual(31)
    })

    it('should return consistent format across multiple calls', () => {
      const result1 = getLocalDateString()
      const result2 = getLocalDateString()
      
      // Should have same format
      expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('formatDateForDisplay', () => {
    it('should format date string correctly', () => {
      const result = formatDateForDisplay('2025-07-18')
      
      expect(result).toBe('Friday, July 18, 2025')
    })

    it('should handle different dates correctly', () => {
      expect(formatDateForDisplay('2025-01-01')).toBe('Wednesday, January 1, 2025')
      expect(formatDateForDisplay('2025-12-31')).toBe('Wednesday, December 31, 2025')
      expect(formatDateForDisplay('2025-02-14')).toBe('Friday, February 14, 2025')
    })

    it('should handle leap year correctly', () => {
      expect(formatDateForDisplay('2024-02-29')).toBe('Thursday, February 29, 2024')
    })

    it('should handle edge cases', () => {
      // First day of year
      expect(formatDateForDisplay('2025-01-01')).toBe('Wednesday, January 1, 2025')
      
      // Last day of year
      expect(formatDateForDisplay('2025-12-31')).toBe('Wednesday, December 31, 2025')
      
      // End of February in non-leap year
      expect(formatDateForDisplay('2025-02-28')).toBe('Friday, February 28, 2025')
    })
  })

  describe('formatTimestampForDisplay', () => {
    it('should format UTC timestamps to local time', () => {
      // Test with a known UTC timestamp
      const utcTimestamp = '2025-07-20T16:30:00.000Z'
      const result = formatTimestampForDisplay(utcTimestamp)
      
      // Should contain the local date and time (exact format depends on timezone)
      expect(result).toContain('2025')
      expect(result).toContain('Jul')
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/)
    })

    it('should handle invalid timestamps gracefully', () => {
      // Invalid timestamps will result in "Invalid Date" which toLocaleString handles
      const result = formatTimestampForDisplay('invalid-date')
      expect(result).toContain('Invalid Date')
    })

    it('should handle timestamps with milliseconds', () => {
      const utcTimestamp = '2025-07-20T16:30:45.123Z'
      const result = formatTimestampForDisplay(utcTimestamp)
      expect(result).toContain('2025')
    })
  })

})