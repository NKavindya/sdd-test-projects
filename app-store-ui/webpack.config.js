const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (_, argv) => ({
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash].js',
    publicPath: '/store/',
    clean: true,
  },
  devtool: argv.mode === 'production' ? false : 'source-map',
  module: {
    rules: [
      {
        test: /EntgraSearchFilter[\\/]EntgraCommonFilterForm[\\/]index\.js$/,
        use: path.resolve(__dirname, 'build/entgra-filter-keys.cjs'),
      },
      { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      { test: /\.(woff2?|ttf|png|svg)$/, type: 'asset/resource' },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      title: 'Entgra App Store',
    }),
    new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash].css' }),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.', globOptions: { ignore: ['**/index.html'] } },
      ],
    }),
  ],
  devServer: {
    host: 'localhost',
    port: 3000,
    hot: false,
    liveReload: true,
    historyApiFallback: { index: '/store/index.html' },
    devMiddleware: { publicPath: '/store/' },
    proxy: [
      {
        context: ['/store-ui-request-handler', '/api'],
        target: process.env.UEM_ORIGIN || 'https://localhost:9443',
        changeOrigin: true,
        secure: true,
      },
    ],
    server:
      process.env.STORE_TLS_CERT && process.env.STORE_TLS_KEY
        ? {
            type: 'https',
            options: {
              cert: fs.readFileSync(process.env.STORE_TLS_CERT),
              key: fs.readFileSync(process.env.STORE_TLS_KEY),
            },
          }
        : 'http',
  },
});
