# Syndicate notes

This GitHub action lets you publish notes to various services.

## Usage

```yaml
on: push
name: 🚀 Deploy website on push
jobs:
  web-deploy:
    name: 🎉 Deploy
    runs-on: ubuntu-latest
    steps:
      - name: 🚚 Get latest code
        uses: actions/checkout@v4

      - name: 📂 Sync files
        uses: timseverien/syndicate-notes
        with:
					feedType: jsonfeed
					feedUrl: https://tsev.dev/notes/feed.json

					# Optional: format the message - allows you to add prefixes and suffixes
          # contentFormat: '{{content}} {{url}}'

					# Optional: change the cache directory used to track what’s published
          # cacheDirectory: .cache/syndicate-notes

					# Integration details
					# These are all optional — omit the integrations you don’t want to publish to
					discordWebhookId: '...'
					discordWebhookToken: '...'
					mastodonInstance: 'https://mastodon.social'
					mastodonAccessToken: '...'
```
