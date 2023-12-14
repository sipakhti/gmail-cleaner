const fs = require('fs').promises
const path = require('path')

const SAVEFILE_PATH = path.join(process.cwd(), 'savefile.json')
let saveData;


async function loadSaveFile(){
    const content = await fs.readFile(SAVEFILE_PATH);
    saveData = JSON.parse(content);
}

async function dumpSaveFile() {
    await fs.writeFile(SAVEFILE_PATH, JSON.stringify(saveData));
    console.log("FILE SAVED");
    return;
}

async function sanitizer() {
    let duplicates = 0;
    let TotalEmails = 0;
    for (const prop in saveData) {
        if (prop === 'totalEmails') continue;
        else if (prop === 'nextPageToken') continue;
        
        let senderName = prop;
        for (const senderEmail in saveData[senderName]) {
            let beforeSize = saveData[senderName][senderEmail].messages.length
            let tempSet = new Set(saveData[senderName][senderEmail].messages)
            saveData[senderName][senderEmail].messages = Array.from(tempSet);
            let afterSize = saveData[senderName][senderEmail].messages.length
            TotalEmails += afterSize;
            console.log(`Email: ${senderEmail} | original size: ${beforeSize} | new size: ${afterSize}`);
            duplicates+= beforeSize - afterSize;
        }
    }

    console.log(`TOTAL DUPLICATES FOUND: ${duplicates}`);
    saveData.TotalEmails = TotalEmails;
}

loadSaveFile().then(() => sanitizer().then(() => dumpSaveFile())).catch(e => console.log(e))