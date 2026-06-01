import dgram from "dgram";

export type WakeRequest = {
  name: string;
  macAddress: string;
  broadcastAddress: string;
  port: number;
};

export type WakeResult = {
  name: string;
  macAddress: string;
  ok: boolean;
  message: string;
};

export async function sendWakeOnLan(request: WakeRequest): Promise<WakeResult> {
  try {
    const packet = createMagicPacket(request.macAddress);
    await sendPacket(packet, request.broadcastAddress, request.port);

    return {
      name: request.name,
      macAddress: request.macAddress,
      ok: true,
      message: `Wake signal sent to ${request.name}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: request.name,
      macAddress: request.macAddress,
      ok: false,
      message,
    };
  }
}

function createMagicPacket(macAddress: string): Buffer {
  const normalized = macAddress.replace(/[:.-]/g, "").trim();
  if (!/^[0-9a-fA-F]{12}$/.test(normalized)) {
    throw new Error(`Invalid MAC address: ${macAddress}`);
  }

  const macBytes = Buffer.from(normalized, "hex");
  const packet = Buffer.alloc(6 + 16 * macBytes.length, 0xff);

  for (let i = 0; i < 16; i++) {
    macBytes.copy(packet, 6 + i * macBytes.length);
  }

  return packet;
}

function sendPacket(
  packet: Buffer,
  broadcastAddress: string,
  port: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");

    const close = () => {
      try {
        socket.close();
      } catch {
        // The socket may already be closed after an error.
      }
    };

    socket.once("error", (err) => {
      close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, port, broadcastAddress, (err) => {
        close();
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}
