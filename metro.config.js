const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Tell Metro to transform SVGs into React components
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };

  // Remove svg from assetExts
  config.resolver.assetExts = config.resolver.assetExts.filter(
    (ext) => ext !== 'svg'
  );

  // Add svg to sourceExts
  config.resolver.sourceExts.push('svg');

  return config;
})();
