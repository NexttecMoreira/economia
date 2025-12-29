module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": ["error", {"code": 120}],
  },
  overrides: [
    {
      files: ["index.js"],
      rules: {
        "indent": "off",
        "quotes": "off",
        "max-len": "off",
        "require-jsdoc": "off",
        "object-curly-spacing": "off",
        "comma-dangle": "off",
        "arrow-parens": "off",
        "operator-linebreak": "off",
        "padded-blocks": "off",
        "no-trailing-spaces": "off",
        "no-unused-vars": "off",
        "prefer-const": "off",
      },
    },
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
