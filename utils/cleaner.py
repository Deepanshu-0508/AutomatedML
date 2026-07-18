import pandas as pd

def clean_data(df, operations):
    """
    Cleans a pandas DataFrame based on a dictionary of column-specific operations.
    
    Args:
        df (pd.DataFrame): The original DataFrame.
        operations (dict): A dictionary mapping column names to their cleaning actions.
                           Example: {"Age": {"action": "fill_mean"}}
                           
    Returns:
        pd.DataFrame: A new, cleaned copy of the DataFrame.
    """
    # Work on a copy so the original DataFrame in the session remains unchanged
    cleaned_df = df.copy()
    
    for col, config in operations.items():
        # Skip if the column doesn't exist in the DataFrame
        if col not in cleaned_df.columns:
            continue
            
        action = config.get("action")
        
        if action == "drop_rows":
            cleaned_df.dropna(subset=[col], inplace=True)
            
        elif action == "fill_mean":
            cleaned_df[col].fillna(cleaned_df[col].mean(), inplace=True)
            
        elif action == "fill_median":
            cleaned_df[col].fillna(cleaned_df[col].median(), inplace=True)
            
        elif action == "fill_mode":
            # mode() returns a Series, so we take the first item at index 0
            if not cleaned_df[col].mode().empty:
                cleaned_df[col].fillna(cleaned_df[col].mode()[0], inplace=True)
                
        elif action == "interpolate":
            cleaned_df[col].interpolate(inplace=True)
            
        elif action == "drop_column":
            cleaned_df.drop(columns=[col], inplace=True)
            
    return cleaned_df