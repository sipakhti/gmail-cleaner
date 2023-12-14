const readline = require('readline');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// instantiate the readline readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    autoCommit: true // otherwise ill have to call .commit()
  });

// a simple promise that allows the execution to pause in an async function
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

let gmailClient = null;
let savedata = null
let isSaving = false;
let isReady = false;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'Credentials.json');
const SAVEFILE_PATH = path.join(process.cwd(), 'savefile.json')


/**
 * @returns {Promise<void>}
 */
async function loadSaveFile(){
    try {
        isReady = false;
        const content = await fs.readFile(SAVEFILE_PATH);
        savedata = JSON.parse(content);
        isReady = true;
        console.log(`LOADED: ${savedata.totalEmails} records`);
    }
    catch (e) {
        if (savedata === null) savedata = {
            totalEmails: 0
        }
        isReady = true;
    }
}



async function dumpSaveFile() {
    while (isSaving){ // make sure that there is no race condition during save
        pause(5000);
    }
    isSaving = true;
    console.log("SAVING...");
    await fs.writeFile(SAVEFILE_PATH, JSON.stringify(savedata));
    isSaving = false;
    console.log(`SAVED ${savedata.totalEmails} records`)
    
}
/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials); // creates an authorized client using saved Credentials
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *@returns {Promise<google.auth.OAuth2>}
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({ // starts the OAuth2 
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * 
 */
async function listLabels() {
  const res = await gmailClient.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Labels:');
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });
}




/**
 * 
 * @param {Array<Header>} headers 
 * @returns {EmailSender} name and email
 */
function extractSenderNameFromHeaders(headers){
  let FromHeader = null;
  
  // only breaks when it finds the desired header
  for (const header of headers) {
    if (header.name.toLowerCase() === 'from') FromHeader = header
    else continue
    break;
  }

  // demo header {name: 'placeholder-string', value: 'somename <some@email.com>'}
  let value = FromHeader.value; //extract the value of the header
  let splitValue = value.split(' '); // splits the value into array for easy manipulation
  let name = splitValue.length > 2 ? value.split('<')[0].trimEnd() : splitValue[0]; // if the name is more than one word
  let email = splitValue[splitValue.length - 1].substring(1,splitValue[splitValue.length - 1].length-1); // chooses the last index, and removes the first`<` and the last`>` char

  return {name,email};

}




/**
 * 
 * @returns {Promise<Array<Message>>}
 */
async function getMessageList() {
  let response = await gmailClient.users.messages.list({
    userId: 'me',
    pageToken: savedata.nextPageToken,
    maxResults: 100
  })  

  let messages = response.data.messages;
  savedata.nextPageToken = response.data.nextPageToken;

  return messages;

}


/**
 * 
 * @param {string} messageId 
 * @returns {Promise<MessageDetail>}
 */
async function getMessage(messageId) {
  const response = await gmailClient.users.messages.get({id: messageId, userId: 'me',format: 'METADATA', metadataHeaders: ['from']});

  let headers = response.data.payload.headers;

  return {headers}
}


async function listMessages() {
    
    let messages = await getMessageList();


    for (let index = 0; index < messages.length; index++) {
        try {
        const messageId = messages[index].id;
        const {headers} = await getMessage(messageId);
        
        const {name: senderName,email: senderEmail}  = extractSenderNameFromHeaders(headers);
        

        if (!(savedata[senderName])){
            savedata[senderName] = {}
        }
        if (savedata[senderName][senderEmail]){
            savedata[senderName][senderEmail].count++
            savedata[senderName][senderEmail].messages.push(messageId);
        }
        else {
            savedata[senderName][senderEmail] = {}
            savedata[senderName][senderEmail].count = 1
            savedata[senderName][senderEmail].messages = [messageId]
        }


        console.log(`PROCESSED: ${++savedata.totalEmails}`)
        readline.moveCursor(process.stdout, -20, -1);


        if (index === messages.length - 1){ // true on last index
            index = 0; // resets the loop
            messages = await  getMessageList();
            dumpSaveFile();

        }

    }
    catch (e) {
        console.log(e);
        break;
    }

        
        
    }
}


/**
 * 
 * @param {OAuth2Client} auth authorized OAuth client 
 */
function initGmail(auth) {
    gmailClient = google.gmail({version: 'v1', auth});
} 




authorize().then(async (auth)=>{
    initGmail(auth)
    await loadSaveFile()
    listMessages();
}).catch(console.error);
