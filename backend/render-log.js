process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const https = require("https");

const API_KEY = (process.env.RENDER_API_KEY || "").trim();
const OWNER_ID = (process.env.RENDER_OWNER_ID || "").trim();
const SERVICE_ID = (process.env.RENDER_SERVICE_ID || "").trim();

if (!API_KEY || !OWNER_ID || !SERVICE_ID) {
    console.error(
        "Usage: RENDER_API_KEY=xxx RENDER_OWNER_ID=tea-xxx RENDER_SERVICE_ID=srv-xxx node render-log.js"
    );
    process.exit(1);
}

let cursorStart = new Date(Date.now() - 5000).toISOString();
let pollInterval = 3000;
const DEFAULT_INTERVAL = 3000;
const BACKOFF_INTERVAL = 30000;

function stripAnsi(str) {
    return String(str || "")
        .replace(/\u001b\[[0-9;]*m/g, "")
        .trim();
}

function fetchLogs() {
    const endTime = new Date();

    const url = new URL("https://api.render.com/v1/logs");
    url.searchParams.set("ownerId", OWNER_ID);
    url.searchParams.append("resource", SERVICE_ID);
    url.searchParams.set("startTime", cursorStart);
    url.searchParams.set("endTime", endTime.toISOString());
    url.searchParams.set("direction", "forward");
    url.searchParams.set("limit", "100");

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            Accept: "application/json",
        },
        rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            if (res.statusCode === 429) {
                pollInterval = BACKOFF_INTERVAL;
                scheduleNext();
                return;
            }

            if (res.statusCode !== 200) {
                console.error(`API ERROR: ${res.statusCode} - ${data}`);
                scheduleNext();
                return;
            }

            pollInterval = DEFAULT_INTERVAL;

            try {
                const json = JSON.parse(data);

                if (json.logs && json.logs.length > 0) {
                    json.logs.forEach((log) => {
                        const msg = stripAnsi(log.message);
                        if (msg) console.log(msg);
                    });
                }

                // advance the cursor so next poll only looks for newer logs
                cursorStart = json.nextStartTime || endTime.toISOString();
            } catch (err) {
                console.error("Parse error:", err.message);
            }

            scheduleNext();
        });
    });

    req.on("error", (err) => {
        console.error("Request error:", err.message);
        scheduleNext();
    });

    req.end();
}

function scheduleNext() {
    setTimeout(fetchLogs, pollInterval);
}

console.log("Streaming live production logs...\n");
setTimeout(fetchLogs, 1000);