const TELEGRAM_TOKEN = "8956738972:AAFVwOrc_QXGQM9JJACbd8bCpE0NfpnimFU";

export async function onRequest(context) {
  const req = context.request;

  if (req.method === 'POST') {
    try {
      const update = await req.json();
      if (update.message) {
        const chatId = update.message.chat.id;
        const userText = update.message.text || "من فقط متن متوجه میشم!";
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `شما گفتید: ${userText}` })
        });
      }
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Telegram Bot is running on EdgeOne!", { status: 200 });
}
