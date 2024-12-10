const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'development', // Set the mode to 'development' or 'production'
    entry: './content.js',
    output: {
        filename: 'content.bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        fallback: {
            assert: require.resolve('assert/'),
            buffer: require.resolve('buffer/'),
            crypto: require.resolve('crypto-browserify'),
            os: require.resolve('os-browserify/browser'),
            path: require.resolve('path-browserify'),
            process: require.resolve('process/browser'),
            stream: require.resolve('stream-browserify'),
            util: require.resolve('util/'),
            zlib: require.resolve('browserify-zlib'),
            fs: false,
            child_process: false,
            dns: false,
            tls: false,
            net: false,
            url: require.resolve('url/'),
            vm: require.resolve('vm-browserify'),
            constants: require.resolve('constants-browserify'),
            console: require.resolve('console-browserify'),
            readline: false,
            https: require.resolve('https-browserify'),
            http: require.resolve('stream-http'),
            querystring: require.resolve('querystring-es3'),
            'aws-sdk': require.resolve('aws-sdk'),
            request: require.resolve('request'),
            bluebird: require.resolve('bluebird')
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.cs$/,
                use: 'raw-loader'
            },
            {
                test: /\.html$/,
                use: 'html-loader'
            }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /^npm$/
        })
    ]
};