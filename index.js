// لیسنر اصلی برای دریافت پیام‌ها از سمت سرورهای تلگرام
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// توکن رباتت را که از BotFather گرفتی اینجا بگذار
const TELEGRAM_TOKEN = "8956738972:AAFVwOrc_QXGQM9JJACbd8bCpE0NfpnimFU"; 

async function handleRequest(req) {
  // ۱. ربات فقط باید درخواست‌های POST از سمت تلگرام را قبول کند
  if (req.method === 'POST') {
    try {
      // دریافت اطلاعات پیام فرستاده شده از تلگرام
      const update = await req.json();
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const userText = update.message.text || "من فقط متن متوجه میشم! 🤖";

        // آماده‌سازی پاسخ برای ارسال به تلگرام
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
        // فرستادن پیام به کاربر
        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `شما گفتید: ${userText}`
          })
        });
      }
    } catch (err) {
      // مدیریت خطاهای احتمالی
      return new Response("Error: " + err.message, { status: 500 });
    }
    
    // همیشه به تلگرام وضعیت 200 برگردان تا بفهمد پیام دریافت شده
    return new Response("OK", { status: 200 });
  }

  // اگر کسی آدرس را در مرورگر باز کرد
  return new Response("Telegram Bot is running on EdgeOne!", { status: 200 });
}
