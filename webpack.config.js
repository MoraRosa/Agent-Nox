const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

/**
 * 🦊 Nox Webpack Configuration
 * Enterprise-grade build system for VS Code extension
 */
module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  const shouldAnalyze = process.env.ANALYZE === "true";

  return [
    // Extension Bundle (Node.js environment)
    {
      name: "extension",
      target: "node",
      mode: isProduction ? "production" : "development",
      entry: "./extension.js",
      output: {
        path: path.resolve(__dirname, "out"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
        clean: false, // Don't clean, we have multiple bundles
      },
      externals: {
        vscode: "commonjs vscode", // VS Code API is external
      },
      resolve: {
        extensions: [".ts", ".js"],
        alias: {
          "@": path.resolve(__dirname, "src"),
        },
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "ts-loader",
                options: {
                  configFile: "tsconfig.json",
                },
              },
            ],
          },
        ],
      },
      devtool: isProduction ? "source-map" : "eval-source-map",
      cache: {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
      },
      optimization: {
        minimize: isProduction,
        usedExports: true,
        sideEffects: false,
      },
      plugins: shouldAnalyze
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: "static",
              openAnalyzer: false,
              reportFilename: "extension-bundle-report.html",
              logLevel: "warn",
            }),
          ]
        : [],
    },

    // Webview Bundle (Browser environment)
    {
      name: "webview",
      target: "web",
      mode: isProduction ? "production" : "development",
      entry: "./src/webview/index.ts",
      output: {
        path: path.resolve(__dirname, "out/webview"),
        filename: "[name].js",
        chunkFilename: "[name].[contenthash:8].js",
        clean: false,
      },
      resolve: {
        extensions: [".ts", ".js", ".css"],
        alias: {
          "@": path.resolve(__dirname, "src"),
        },
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "ts-loader",
                options: {
                  configFile: "tsconfig.json",
                },
              },
            ],
          },
          {
            test: /\.css$/,
            use: ["style-loader", "css-loader"],
          },
        ],
      },
      devtool: isProduction ? "source-map" : "eval-source-map",
      cache: {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
      },
      optimization: {
        minimize: isProduction,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: "async", // CRITICAL: Only split async imports (dynamic imports)
          maxAsyncRequests: 100, // Allow many async chunks for languages
          maxInitialRequests: 30, // Allow many initial chunks
          minSize: 0, // Create chunks for ALL sizes (even small ones)
          minRemainingSize: 0, // Don't keep minimum size for remaining chunks
          cacheGroups: {
            // TIER 2: Lazy-loaded highlight.js languages
            // Each language gets its own chunk when dynamically imported
            // CRITICAL FIX: Using chunks: "async" to ONLY split dynamically imported languages
            // This prevents webpack from making all 192 languages initial dependencies
            highlightLanguages: {
              test: /[\\/]node_modules[\\/]highlight\.js[\\/]lib[\\/]languages[\\/]/,
              name(module) {
                // Extract language name from module resource path
                // Path format: .../node_modules/highlight.js/lib/languages/swift.js
                const match = module.resource.match(
                  /languages[\\/]([^\\/]+)\.js$/
                );
                if (match && match[1]) {
                  return `lang-${match[1]}`;
                }
                // Fallback: try to extract from context
                const contextMatch = module.context.match(
                  /languages[\\/]([^\\/]+)$/
                );
                return contextMatch
                  ? `lang-${contextMatch[1]}`
                  : "lang-unknown";
              },
              chunks: "async", // CRITICAL: Only split async imports to prevent blocking main bundle
              filename: "[name].[contenthash:8].js",
              priority: 20, // Higher priority than vendor
              reuseExistingChunk: true,
              enforce: true, // Force this rule
            },

            // All other node_modules (excluding highlight.js languages)
            vendor: {
              test: /[\\/]node_modules[\\/](?!highlight\.js[\\/]lib[\\/]languages[\\/])/,
              name: "vendors",
              chunks: "all",
              filename: "vendors.js",
              priority: 10,
            },
          },
        },
      },
      plugins: shouldAnalyze
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: "static",
              openAnalyzer: false,
              reportFilename: "webview-bundle-report.html",
              logLevel: "warn",
            }),
          ]
        : [],
    },

    // Dashboard Panel Bundle (Browser environment)
    {
      name: "dashboard",
      target: "web",
      mode: isProduction ? "production" : "development",
      entry: "./src/webview/dashboardPanel.js",
      output: {
        path: path.resolve(__dirname, "out/webview"),
        filename: "dashboardPanel.js",
        clean: false,
      },
      resolve: {
        extensions: [".js", ".css"],
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            use: ["style-loader", "css-loader"],
          },
        ],
      },
      devtool: isProduction ? "source-map" : "eval-source-map",
      cache: {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
      },
      optimization: {
        minimize: isProduction,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "dashboardVendors",
              chunks: "all",
              filename: "dashboardVendors.js",
            },
          },
        },
      },
      plugins: shouldAnalyze
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: "static",
              openAnalyzer: false,
              reportFilename: "dashboard-bundle-report.html",
              logLevel: "warn",
            }),
          ]
        : [],
    },
  ];
};
