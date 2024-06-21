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
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        target: 'web',
    }
];
