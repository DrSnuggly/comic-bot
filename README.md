# Comic bot

[![codecov](https://codecov.io/github/DrSnuggly/comic-bot/graph/badge.svg?token=NVXPEEGEMH)](https://codecov.io/github/DrSnuggly/comic-bot)
[![Checks](https://github.com/DrSnuggly/comic-bot/actions/workflows/checks.yml/badge.svg)](https://github.com/DrSnuggly/comic-bot/actions/workflows/checks.yml)

A Discord bot to post webcomic updates that runs on Cloudflare Workers
(including the free tier).

## Deploy

If you don't already have a Cloudflare account, you
can [sign up for one for free](https://dash.cloudflare.com/sign-up).

1. Log into Cloudflare.
2. Click the button below on this page:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/DrSnuggly/comic-bot)
3. Follow the remaining instructions provided by Cloudflare.

## Configure

1. Using your favourite text editor, build a JSON file with the following
   format:
   ```json5
   [
     {
       "name": "Oglaf!",
       "feedUrl": "https://www.oglaf.com/feeds/rss/",
       "webhooks": [
         // Test webhook from Discord's documentation.
         "https://discord.com/api/webhooks/223704706495545344/3d89bb7572e0fb30d8128367b3b1b44fecd1726de135cbe28a41f8b2f777c372ba2939e72279b94526ff5d1bd4358d65cf11"
       ],
       "imageSelector": "img#strip"
     },
     // Additional comic configurations, if desired.
     {
       // Another comic configuration.
     },
     {
       // Another comic configuration.
     }
   ]
   ```
    - `name`: the name of the comic.
    - `feedUrl`: the URL of the comic feed (e.g. an RSS feed).
    - `webhooks`: a list of Discord webhook URLs to send updates to.
    - `imageSelector`: the CSS selector for the comic image.
    - `altTextSelector` (optional): if alt text isn't present on the comic img
      element, you can provide the CSS selector for any alt text.
2. Remove all comments and unnecessary trailing commas:
    - Before:
      ```json5
      {
        "name": "Oglaf!",
        "feedUrl": "https://www.oglaf.com/feeds/rss/",
        "webhooks": [
          "https://discord.com/api/webhooks/223704706495545344/3d89bb7572e0fb30d8128367b3b1b44fecd1726de135cbe28a41f8b2f777c372ba2939e72279b94526ff5d1bd4358d65cf11",
          // 👆 the above line has a trailing comma that should be removed.
        ],
        "imageSelector": "img#strip",
        // 👆 the above line has a trailing comma that should be removed.
      }
      ```
    - After:
      ```json
      {
        "name": "Oglaf!",
        "feedUrl": "https://www.oglaf.com/feeds/rss/",
        "webhooks": [
          "https://discord.com/api/webhooks/223704706495545344/3d89bb7572e0fb30d8128367b3b1b44fecd1726de135cbe28a41f8b2f777c372ba2939e72279b94526ff5d1bd4358d65cf11"
        ],
        "imageSelector": "img#strip"
      }
      ```
3. In the Cloudflare KV storage attached to this worker, add a new entry with
   the following:
   - **Key**: `index`
   - **Value**: use the value from step 2.
