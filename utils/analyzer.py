import os,pandas as pd

def flag_issue(df):
    import pandas as pd

def flag_issues(df):
    """
    Analyze a DataFrame and return a dictionary of data quality issues.
    
    Returns:
        dict: Issues found, with keys 'missing', 'duplicates'
              Only includes keys that have actual issues.
    """
    issues = {}
    
    # MISSING VALUES
    missing_count = df.isnull().sum()
    missing_percent = (missing_count / len(df)) * 100
    
    missing_dict = {}
    for col in df.columns:
        count = missing_count[col]
        if count > 0:
            missing_dict[col] = {
                "count": int(count),  
                "percent": round(float(missing_percent[col]), 2)  
            }
    
    if missing_dict:  # Only add key if there are actual missing values
        issues["missing"] = missing_dict
    
    #  DUPLICATE ROWS
    duplicate_count = int(df.duplicated().sum())
    if duplicate_count > 0:
        issues["duplicates"] = duplicate_count
    
    
    
    return issues