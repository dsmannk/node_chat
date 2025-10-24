import https from "http"; // ESM 방식

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const server = https.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
        JSON.stringify({
            message: "Hello from Dockerized Node.js (ESM)!",
            nodeVersion: process.version,
            time: new Date().toISOString(),
        })
    )
});

server.listen(PORT, HOST, () => {
    cosole.log(`Server running at http://${HOST}:${PORT}`);
})