// Real API Call to Local Python Backend (Unlimited Free Data)
async function fetchStockDetails(symbol) {
    try {
        let querySymbol = symbol.trim().toUpperCase();

        const url = `/api/stock?symbol=${querySymbol}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;

    } catch (e) {
        console.error("Fetch failed for " + symbol + ":", e.message);
        throw e;
    }
}

let activeCharts = [];
let currentStocksData = [];
let currentSortMode = 'default';

async function loadDashboard() {
    const inputStr = document.getElementById('stock-input').value;
    if (!inputStr.trim()) return;

    const symbols = inputStr.split(',').filter(s => s.trim().length > 0);
    const grid = document.getElementById('chart-grid');
    const loader = document.getElementById('loader');

    // UI State: Loading
    grid.innerHTML = '';
    activeCharts.forEach(chart => chart.destroy());
    activeCharts = [];
    loader.classList.remove('hidden');

    try {
        const fetchPromises = symbols.map(sym => fetchStockDetails(sym));
        const results = await Promise.allSettled(fetchPromises);
        
        const stocksData = results
            .filter(r => r.status === 'fulfilled' && !r.value.error)
            .map(r => r.value);

        // UI State: Render
        loader.classList.add('hidden');
        if (stocksData.length > 0) {
            currentStocksData = stocksData;
            applySorting();
        } else {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); width:100%;">No data found. Is the Python server running?</p>';
        }
    } catch (error) {
        loader.classList.add('hidden');
        console.error("Failed to fetch stock data", error);
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); width:100%;">Error loading data. Is the Python backend running?</p>';
    }
}

function applySorting() {
    const grid = document.getElementById('chart-grid');
    
    let sorted = [...currentStocksData];

    sorted.sort((a, b) => {
        if (currentSortMode === 'change_desc') {
            return (b.dailyChangePct || 0) - (a.dailyChangePct || 0);
        } else if (currentSortMode === 'change_asc') {
            return (a.dailyChangePct || 0) - (b.dailyChangePct || 0);
        } else if (currentSortMode === 'pe_asc') {
            const peA = a.peRatio === 'N/A' ? Infinity : parseFloat(a.peRatio);
            const peB = b.peRatio === 'N/A' ? Infinity : parseFloat(b.peRatio);
            return peA - peB;
        } else if (currentSortMode === 'pe_desc') {
            const peA = a.peRatio === 'N/A' ? -Infinity : parseFloat(a.peRatio);
            const peB = b.peRatio === 'N/A' ? -Infinity : parseFloat(b.peRatio);
            return peB - peA;
        }
        return 0; // default
    });

    grid.innerHTML = '';
    activeCharts.forEach(chart => chart.destroy());
    activeCharts = [];

    renderCards(sorted, grid);
}

function renderCards(stocksData, grid) {
    stocksData.forEach((stock, index) => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.style.setProperty('--accent-glow', `${stock.color}26`);

        const currentPrice = stock.currentPrice || stock.data[stock.data.length - 1];
        const changePct = stock.dailyChangePct || 0;
        const isPositive = changePct >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? '▲' : '▼';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${stock.name}</div>
                    <div class="card-symbol">${stock.symbol}</div>
                </div>
                <div style="text-align: right;">
                    <div class="card-price">₹${currentPrice}</div>
                    <div class="card-change ${changeClass}">${changeIcon} ${Math.abs(changePct)}%</div>
                </div>
            </div>
            <div class="card-metrics">
                <div class="metric-item">
                    <span class="metric-label">P/E Ratio</span>
                    <span class="metric-value">${stock.peRatio}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">52W High</span>
                    <span class="metric-value">₹${stock.high52}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">52W Low</span>
                    <span class="metric-value">₹${stock.low52}</span>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="chart-${index}"></canvas>
            </div>
        `;

        grid.appendChild(card);

        const ctx = document.getElementById(`chart-${index}`).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, `${stock.color}4D`);
        gradient.addColorStop(1, `${stock.color}00`);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: stock.labels,
                datasets: [{
                    label: stock.symbol,
                    data: stock.data,
                    borderColor: stock.color,
                    backgroundColor: gradient,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: stock.color,
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        backgroundColor: 'rgba(11, 15, 25, 0.9)',
                        titleColor: '#94a3b8', bodyColor: '#fff',
                        bodyFont: { weight: 'bold', size: 14 },
                        titleFont: { size: 12, weight: 'normal' },
                        borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1,
                        padding: 12, displayColors: false,
                        callbacks: {
                            title: function(context) { return context[0].label; },
                            label: function(context) { return `₹${context.parsed.y}`; }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        min: Math.min(...stock.data) * 0.98,
                        max: Math.max(...stock.data) * 1.02
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
        activeCharts.push(chart);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fetch-btn').addEventListener('click', loadDashboard);
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSortMode = this.dataset.sort;
            applySorting();
        });
    });
    
    document.getElementById('stock-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadDashboard();
    });

    document.getElementById('file-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const content = evt.target.result;
            // Parse by newlines, commas, or tabs, filter empty
            const symbols = content.split(/[\n,\t]+/).map(s => s.trim()).filter(s => s.length > 0);
            
            if (symbols.length > 0) {
                document.getElementById('stock-input').value = symbols.join(', ');
                loadDashboard();
            }
        };
        reader.readAsText(file);
        
        // Reset value so the same file can trigger change event again
        e.target.value = '';
    });

    setTimeout(loadDashboard, 1500); 
});
