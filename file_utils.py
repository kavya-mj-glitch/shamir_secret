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
    try:
        filename = secure_filename(uploaded_file.filename)
        file_path = UPLOAD_FOLDER / filename
        uploaded_file.save(file_path)
        return file_path

    except Exception as e:
        print(f"Error saving uploaded file: {e}")
        return None


def save_encrypted_file(encrypted_data, filename):
    """
    Saves encrypted binary data into the output folder.

    Parameters:
        encrypted_data (bytes): Encrypted file data.
        filename (str): Name of the encrypted file.

    Returns:
        Path: Full path of the saved encrypted file.
    """
    try:
        filename = secure_filename(filename)
        file_path = OUTPUT_FOLDER / filename

        with open(file_path, "wb") as file:
            file.write(encrypted_data)

        return file_path

    except Exception as e:
        print(f"Error saving encrypted file: {e}")
        return None


def save_share_files(shares):
    """
    Saves Shamir Secret Sharing key shares into text files.

    Parameters:
        shares (list): List of share strings.

    Returns:
        list: Paths to all saved share files.
    """
    share_paths = []

    try:
        for index, share in enumerate(shares, start=1):
            filename = f"share_{index}.txt"
            file_path = OUTPUT_FOLDER / filename

            with open(file_path, "w", encoding="utf-8") as file:
                file.write(str(share))

            share_paths.append(file_path)

        return share_paths

    except Exception as e:
        print(f"Error saving share files: {e}")
        return []


def delete_file(file_path):
    """
    Deletes a file if it exists.

    Parameters:
        file_path (Path or str): Path to the file.

    Returns:
        bool: True if deleted successfully, False otherwise.
    """
    try:
        file_path = Path(file_path)

        if file_path.is_file():
            file_path.unlink()
            return True

        return False

    except Exception as e:
        print(f"Error deleting file: {e}")
        return False


def cleanup_temp_files(file_paths):
    """
    Deletes multiple temporary files.

    Parameters:
        file_paths (list): List of file paths.
    """
    for file_path in file_paths:
        delete_file(file_path)