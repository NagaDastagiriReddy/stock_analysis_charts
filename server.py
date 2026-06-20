from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
from datetime import datetime

# Serve static files from the current directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/stock', methods=['GET'])
def get_stock_data():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400

    try:
        # Always enforce .NS for NSE
        query_symbol = symbol.strip().upper()
        if '.' in query_symbol:
            query_symbol = query_symbol.split('.')[0]
        query_symbol += '.NS'

        stock = yf.Ticker(query_symbol)
        
        # Fetch 1 year of historical data
        hist = stock.history(period="1y", auto_adjust=False)
        
        if hist.empty:
            return jsonify({"error": f"No data found for symbol: {query_symbol}"}), 404

        # Extract data points and labels
        data_points = []
        labels = []
        high52 = -float('inf')
        low52 = float('inf')

        for date, row in hist.iterrows():
            close_price = float(row['Close'])
            if close_price > 0:
                data_points.append(round(close_price, 2))
                labels.append(date.strftime('%b %d, %Y'))
                
                if close_price > high52: high52 = close_price
                if close_price < low52: low52 = close_price

        # Fallbacks for quote info which is sometimes missing
        info = stock.info
        name = info.get('shortName', info.get('longName', symbol.upper()))
        pe_ratio = info.get('trailingPE', 'N/A')
        if pe_ratio != 'N/A':
            pe_ratio = round(pe_ratio, 1)
            
        current_price = info.get('currentPrice', info.get('regularMarketPrice'))
        prev_close = info.get('previousClose', info.get('regularMarketPreviousClose'))
        
        daily_change_pct = 0
        if current_price and prev_close and prev_close > 0:
            daily_change_pct = ((current_price - prev_close) / prev_close) * 100

        # Deterministic color generator
        hash_val = 0
        for char in symbol:
            hash_val = ord(char) + ((hash_val << 5) - hash_val)
        colors = ["#00E676", "#2979FF", "#FF1744", "#FFEA00", "#D500F9", "#00E5FF", "#FF9100"]
        color = colors[abs(hash_val) % len(colors)]

        result = {
            "symbol": query_symbol,
            "name": name,
            "color": color,
            "data": data_points,
            "labels": labels,
            "high52": round(high52, 2) if high52 != -float('inf') else "N/A",
            "low52": round(low52, 2) if low52 != float('inf') else "N/A",
            "peRatio": pe_ratio,
            "currentPrice": round(current_price, 2) if current_price else round(data_points[-1], 2),
            "dailyChangePct": round(daily_change_pct, 2) if daily_change_pct else 0
        }

        return jsonify(result)

    except Exception as e:
        print(f"Error fetching data for {symbol}: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Python Proxy Server on http://localhost:5000 ...")
    app.run(port=5000, debug=True, use_reloader=False)
