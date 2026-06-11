const uuid = "52a2859a-c704-4d35-aa6c-e44885e490c2";

function parseUUID(id) {
  const hex = id.replace(/-/g, "");
  const arr = new Uint8Array(16);
  for (let i = 0; i < 16; i++) arr[i] = parseInt(hex.slice(i*2, i*2+2), 16);
  return arr;
}

function matchUUID(a, b) {
  for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false;
  return true;
}

export async function onRequest(context) {
  const req = context.request;
  const upgrade = req.headers.get("upgrade");

  if (upgrade !== "websocket") {
    return new Response("OK", { status: 200 });
  }

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();

  const expectedUUID = parseUUID(uuid);
  let remote = null;

  server.addEventListener("message", async (e) => {
    let data = e.data;
    const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(await data.arrayBuffer());

    if (remote) {
      const w = remote.writable.getWriter();
      await w.write(buf);
      w.releaseLock();
      return;
    }

    let offset = 0;
    offset += 1;
    const clientUUID = buf.slice(offset, offset + 16); offset += 16;
    if (!matchUUID(clientUUID, expectedUUID)) { server.close(1008, "bad uuid"); return; }
    const addonsLen = buf[offset]; offset += 1 + addonsLen;
    const cmd = buf[offset]; offset += 1;
    if (cmd !== 1) { server.close(1008, "tcp only"); return; }
    const port = (buf[offset] << 8) | buf[offset+1]; offset += 2;
    const addrType = buf[offset]; offset += 1;

    let host = "";
    if (addrType === 1) { host = Array.from(buf.slice(offset, offset+4)).join("."); offset += 4; }
    else if (addrType === 2) { const len = buf[offset]; offset += 1; host = new TextDecoder().decode(buf.slice(offset, offset+len)); offset += len; }
    else if (addrType === 3) { host = buf.slice(offset, offset+16).join(":"); offset += 16; }

    const remaining = buf.slice(offset);

    try {
      remote = connect({ hostname: host, port });
      server.send(new Uint8Array([0, 0]));
      if (remaining.length > 0) {
        const w = remote.writable.getWriter();
        await w.write(remaining);
        w.releaseLock();
      }
      remote.readable.pipeTo(new WritableStream({
        write(chunk) { server.send(chunk); }
      })).catch(() => server.close());
    } catch (err) {
      server.close(1011, "connect failed: " + err.message);
    }
  });

  server.addEventListener("close", () => { try { remote?.writable.close(); } catch(_) {} });

  return new Response(null, { status: 101, webSocket: client });
}
