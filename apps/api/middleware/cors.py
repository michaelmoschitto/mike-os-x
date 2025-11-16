from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from config.settings import settings


def setup_cors(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

