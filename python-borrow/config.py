import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://lab:labpass@127.0.0.1:3307/lab_borrow",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
