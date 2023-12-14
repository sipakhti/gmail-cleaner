before starting, you need to put the credential file from the google API management screen for OAuth in the root of the project.
for that, go to https://console.cloud.google.com/apis
1. Create a new Project or use an existing.
2. Enable Gmail API
3. configure the OAuth Screen
4. create OAuth Credential and download the file to your project root and rename it to `credentials.json` or simply modify the 
```JS
const CREDENTIALS_PATH = path.join(process.cwd(), 'your-filename.json');
```

on first run, you will be routed to google login screen, login with your account and let it rip
<b>
the script goes through the inbox in batches of 100. to change this behaviour, modify `getMessageList()` function
```JS
  let response = await gmailClient.users.messages.list({
    userId: 'me',
    pageToken: savedata.nextPageToken,
    maxResults: 100 // change this value. MAX ALLOWED 500
  })  
```
