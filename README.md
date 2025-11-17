## Music Recommendation System

A compact FastAPI service plus a static HTML/CSS/JS client that recommends songs based on the listener’s preferred artist, genre, popularity, and four audio traits (energy, mode, speechiness, instrumentalness).

---

## Key Features

- FastAPI backend with scikit-learn encoders, scaler, and regression model stored under `backend/model/`.
- Lightweight single-page client (`client/index.html`) with artist autocomplete, genre/subgenre selectors, and animated recommendation cards.
- Ready-to-use assets (`artist.json`, `songName.json`, `genres_subgenre.json`) so the project can run without extra APIs.

---

## Tech Stack

- **Backend:** FastAPI, Pydantic, scikit-learn, NumPy, pandas, joblib.
- **Frontend:** Vanilla HTML, CSS, and JavaScript (no build tooling).
- **Data Science:** Training notebook `backend/Music_Recommendation.ipynb` plus the source CSV `backend/spotify_songs.csv`.

---

## Project Structure (high level)

- `server.py` – mounts the client, exposes `/predict/`, loads encoders, scaler, regression model, and song embeddings, then returns the top five cosine-similar tracks.
- `backend/model/*.joblib` – serialized artifacts (model, scaler, label encoders, dataset, fallback song names).
- `client/` – UI files (`index.html`, `styles.css`, `script.js`).
- `artist.json`, `genres_subgenre.json`, `songName.json`, `user_req.json` – supporting data and sample payloads.

---

## Quick Start

1. **Install dependencies**

   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install fastapi uvicorn pydantic joblib numpy pandas scikit-learn
   ```

2. **Run the app**

   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Use it**

   - Visit `http://localhost:8000` to access the UI served by FastAPI.
   - Submit the form; recommendations appear instantly. Errors show inline guidance.

---

## API Snapshot

`POST /predict/`

```json
{
  "artist": "The Weeknd",
  "popularity": 70,
  "genre": "pop",
  "subgenre": "dance pop",
  "energy": 0.8,
  "mode": 0.6,
  "speechiness": 0.3,
  "instrumentalness": 0.1
}
```

Response (success):

```json
{
  "error": null,
  "recommendations": [
    {
      "track_name": "Blinding Lights",
      "track_artist": "The Weeknd",
      "playlist_genre": "pop",
      "playlist_subgenre": "dance pop",
      "track_popularity": 95,
      "similarity": 0.9231
    }
  ]
}
```

Errors follow `{ "error": "...", "recommendations": [] }`.

---

## Model Assets & Retraining

1. Open `backend/Music_Recommendation.ipynb`.
2. Update `backend/spotify_songs.csv` or your chosen dataset.
3. Re-run the notebook to regenerate: `model.joblib`, `scaler.joblib`, the three label encoders, `songs_dataset.joblib`, and `songNames.joblib`.
4. Restart FastAPI so `server.py` loads the refreshed artifacts.

---

## Frontend Notes

- `client/script.js` loads `artist.json` for autocomplete and maps genres to subgenres using `genreSubgenres`.
- Sliders emit `0.00–1.00` values, matching the scaler expectations.
- Update the `API_URL` constant if you host the backend elsewhere.

---

## Troubleshooting

- **Invalid artist/genre/subgenre:** Ensure the value exists in the encoders’ `classes_`. Update `artist.json` and dropdown options after retraining.
- **Missing model files:** Confirm every `.joblib` file is present under `backend/model/`. The server will error if any file is absent.
- **CORS or hosting issues:** The app currently allows all origins; tighten `allow_origins` in `server.py` before production deployment.

---

## Roadmap Ideas

- Package with Docker.
- Add authentication or rate limits.
- Stream preview snippets via music APIs.
- Collect feedback to personalize future recommendations.
