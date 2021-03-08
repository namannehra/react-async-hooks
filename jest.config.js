module.exports = {
    globals: {
        'ts-jest': {
            tsconfig: 'tests/tsconfig.json',
        },
    },
    preset: 'ts-jest',
    setupFiles: ['./jest-setup.js'],
    testEnvironment: 'node',
};
