# Stock Chart UI Requirements

## Core Objective
Build a UI dashboard to display simple line charts of multiple Indian stocks, with each stock in its own distinct card.

## Scalability
- **Phase 1:** Build a sample dashboard for 5 Indian stocks.
- **Phase 2:** Scale up the architecture to efficiently support approximately 50 stocks.

## Data Input & Fetching Architecture
- The user will enter the list of stock names/symbol names via the UI text input or by uploading a stock list file (.txt or .csv).
- The application must asynchronously and dynamically fetch the details (prices, historical data) based solely on those symbols.
- **Strict Protocol:** All discussions and planning must first be updated in this skill file (`AGENTS.md`) and the implementation plan before any coding begins.

## Design Aesthetics (Strict Adherence Required)
- **Visuals:** Premium design featuring vibrant colors, a sleek dark mode, and glassmorphism elements. Avoid plain generic colors.
- **Typography:** Modern fonts (e.g., Inter, Roboto, Outfit) replacing browser defaults. Font sizes for data points (CMP, stock names) must be scaled down to maintain a dense, refined aesthetic suitable for large dashboards.
- **Interactivity:** Dynamic design with micro-animations, smooth gradients, hover effects, and responsive elements that feel alive. Must include the ability to dynamically sort cards by P/E ratio and % Change.
- **Structure:** Clean component-based architecture for the cards and charts.

## Architectural Decisions & Constraints (Updated 2026-06-19)
- **API Strategy:** Standard free APIs (FMP, Alpha Vantage) either lack historical data or impose severe limits (25 requests/day). We bypass this using a local **Python proxy server** with the `yfinance` library to scrape unlimited, free Yahoo Finance data.
- **Exchange Enforced:** All fetched symbols must explicitly use the `.NS` suffix to guarantee data is sourced exclusively from the National Stock Exchange of India (NSE).
- **Data Fidelity:** 
  - Yahoo Finance NSE data carries an accepted ~15-minute delay during live market hours.
  - Historical data must be fetched for a 5-year period with `auto_adjust=False` so that the charts reflect raw closing prices rather than dividend/split-adjusted prices. The UI must also calculate and display the 1-year % price change.
  - The Current Market Price (CMP) displayed on the UI must be pulled from the live `.info` spot price, rather than inferred from the final node of the historical chart array.
  - **Sorting Behavior:** Both the 1-Year % Change (`yearlyChangePct`) and P/E Ratio sort controls use single toggle buttons (`#sort-1y-btn` and `#sort-pe-btn`) that alternate between Descending (↓, High to Low) and Ascending (↑, Low to High) order on consecutive clicks.

  - **Chart Year Separators:** Sparkline line charts must render vertical year boundary lines and X-axis year labels (e.g., `'21`, `'22`, `'23`, `'24`, `'25`, `'26'`) to clearly delineate year transitions across the 5-year historical timeline.
  - **Chart Line Stroke:** Chart line width is set to a refined 1.0px stroke (`borderWidth: 1`) to enhance the visibility of micro price fluctuations across dense 5-year historical datasets.




