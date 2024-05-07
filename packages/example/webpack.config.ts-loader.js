const path = require('path');

module.exports = [
    {
        mode: 'production',
        entry: './src/index.ts',
        output: {
            path: path.join(__dirname, 'build'),
            filename: 'main.js',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    loader: 'ts-loader',
                    options: {
                        compiler: require.resolve('ts-patch/compiler'),
                    }
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        target: 'web',
    }
];
