// لیسنر اصلی برای دریافت درخواست‌های ورودی به لبه (Edge)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  // ۱. لیست هدرهایی که باید برای جلوگیری از تداخل و مسائل امنیتی حذف شوند
  const blockedKeys = [
    "host", "connection", "keep-alive", "proxy-authenticate", 
    "proxy-authorization", "te", "trailer", "transfer-encoding", 
    "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", 
    "x-forwarded-port"
  ];

  // ۲. استخراج آدرس مقصد از هدر x-host
  const targetHost = req.headers.get("x-host");

  // اگر هدر وجود نداشت، صرفاً یک پاسخ ساده برای تست سلامت (Health Check) برگردان
  if (!targetHost) {
    return new Response("EdgeOne Proxy Status: Active", { 
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }

  // ۳. بازسازی آدرس URL مقصد
  const urlObj = new URL(req.url);
  const isSecure = !targetHost.includes(":") || targetHost.includes(":443") || /^s\d+\./.test(targetHost);
  const protocol = targetHost.startsWith("http") ? "" : (isSecure ? "https://" : "http://");
  const destinationUrl = protocol + targetHost + urlObj.pathname + urlObj.search;

  // ۴. کپی و فیلتر کردن هدرهای درخواست ورودی
  const cleanHeaders = new Headers();
  let clientIp = null;

  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    
    // حذف هدرهای ممنوعه و خود x-host
    if (blockedKeys.includes(lowerKey) || lowerKey === "x-host") return;
    
    // استخراج آی‌پ‌ی واقعی کاربر
    if (lowerKey === "x-real-ip") { clientIp = value; return; }
    if (lowerKey === "x-forwarded-for") { if (!clientIp) clientIp = value; return; }
    
    cleanHeaders.set(lowerKey, value);
  });

  // تنظیم هدر آی‌پی برای سرور مقصد
  if (clientIp) {
    cleanHeaders.set("x-forwarded-for", clientIp);
  }

  try {
    // ۵. ارسال درخواست به سرور مقصد (پروکسی کردن)
    const response = await fetch(destinationUrl, {
      method: req.method,
      headers: cleanHeaders,
      redirect: "manual",
      // متدهای GET و HEAD نباید Body داشته باشند
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body
    });

    // ۶. آماده‌سازی هدرهای پاسخ برای برگشت به کاربر
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        responseHeaders.set(key, value);
      }
    });

    // ۷. تحویل پاسخ نهایی به مرورگر/کلاینت کاربر
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    // مدیریت خطاهای احتمالی در صورت عدم دسترسی به سرور مقصد
    return new Response("Proxy Error (EdgeOne): " + error.message, { 
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}