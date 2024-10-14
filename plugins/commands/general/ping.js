export default function ({ message }) {
    let timeStart = Date.now();
    message.send('').catch(_ => {
        let timeEnd = Date.now();
        message.reply(`PING: ${timeEnd - timeStart}ms`);
    })
}
