#!/bin/sh

# This script creates a ZIP archive of this extension
# and uploads it to the Chrome Web Store.

# it requires environment variables: APP_ID, CLIENT_ID, and CLIENT_SECRET
# (see https://developer.chrome.com/webstore/using_webstore_api)
source .env

VERSION=$(jq --raw-output .version manifest.json)
echo "Packing v$VERSION ..."

FILEPATH="./NextStep-v$VERSION.zip"
rm $FILEPATH &>/dev/null
zip $FILEPATH * --no-dir-entries --exclude *.sh *.zip
echo "=> Built package for Chrome Web Store, to: $FILEPATH"

echo ""
echo "Auth: getting access token from Chrome Web Store API ..."
open "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=$CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob"

echo "Enter the auth code provided by Google:"
read CODE

RESPONSE=$(curl --silent "https://accounts.google.com/o/oauth2/token" -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=$CODE&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob")
ACCESS_TOKEN=$(echo $RESPONSE | jq --raw-output .access_token)
echo "=> access token: $ACCESS_TOKEN"

echo ""
echo "Uploading archive to Chrome Web Store ..."
curl \
  -H "Authorization: Bearer $ACCESS_TOKEN"  \
  -H "x-goog-api-version: 2" \
  -X PUT \
  -T $FILEPATH \
  --silent \
  https://www.googleapis.com/upload/chromewebstore/v1.1/items/$APP_ID

echo ""
echo "=> done. :-)"

echo ""
echo "Now, update the description field (e.g. changelog), then publish changes on:"
echo "  https://chrome.google.com/webstore/developer/edit/$APP_ID"
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
