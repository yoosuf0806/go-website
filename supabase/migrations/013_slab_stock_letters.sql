cd ~/path/to/go-website
git checkout main
git pull origin main

# apply my branch on top of current main
git fetch ~/Downloads/slab-stock-letters.bundle HEAD:claude/slab-stock-letters
git checkout claude/slab-stock-letters

# rebase onto the now-updated main (my branch was built on the pre-merge
# live-catalog-reads branch, which should be identical content to main now,
# but rebase just to be safe and get a clean line of history)
git rebase main

git push origin claude/slab-stock-letters
