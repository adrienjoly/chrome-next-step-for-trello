# This script creates a ZIP archive of this extension
# and uploads it to the Chrome Web Store.

# it requires environment variables: APP_ID and ACCESS_TOKEN
# (see https://developer.chrome.com/webstore/using_webstore_api)
source .env

VERSION=$(jq --raw-output .version manifest.json)
echo "Packing v$VERSION ..."

FILEPATH="./NextStep-v$VERSION.zip"
rm $FILEPATH &>/dev/null
zip $FILEPATH * --no-dir-entries --exclude *.sh *.zip
echo "=> Built package for Chrome Web Store, to: $FILEPATH"

echo "Uploading archive to Chrome Web Store ..."
curl \
  -H "Authorization: Bearer $ACCESS_TOKEN"  \
  -H "x-goog-api-version: 2" \
  -X PUT \
  -T $FILEPATH \
  -v \
  https://www.googleapis.com/upload/chromewebstore/v1.1/items/$APP_ID

# then you can manually update the description field (e.g. changelog)
# and publish changes when ready.
open https://chrome.google.com/webstore/developer/edit/$APP_ID

# TODO: find a way to automatically update changelog in extension's description field,
# (https://developer.chrome.com/webstore/api_index) then publish with this:

# echo "Publishing update ..."
# curl \
#   -H "Authorization: Bearer $ACCESS_TOKEN"  \
#   -H "x-goog-api-version: 2" \
#   -H "Content-Length: 0" \
#   -X POST \
#   -v \
#   https://www.googleapis.com/chromewebstore/v1.1/items/$APP_ID/publish

echo "=> done. :-)"
