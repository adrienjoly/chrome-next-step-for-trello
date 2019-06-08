// configuration file for semantic-release
// see https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration-file

module.exports = {
  verifyConditions: [
    'semantic-release-chrome', // Note: please make sure that the required env vars are set in travis-ci, cf https://github.com/GabrielDuarteM/semantic-release-chrome/blob/master/Authentication.md
    '@semantic-release/github'
  ],
  prepare: [
    {
      path: 'semantic-release-chrome',
      asset: 'chrome-extension-dist.zip'
    }
  ],
  publish: [
    {
      path: 'semantic-release-chrome',
      asset: 'chrome-extension-dist.zip',
      extensionId: 'iajhmklhilkjgabejjemfbhmclgnmamf'
    },
    {
      path: '@semantic-release/github',
      assets: [
        {
          'path': 'chrome-extension-dist.zip'
        }
      ]
    }
  ]
}
