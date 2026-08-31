module.exports = {
  presets: ["@react-native/babel-preset"],
  plugins: [
    // `@/…` in source, resolved the same way tsconfig resolves it.
    ["module-resolver", { root: ["./"], alias: { "@": "./src" }, extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] }],
    // Must stay last: react-native-worklets rewrites function bodies and
    // anything added after it would not be transformed.
    "react-native-worklets/plugin",
  ],
};
