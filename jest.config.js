module.exports = {
  collectCoverage: true,
  coverageReporters: ["lcov", "text","html", "cobertura"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  setupFiles: ['./jest.setup.js']
};