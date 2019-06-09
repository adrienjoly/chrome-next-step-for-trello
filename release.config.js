// configuration file for semantic-release
// see https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration-file

module.exports = {
  verifyConditions: [
    'semantic-release-chrome', // will check that Chrome Web Store env vars are set in travis-ci, cf https://github.com/GabrielDuarteM/semantic-release-chrome/blob/master/Authentication.md
    '@semantic-release/github' // will check that the GITHUB_TOKEN env var is also set
  ],
  prepare: [
    // 1. Update the version in the manifest and zip the extension
    {
      path: 'semantic-release-chrome',
      distFolder: 'dist',
      manifestPath: 'dist/manifest.json',
      asset: 'chrome-extension-dist.zip'
    },
    // 2. Update the version in package.json
    '@semantic-release/npm',
    // 3. Create a commit with updated versions
    {
      path: '@semantic-release/git',
      assets: [
        'dist/manifest.json',
        'package.json'
      ],
      message: [
        /* eslint-disable no-template-curly-in-string */
        'chore(release): ${nextRelease.version} [skip ci]',
        '${nextRelease.notes}'
        /* eslint-enable no-template-curly-in-string */
      ].join('\n\n')
    }
  ],
  publish: [
    // 1. Publish the extension to Chrome Web Store
    {
      path: 'semantic-release-chrome',
      asset: 'chrome-extension-dist.zip',
      extensionId: 'iajhmklhilkjgabejjemfbhmclgnmamf'
    },
    // 2. Create a git tag and release on GitHub
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
