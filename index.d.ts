type Message = {
    messageId:string,
    threadId:string
}

type Header = {
    name:string,
    value:string
}

type EmailSender = {
    name: string,
    email: string
}

type MessageDetail = {
    headers: Array<Header>
}



type SaveFile = {
    totalEmails: Number,
    nextPageToken: string,
    name: {
        email: {
            count: Number,
            messages: Array<String>
        }
    }
}