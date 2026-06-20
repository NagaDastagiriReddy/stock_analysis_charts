from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timedelta

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
        
        # Fetch 5 years of historical data
        hist = stock.history(period="5y", auto_adjust=False)
        
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
        
        # New tabular metrics
        roe = info.get('returnOnEquity', 'N/A')
        roi = info.get('returnOnAssets', 'N/A')
        div_yield = info.get('dividendYield', 'N/A')
        book_value = info.get('bookValue', 'N/A')
        
        if roe != 'N/A': roe = round(roe * 100, 2)
        if roi != 'N/A': roi = round(roi * 100, 2)
        if div_yield != 'N/A': div_yield = round(div_yield * 100, 2)
        if book_value != 'N/A': book_value = round(book_value, 2)
        
        daily_change_pct = 0
        if current_price and prev_close and prev_close > 0:
            daily_change_pct = ((current_price - prev_close) / prev_close) * 100
            
        yearly_change_pct = 0
        if not hist.empty and current_price:
            one_year_ago = hist.index[-1] - timedelta(days=365)
            hist_1y = hist[hist.index >= one_year_ago]
            if not hist_1y.empty:
                price_1y_ago = float(hist_1y.iloc[0]['Close'])
                if price_1y_ago > 0:
                    yearly_change_pct = ((current_price - price_1y_ago) / price_1y_ago) * 100

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
            "roe": roe,
            "roi": roi,
            "dividendYield": div_yield,
            "bookValue": book_value,
            "faceValue": "N/A",
            "roce": "N/A",
            "currentPrice": round(current_price, 2) if current_price else round(data_points[-1], 2),
            "dailyChangePct": round(daily_change_pct, 2) if daily_change_pct else 0,
            "yearlyChangePct": round(yearly_change_pct, 2) if yearly_change_pct else 0
        }

        return jsonify(result)

    except Exception as e:
        print(f"Error fetching data for {symbol}: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Python Proxy Server on http://localhost:5000 ...")
    app.run(port=5000, debug=True, use_reloader=False)
