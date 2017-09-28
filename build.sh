echo "Commiting new changes.."
git add . 
git commit -m "Building and pushing to heroku"
echo "Pushing to origin.."
git push origin
echo "Pushing to heroku.."
git push heroku
echo "Done!"