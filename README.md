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
          discordWebhookId: ${{ secrets.discordWebhookId }}
          discordWebhookToken: ${{ secrets.discordWebhookToken }}
          mastodonInstance: 'https://mastodon.social'
          mastodonAccessToken: ${{ secrets.mastodonAccessToken }}

      # Required to persist cache
      - name: Commit and push
        uses: stefanzweifel/git-auto-commit-action@v4
```

## Obtaining integration secrets

All integrations require some keys to work.

Make sure to store variables as secrets — you do not want these to be made public. See [Creating secrets for a repository](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository).

### Discord

- Follow [Intro to Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
- Copy the webhook URL (`https://discord.com/api/webhooks/{webhookId}/{webhookToken}`)
- Get the webhook ID and webhook token from the URL and store these as secrets in GitHub

### Mastodon

- Go to your Mastodon instance (e.g. https://mastodon.social)
- Navigate to Preferences, then to Development
- Create an application by clicking the “New application” button
- Fill in the required fields
- For Scopes, select at least `write:statuses`
- After pressing Submit, click on the application you’ve just created
- Copy the Access token
- Store the Access token as a secret in GitHub
