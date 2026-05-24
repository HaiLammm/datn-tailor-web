/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next-auth$': '<rootDir>/src/__mocks__/next-auth.ts',
    '^next-auth/react$': '<rootDir>/src/__mocks__/next-auth-react.ts',
    '^next-auth/providers/(.*)$': '<rootDir>/src/__mocks__/next-auth-provider.ts',
    '^next/cache$': '<rootDir>/src/__mocks__/next-cache.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts', '<rootDir>/src/**/__tests__/**/*.test.tsx'],
  modulePathIgnorePatterns: [
    '/node_modules/.+/node_modules/',
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
};

module.exports = config;
