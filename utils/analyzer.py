import pandas as pd

def flag_issues(df):
    """
    Analyzes a pandas DataFrame for missing values, duplicate rows, 
    and skewed numeric features.
    
    Returns a dictionary containing the analysis report. Keys are omitted 
    if no issues are found in that category.
    """
    # Initialize the report dictionary
    report = {}
    
    # ---------------------------------------------------------
    #  Missing-values analysis
    # ---------------------------------------------------------
    missing_count = df.isnull().sum()
    missing_percent = (missing_count / len(df)) * 100
    
    # Build the dictionary only for columns that actually have missing values
    missing_dict = {}
    for col in df.columns:
        count = int(missing_count[col])
        if count > 0:
            missing_dict[col] = {
                "count": count,
                "percent": float(missing_percent[col])
            }
            
    # Only append if there are actually missing values
    if missing_dict:
        report["missing"] = missing_dict
    
    # ---------------------------------------------------------
    #  Duplicate row detection
    # ---------------------------------------------------------
    duplicate_count = int(df.duplicated().sum())
    
    # Only append if duplicates exist
    if duplicate_count > 0:
        report["duplicates"] = duplicate_count
    
    # ---------------------------------------------------------
    #  Skewed numeric columns flag
    # ---------------------------------------------------------
    skewed_columns = []
    
    # Select only numeric columns (integers and floats) to avoid errors
    numeric_cols = df.select_dtypes(include=['number']).columns
    
    for col in numeric_cols:
        skewness = df[col].skew()
        
        # Check if absolute skewness is greater than 1.0
        # (Using pd.isna check to ensure we don't crash on empty/constant columns)
        if not pd.isna(skewness) and abs(skewness) > 1.0:
            skewed_columns.append(col)
            
    # Only append if skewed columns are found
    if skewed_columns:
        report["skewed"] = skewed_columns
    
    # Return the shaped payload back to app.py
    return report