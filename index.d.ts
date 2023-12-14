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