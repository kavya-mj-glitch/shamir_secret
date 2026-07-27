from pathlib import Path
from werkzeug.utils import secure_filename

# Project directories
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
OUTPUT_FOLDER = BASE_DIR / "output"

# Create folders if they don't already exist
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)


def save_uploaded_file(uploaded_file):
    """
    Saves the uploaded file into the uploads folder.

    Parameters:
        uploaded_file: Flask FileStorage object

    Returns:
        Path: Full path of the saved file.
    """

    # Make the filename safe
    filename = secure_filename(uploaded_file.filename)

    # Complete file path
    file_path = UPLOAD_FOLDER / filename

    # Save the uploaded file
    uploaded_file.save(file_path)

    return file_path