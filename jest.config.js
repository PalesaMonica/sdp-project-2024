module.exports = {
  collectCoverage: true,
  coverageReporters: ["lcov", "text","html", "cobertura"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  // collectCoverageFrom: [
  //   "src/**/*.js",
  //   "!src/index.js"
  // ],
  // testMatch: [
  //   "**/__tests__/**/*.js?(x)",
  //   "**/?(*.)+(spec|test).js?(x)"
  // ],
  
  testEnvironment: 'jsdom', 
  setupFiles: ['./jest.setup.js']
};