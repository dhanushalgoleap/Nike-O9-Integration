import os
import pandas as pd
import numpy as np

# Base path relative to the backend folder (one directory up to the workspace root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "New Synthetic Data")

class NikeDataLoader:
    """
    Loads all synthetic datasets from the New Synthetic Data directory
    into pandas DataFrames for the Unified 18-Agent network to consume.
    """
    def __init__(self):
        self.data_dir = DATA_DIR
        self.datasets = {}
        # Heuristics for missing financial data
        self.GROSS_MARGIN = 0.60  # 60% Gross Margin
        self.HOLDING_RATE_ANNUAL = 0.20  # 20% Annual Holding Rate
        
    def load_all(self):
        """Pre-loads all the CSV datasets into pandas DataFrames."""
        print(f"Loading datasets from {self.data_dir}...")
        
        # Mapping the raw CSV files logically
        files = {
            "accuracy_mape": "Fact_AccuracyAndMAPE_Nike_Synthetic.csv",
            "actual_lag_forecast": "Fact_ActualAndLagForecast_Nike_Synthetic.csv",
            "demand_forecast": "Fact_DemandInputForecast_12k_Nike_Synthetic.csv",
            "exclude_excess": "Fact_ExcludeExcessForecastInPast_Nike_Synthetic.csv",
            "procurement_focus": "Fact_ProcurementForecastWithDemandType_Nike_Synthetic.csv",
            "procurement_forecast": "Fact_ProcurementForecast_Nike_Synthetic.csv"
        }
        
        for key, filename in files.items():
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                try:
                    # CSV conversion might have encoding issues, usually utf-8 or latin1
                    self.datasets[key] = pd.read_csv(filepath)
                    print(f"Loaded {key} | shape: {self.datasets[key].shape}")
                except Exception as e:
                    print(f"Failed to load {filename}: {str(e)}")
            else:
                print(f"Warning: File {filename} not found at {filepath}.")
                
        return self.datasets

    def get_dataset(self, name):
        """Retrieve a specific pre-loaded dataset by its programmatic key."""
        if not self.datasets:
            self.load_all()
        return self.datasets.get(name, pd.DataFrame())

    def get_financial_summary(self):
        """
        Calculates high-level financial KPIs from the raw datasets.
        Returns: {revenue, holding_cost, mape, volume}
        """
        demand = self.get_dataset("demand_forecast")
        accuracy = self.get_dataset("accuracy_mape")
        
        # Calculate Revenue (D Base Forecast LC)
        total_revenue = 0
        total_quantity = 0
        if not demand.empty and "D Base Forecast LC" in demand.columns:
            total_revenue = demand["D Base Forecast LC"].sum() / 12 # Monthly average approx
            total_quantity = demand["D Base Forecast Quantity"].sum() / 12
            
        # Calculate MAPE
        avg_mape = 65.7 # Fallback
        if not accuracy.empty and "MAPE" in accuracy.columns:
            avg_mape = accuracy["MAPE"].mean()

        # Calculate Costs via Heuristics
        # Cost of Goods Sold (COGS) = Revenue * (1 - Margin)
        estimated_cogs = total_revenue * (1 - self.GROSS_MARGIN)
        # Annual Holding Cost = COGS * Holding Rate
        # Monthly Holding Cost = Annual / 12
        monthly_holding_cost = (estimated_cogs * self.HOLDING_RATE_ANNUAL) / 12

        return {
            "revenue": round(total_revenue, 2),
            "holding_cost": round(monthly_holding_cost, 2),
            "mape": round(avg_mape, 2),
            "volume": int(total_quantity) if total_quantity > 0 else 0
        }

    def get_top_impacted_skus(self, limit=5):
        """
        Identifies SKUs with the highest variance between Actual and Forecast.
        """
        df = self.get_dataset("actual_lag_forecast")
        if df.empty:
            return []
            
        # Calculate Variance
        # Using Item.[Item] as SKU ID
        if "Actual" in df.columns and "Forecast (Lag 1)" in df.columns:
            # Drop rows with NaN in these columns
            clean_df = df.dropna(subset=["Actual", "Forecast (Lag 1)"]).copy()
            clean_df["Variance"] = (clean_df["Actual"] - clean_df["Forecast (Lag 1)"]).abs()
            top_df = clean_df.sort_values(by="Variance", ascending=False).head(limit)
            
            results = []
            for _, row in top_df.iterrows():
                results.append({
                    "sku": row.get("Item.[Item]", "Unknown"),
                    "variance": int(row["Variance"]),
                    "actual": int(row["Actual"]),
                    "forecast": int(row["Forecast (Lag 1)"])
                })
            return results
        return []

# Quick testing execution
if __name__ == "__main__":
    loader = NikeDataLoader()
    summary = loader.get_financial_summary()
    print("Financial Summary:", summary)
    skus = loader.get_top_impacted_skus()
    print("Top Impacted SKUs:", skus)
