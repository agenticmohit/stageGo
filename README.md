# 🌌 StageGo | The Music Discovery Portal

StageGo is a premium, single-page music discovery web app engineered for synthwave, electronic, indie rock, and jazz cultures. Built with a focus on immersive aesthetics—featuring heavy glassmorphism, glowing custom neon borders, and micro-interactions—StageGo marries a lightweight pythonic REST API with a pure, high-performance vanilla frontend.

---

## ⚡ The Tech Stack

I chose a highly optimized, raw stack to keep execution fast and animation states completely fluid:

* **Frontend**: Semantic HTML5 & Vanilla CSS3 custom properties (design tokens). Strictly **no Tailwind** to keep paint times near-instantaneous and retain complete control over physics-based easing.
* **Interactivity**: Pure Vanilla JS. Lightweight DOM binding, raw event handlers, and active state persistence.
* **Backend**: Flask (Python) serving a secure JSON REST API.
* **Database**: Relational SQLite3 with automated migrations and dynamic startup seeders.
* **Deployment**: Railway-ready with dynamic port configurations and production-grade process control.

---

## 🛠️ The Vibe Coding & Engineering Narrative (For Recruiters)

StageGo is a case study in **vibe coding**: starting with a visual design aesthetic and rapidly translating it into concrete, production-ready system architecture. By focusing on design fidelity first, I worked backwards to engineer the core backend constraints.

Here are a few technical challenges I solved during the build:

### 1. Overriding standard browser dialogues with Custom Micro-Modals
Native alert boxes and sliding corner toasts felt too corporate and disrupted the cyber-synth visual flow. I overrode the global `window.alert` prototype to route all system diagnostics through a custom-built, center-aligned **glowing glassmorphic modal popup** with intense backdrop blur (`blur(8px)`). For inputs, I engineered dynamic inline `.modal-alert-banner` elements that slide into view inside form modals to handle validation locally without interrupting the user.

### 2. Disarming nested event bubbling prompts
When building the custom profile cover image uploader, programmatic `.click()` listeners triggered on hidden file inputs bubbled up to parent containers, resulting in double OS file explorer prompts on Chrome/Edge. I implemented structured event propagation barricades (`e.stopPropagation()`) at the file input level, cleanly resolving the double-prompt edge case.

### 3. Strict CRUD Ownership Authorization
To keep default headline events safe, I designed the database seeder to store core events with `user_id = NULL`. When logged-in creators edit or delete their events, the API validates the relational join. For all other listings, the frontend dynamically hides edit inputs and renders only a sleek "Interested" bookmark action, which auto-closes the overlay and refreshes the user's dashboard.

---

## 🚀 Quick Start

### 1. Spin up locally
Ensure you have Python 3 installed. Clone the repository and run:

```bash
# Set up virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch Flask development server
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000`.

### 2. Testing Credentials
To instantly test full creator flows and bookmarking actions, use the default seeded test profile:
* **Username**: `user`
* **Password**: `password`

---

## ☁️ Deployment

StageGo is fully pre-configured for deployment on cloud platforms like **Railway**:
* **Procfile**: Tells the builder to spin up a production-grade Gunicorn server automatically (`web: gunicorn app:app`).
* **Dynamic Binding**: Reads host routing `0.0.0.0` and maps environment port variables dynamically.
* **Automatic Migrations**: SQLite tables and seeder values auto-generate on cold boots if no active database is detected.
* **Exclusions**: The `.gitignore` is pre-configured to block local runtime databases, local documentation plans (`docs/`), cache blocks, and environment directories.
