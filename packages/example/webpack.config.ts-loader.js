const path = require("path");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = [
    {
        mode: "production",
        entry: "./src/index.ts",
        output: {
            path: path.join(__dirname, "build"),
            filename: "main.js",
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    loader: "ts-loader",
                    options: {
                        compiler: 'ts-patch/compiler'
                    }
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        target: "web",
    }
];