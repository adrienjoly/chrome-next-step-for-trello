# this script requires environment variables: APP_ID and ACCESS_TOKEN
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

echo "Publishing update ..."
curl \
  -H "Authorization: Bearer $ACCESS_TOKEN"  \
  -H "x-goog-api-version: 2" \
  -H "Content-Length: 0" \
  -X POST \
  -v \
  https://www.googleapis.com/chromewebstore/v1.1/items/$APP_ID/publish

echo "=> done. :-)"
