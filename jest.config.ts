import { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }],
    },
    moduleNameMapper: {
        '^react$': `react-${process.env.REACT_VERSION}`,
        '^react-test-renderer$': `react-test-renderer-${process.env.REACT_VERSION}`,
    },
};

export default config;
