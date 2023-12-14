const fs = require('fs').promises
const path = require('path')

const SAVEFILE_PATH = path.join(process.cwd(), 'savefile.json')

/**
 * 
 * @param {string} path 
 * @returns {SaveFile}
 */
async function loadSaveFile(path){
    const content = await fs.readFile(path);
    return JSON.parse(content);
}
/**
 * 
 * @param {SaveFile} saveData 
 * @returns {Promise<void>}
 */
async function dumpSaveFile(saveData) {
    await fs.writeFile(SAVEFILE_PATH, JSON.stringify(saveData));
    console.log("FILE SAVED");
    return;
}

/**
 * 
 * @param {SaveFile} saveData 
 * @returns {SaveFile}
 */
async function sanitizer(saveData) {
    let duplicates = 0;
    let totalEmails = 0;
    for (const prop in saveData) {
        if (prop === 'totalEmails') continue;
        else if (prop === 'nextPageToken') continue;
        
        let senderName = prop;
        for (const senderEmail in saveData[senderName]) {
            let beforeSize = saveData[senderName][senderEmail].messages.length
            let tempSet = new Set(saveData[senderName][senderEmail].messages)
            saveData[senderName][senderEmail].messages = Array.from(tempSet);
            let afterSize = saveData[senderName][senderEmail].messages.length
            totalEmails += afterSize;
            console.log(`Email: ${senderEmail} | original size: ${beforeSize} | new size: ${afterSize}`);
            duplicates+= beforeSize - afterSize;
            saveData[senderName][senderEmail].count = afterSize;
        }
    }

    console.log(`TOTAL DUPLICATES FOUND: ${duplicates}`);
    saveData.totalEmails = totalEmails;

    return saveData;
}

loadSaveFile(SAVEFILE_PATH).then(saveData => sanitizer(saveData).then(saveData => dumpSaveFile(saveData))).catch(e => console.log(e))