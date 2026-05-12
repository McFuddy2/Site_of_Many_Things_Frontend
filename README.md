The Site of Many Things — Frontend
The open-source frontend for thesiteofmanythings.com — a free, magical suite of tools for D&D 5e Dungeon Masters and players.
Built with React. Contributions welcome.

Live Tools
Initiative Tracker
The only initiative tracker built for both players and DMs simultaneously.
Tracks HP, AC, conditions, effect durations, round count, and turn order.
Route: /initiative
Spell Searcher
The most complete 5e spell search tool publicly available.
Supports multi-class exclusion filtering no other free tool offers.
Route: /spells

Tech Stack

React + JavaScript
TailwindCSS
Radix UI
Framer Motion
Vite
Deployed on Vercel


Getting Started
Clone the repo and install dependencies:
git clone https://github.com/McFuddy2/Site_of_Many_Things_Frontend.git
cd Site_of_Many_Things_Frontend
npm install
Create a .env.local file in the root with this content:
VITE_API_BASE_URL=https://siteofmanythings-production.up.railway.app
Then start the dev server:
npm run dev

Contributing
We welcome contributions. Please read CONTRIBUTING.md before opening a pull request.
A few things to know:

The backend API is private and not open for contributions
All frontend PRs should target the main branch
Only the repo owner can merge to main and trigger a production deploy


License
MIT License with Commons Clause. You are free to use, modify, and contribute to this code. You may not host it commercially or sell it as a product or service. See LICENSE for full terms.

Support the Project
If you find these tools useful, consider supporting on Ko-fi. Every contribution helps keep the site free and ad-light.