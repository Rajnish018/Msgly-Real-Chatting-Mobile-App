const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  "expo-keep-awake": path.resolve(__dirname, "shims/expo-keep-awake.js"),
};

module.exports = config;
