# AutoFare Kerala

A web app that helps passengers pay the right fare for auto-rickshaws. Built for passengers, so drivers don't need to do anything.

## Features
- **Plan trip:** type a start and end place, see the route on the map, distance, time and fair fare.
- **Live ride meter:** GPS tracks distance and waiting time, shows the fare live and draws your path on the map.
- **Overcharge check:** enter what the driver asked and see if it is fair.
- **Pay by UPI:** opens your UPI app with the amount filled in.
- **Share trip:** send your location and fare to family.
- **Fare chart:** price for every km, day and night.
- **Tariff settings:** change the rates when the government revises them.
- **Demo mode:** simulates a ride along the planned route, so you can show it anywhere.
- **Scan the driver's QR code:** opens the camera, reads the UPI QR sticker and fills in the driver's UPI ID.
- **Welcome screen:** a yellow splash screen with an auto driving across, shown when the app opens.

## Tech
HTML, CSS, JavaScript, Leaflet and OpenStreetMap (map), OSRM (routing), Nominatim (place search), Geolocation API (GPS), UPI deep links, jsQR (QR scanning). No API keys needed.

## Run it on your computer
1. Put the four files (`index.html`, `style.css`, `app.js`, `README.md`) in one folder.
2. Open the folder in VS Code and install the **Live Server** extension. Right click `index.html` and choose **Open with Live Server**.
   Or run `python -m http.server 8000` in the folder and open `http://localhost:8000`.
3. GPS only works on `localhost` or `https`, so do not just double click the file.

## Put it on GitHub and get a live link
1. Create a new repository on github.com named `autofare-kerala` (public).
2. Click **Add file > Upload files**, drop all files, and click **Commit changes**.
3. Go to **Settings > Pages**. Under Branch choose `main` and `/ (root)`, then Save.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/autofare-kerala/`. Open it on your phone to test a real ride.
5. Add that link and a few screenshots to this README and to your resume.

## Important before you show it
- The tariff values are placeholders. Check the latest official fare for your district and update them in the Tariff tab and in `DEF` at the top of `app.js`.
- The free OSRM and Nominatim servers are for demos and light use. For heavy use, host your own or use a paid service.
- Fares are estimates, not an official meter.

## How GPS errors are handled (good interview point)
- Readings with accuracy worse than 40 m are ignored.
- Movements under 4 m are treated as GPS jitter, not travel.
- If speed is under about 1.2 m/s, the time counts as waiting.
- Distance is added using the Haversine formula.

## Interview story
"Many passengers in Kerala are overcharged because auto meters often don't work. I built a passenger-side web app that calculates the fair fare from distance, waiting time and night rate, tracks the ride using GPS and shows the route on a map. It also compares the driver's price with the tariff and supports UPI payment."

## Next upgrades
1. Make it installable on phones (PWA: add `manifest.json` and a service worker).
2. Rebuild in React and add a backend (Node.js + MongoDB or Firebase) for user login and ride history.
3. Add a "report overcharging" feature with a map of problem areas.
4. Wrap it as an Android app with Capacitor.
