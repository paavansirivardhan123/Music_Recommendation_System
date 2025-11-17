from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import joblib
import numpy as np
import json
import os

def safe_inverse_transform(encoder, values):
        valid_indices = (values >= 0) & (values < len(encoder.classes_))
        output = []
        for v in values:
            if 0 <= v < len(encoder.classes_):
                output.append(encoder.classes_[v])
            else:
                output.append("Unknown")  # or np.nan
        return np.array(output)

class MusicRequest(BaseModel):
    artist: str
    popularity: int = 50
    genre: str
    subgenre: str
    energy: float = 0.5
    mode: float = 0.5
    speechiness: float = 0.5
    instrumentalness: float = 0.5

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/client", StaticFiles(directory="client"), name="client")

app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def read_root():
    # Serve the HTML file from client directory
    html_path = os.path.join("client", "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return {"Hello": "World"}

@app.get("/artist.json")
async def get_artist_json():
    # Serve artist.json file
    json_path = "artist.json"
    if os.path.exists(json_path):
        return FileResponse(json_path)
    return {"error": "artist.json not found"}


@app.post("/predict/")
async def predict(request: MusicRequest):
    try:
        model = joblib.load("backend/model/model.joblib")
        scaler = joblib.load("backend/model/scaler.joblib")
        artist_encoder = joblib.load("backend/model/artist_encoder.joblib")
        genre_encoder = joblib.load("backend/model/genre_encoder.joblib")
        subgenre_encoder = joblib.load("backend/model/subgenre_encoder.joblib")
        songNames = joblib.load("backend/model/songNames.joblib")
        cleanData = joblib.load("backend/model/songs_dataset.joblib")

        num_cols = [
            "track_artist",
            "track_popularity",
            "playlist_genre",
            "playlist_subgenre",
            "energy",
            "mode",
            "speechiness",
            "instrumentalness"
        ]
        
        import pandas as pd
        from sklearn.metrics.pairwise import cosine_similarity

        user_cleanData = pd.DataFrame([{
            "track_artist": request.artist.lower().strip(),
            "track_popularity": request.popularity,
            "playlist_genre": request.genre.lower().strip(),
            "playlist_subgenre": request.subgenre.lower().strip(),
            "energy": request.energy,
            "mode": request.mode,
            "speechiness": request.speechiness,
            "instrumentalness": request.instrumentalness
        }])

        while True:
            unseen = []
            if "track_artist" in user_cleanData:
                unseen += [a for a in user_cleanData["track_artist"] if a not in artist_encoder.classes_]
            if "playlist_genre" in user_cleanData:
                unseen += [g for g in user_cleanData["playlist_genre"] if g not in genre_encoder.classes_]
            if "playlist_subgenre" in user_cleanData:
                unseen += [s for s in user_cleanData["playlist_subgenre"] if s not in subgenre_encoder.classes_]

            if unseen:
                return {
                    "error": f"Invalid input: {', '.join(set(unseen))} not found in training data. Please use valid artist/genre/subgenre.",
                    "recommendations": []
                }
            else:
                break

        
        user_cleanData["track_artist"] = artist_encoder.transform(user_cleanData["track_artist"])
        user_cleanData["playlist_genre"] = genre_encoder.transform(user_cleanData["playlist_genre"])
        user_cleanData["playlist_subgenre"] = subgenre_encoder.transform(user_cleanData["playlist_subgenre"])

        # --- Scale numeric features ---
        X_scaled = scaler.transform(user_cleanData[num_cols])

        # --- Predict embedding ---
        predicted_emb = model.predict(X_scaled)

        # --- Compute cosine similarity ---
        all_embs = np.vstack(cleanData["lyrics_embedding"].values)
        sims = cosine_similarity(predicted_emb, all_embs)[0]

        top_idx = np.argsort(sims)[::-1][:5]

        # --- Handle track names ---
        if "track_name" in cleanData.columns:
            track_names = cleanData.iloc[top_idx]["track_name"].values
        else:
            track_names = [songNames[i] for i in top_idx if i < len(songNames)]

        # --- Reverse-transform to readable values ---
        track_artists = safe_inverse_transform(artist_encoder, cleanData.iloc[top_idx]["track_artist"].astype(int))
        playlist_genres = safe_inverse_transform(genre_encoder, cleanData.iloc[top_idx]["playlist_genre"].astype(int))
        playlist_subgenres = safe_inverse_transform(subgenre_encoder, cleanData.iloc[top_idx]["playlist_subgenre"].astype(int))

        # --- Final recommendations ---
        recommendations = pd.DataFrame({
            "track_name": track_names,
            "track_artist": track_artists,
            "playlist_genre": playlist_genres,
            "playlist_subgenre": playlist_subgenres,
            "track_popularity": cleanData.iloc[top_idx]["track_popularity"].values,
            "similarity": sims[top_idx]
        })
        
        return {
            "error": None,
            "recommendations": recommendations.reset_index(drop=True).to_dict(orient="records")
        }
    except Exception as e:
        return {
            "error": f"An error occurred: {str(e)}",
            "recommendations": []
        }