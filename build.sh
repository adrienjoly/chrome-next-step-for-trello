VERSION=$(jq .version manifest.json)
FILEPATH=./NextStep-v${VERSION//\"}.zip
rm $FILEPATH &>/dev/null
zip $FILEPATH * --no-dir-entries --exclude *.sh *.zip
echo "=> Built package for Chrome Web Store, to:" $FILEPATH
