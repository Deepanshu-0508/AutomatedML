import os
import pandas as pd

filepath ='diabetes.csv'
#filepath = 'README.md'

def load_file(filepath):
    # Extracting the file extension
    _ , extension = os.path.splitext(filepath.strip())

    extension = extension.lower()

    if (extension == '.csv'):
        df = pd.read_csv(filepath)
    elif extension  in ['.xlsx','.xls']:
        df = pd.read_excel(filepath)
    else:
        raise ValueError(f"Unsupported filr extension: {extension}")

    return df

