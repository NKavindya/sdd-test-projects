const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist/store'),
    filename: 'assets/app.[contenthash].js',
    publicPath: '/store/',
    clean: true,
  },
  resolve: { extensions: ['.js', '.jsx'] },
  module: {
    rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      {
        test: /\.(css|less)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { url: { filter: (url) => !url.startsWith('/store/') } },
          },
          'less-loader',
        ],
      },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: 'public/index.html' })],
  devServer: {
    host: '0.0.0.0',
    port: 3000,
    static: [
      { directory: path.join(__dirname, 'public'), publicPath: '/store/' },
      {
        directory: path.join(__dirname, 'public/conf'),
        publicPath: '/store/public/conf',
      },
    ],
    historyApiFallback: { index: '/store/index.html' },
    proxy: process.env.STORE_BACKEND
      ? [
          {
            context: ['/store-ui-request-handler', '/api'],
            target: process.env.STORE_BACKEND,
            secure: process.env.STORE_TLS_VERIFY !== 'false',
            changeOrigin: true,
          },
        ]
      : [],
  },
  performance: { hints: false },
};
