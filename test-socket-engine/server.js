const express = require("express")
const http =  require("http");
const { WebSocketServer } =  require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));
app.use(express.json());

const rooms = new Map();

function nowMs() {
  return Date.now();
}

wss.on("connection", (ws) => {
  ws.id = Math.random().toString(36).slice(2, 9);
  ws.roomId = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.log("Bad JSON", raw);
      return;
    }

    switch (msg.type) {
      case "join": {
        const { roomId } = msg;
        if (!rooms.has(roomId))
          rooms.set(roomId, { clients: new Set(), leader: null, session: null });
        const room = rooms.get(roomId);

        room.clients.add(ws);
        ws.roomId = roomId;

        if (!room.leader) room.leader = ws;

        console.log(`[JOIN] ${ws.id} joined ${roomId}`);
        ws.send(
          JSON.stringify({
            type: "joined",
            roomId,
            leaderId: room.leader.id,
            session: room.session,
          })
        );
        break;
      }

      case "leave": {
        const room = rooms.get(ws.roomId);
        if (room) {
          room.clients.delete(ws);
          if (room.leader === ws)
            room.leader = room.clients.values().next().value || null;
        }
        console.log(`[LEAVE] ${ws.id} left ${ws.roomId}`);
        ws.roomId = null;
        break;
      }

      case "time_ping": {
        ws.send(
          JSON.stringify({
            type: "time_pong",
            id: msg.id,
            t0: msg.t0,
            serverTime: nowMs(),
          })
        );
        break;
      }

      case "PLAY": {
        const { audioUrl, startDelayMs = 2000 } = msg;
        const room = rooms.get(ws.roomId);
        if (!room) return;

        if (room.leader !== ws) {
          ws.send(JSON.stringify({ type: "error", message: "not leader" }));
          return;
        }

        const startServerMs = nowMs() + startDelayMs;
        room.session = { audioUrl, startedAtServerMs: startServerMs };

        console.log(
          `[PLAY] Room ${ws.roomId} | startServerMs=${startServerMs} | delay=${startDelayMs}`
        );

        for (let c of room.clients) {
          c.send(
            JSON.stringify({
              type: "PLAY",
              audioUrl,
              startServerMs,
            })
          );
        }
        break;
      }

      default:
        console.log("[WARN] Unknown message", msg);
        break;
    }
  });

  ws.on("close", () => {
    if (ws.roomId) {
      const room = rooms.get(ws.roomId);
      if (room) {
        room.clients.delete(ws);
        if (room.leader === ws)
          room.leader = room.clients.values().next().value || null;
      }
      console.log(`[CLOSE] ${ws.id} disconnected`);
    }
  });
});


app.use('/', (req, res) => {
  res.send('Sync Beats Socket Engine is running.');
})

server.listen(3000, () =>
  console.log("🚀 Server running on http://localhost:3000")
);