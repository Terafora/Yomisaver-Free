const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production', // Change to production mode
    devtool: 'source-map', // Use source-map instead of eval
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
    node: {
        global: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-transform-runtime']
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
    optimization: {
        minimize: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
    },
    plugins: [
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /^npm$/
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: 'node_modules/kuromoji/dict/*.dat*',
                    to: 'dict/[name][ext]'
                },
                { from: 'manifest.json' },
                { from: 'background.js' },
                { from: 'popup.html' },
                { from: 'popup.js' },
                { from: 'styles.css' },
                { from: 'icon.png' }
            ]
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new webpack.LoaderOptionsPlugin({
            debug: false
        })
    ]
};