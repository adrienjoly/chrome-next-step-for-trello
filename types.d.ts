interface Window {
  chrome: undefined | { runtime: {
    getURL: (string) => string
    getManifest: () => ({ version: string })
  } }
}
