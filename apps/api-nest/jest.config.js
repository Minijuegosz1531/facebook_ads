/** Unit-test config. E2E lives in jest-e2e.config.js. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  moduleNameMapper: { '^@app/(.*)$': '<rootDir>/$1' },
};
