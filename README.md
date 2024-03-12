# Bot Command Center

Toolkit to easily build specialized GPT-powered bots for your private Mattermost chat platform.

Status: hackathon product, so use at your own risk. ;)

Available bots:

- chat-bot: you already know this one
- chat-summary-bot: summarizes convos/single posts without becoming part of the convo
- webpage-summary-bot: crawls all URLs and summarizes the content (again without becoming part of the convo)
- capture-bot: send post to LogSeq/PKM "Chat Inbox"-page
- describer: describes any picture that is posted
- transcriber: transcribe every mp3 that is posted
- logger: logs every message in the channel to the backend

The bots can be freely used together - this is where the magic happens (and where my hackathon demo failed lol).

Because this is totally overengineered for a hackathon, I proudly present the technical features:

- instantiate bots via JSON config
- Observer pattern to subscribe to new posts (PostManager) or channels (MembershipManager) in the bots
- at-most-once guarantee via persistent tracking (aka we ensure posts are not processed multiple times - AI calls are expensive after-all)
- using Mattermost APIs that are not part of the Client library (because that is totally what you wanted to spend time on in a hackathon...)

## Run

Start Mattermost docker and bot backend:

```bash
./up.sh
```

LogSeq has to be started separately. Make sure to enable and start the API Server (https://docs.logseq.com/#/page/local%20http%20server) with the token "test-token".

## Setup

### Backend

Usual NodeJS and docker/compose stuff.

To configure the bots, check out bots-example.json. You need to write a bots.json file in the main folder.
Some more info about the format can be found in config.ts or here:

```json
{
  "base": {
    "serverUrl": "http://server_url_here",
    "teamId": "your_team_id", //Mattermost team ID
    "baseSystemPrompt": [
      // List the guidelines here, used for any chat-bot/chat-summary-bot
    ]
  },
  "bots": [
    {
      "name": "unique_bot_name", //same name as in Mattermost
      "type": "BotTypeHere", //needs to fit one of our bot types, see config.ts
      "accessToken": "access_token_here",
      "userId": "", //needs to be emtpy - will be retrieved via the name
      "config": {
        // Additional bot-specific config
        // examples (only relevant for chat/chat-summary/website-summary):
        "model": "gpt-3.5-turbo",
        "botSystemPrompt": "Summarize everything"
      }
    }
    // Add more bots as needed
  ]
}
```

### Mattermost

Hack to make Mattermost start up properly locally:

```bash
 mkdir -p ./docker/volumes/app/mattermost/{data,logs,config,plugins}
 chmod -R 777 ./docker/volumes
```

Create a Mattermost team and login.

All bots need to be created via the http://localhost:8065/<Team-Name>/integrations/bots
Make sure to add the accessTokens and proper names to the bots.json

If you want to use a bot, you have to add it to the team and then to the channel you want to use it in.

### LogSeq

Make sure to start the LogSeq HTTP server at "http://127.0.0.1:12315" and set the token to "test-token".
This is currently hardcoded in LogSeq.ts.

## Usage

WARNING: the websocket setup is messed up, so changes currently dont show up in real-time - just switch channels to update the current state.

Local Mattermost URL: http://localhost:8065/

Most bots are self-explanatory, except:

- chat-summary-bot: white_check_mark-Emoji for convo summary and grinning-Emoji for single-post summary
- capture-bot: use Thumbs Up-Emoji to trigger
