import os
from dotenv import load_dotenv


# Подгружаем .env
load_dotenv()
DATABASE_URI = os.getenv('DATABASE_URI')
LONG_KEY = os.getenv('LONG_KEY')
